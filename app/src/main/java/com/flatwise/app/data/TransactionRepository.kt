package com.flatwise.app.data

import android.content.Context
import com.flatwise.app.parser.ParsedTransaction
import com.flatwise.app.parser.Confidence
import com.flatwise.app.parser.Merchant
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.Base64

class TransactionRepository(
    private val context: Context,
) {
    private val prefs = context.getSharedPreferences("flatwise_transactions", Context.MODE_PRIVATE)
    private val _candidates = MutableStateFlow(loadCandidates())
    val candidates: StateFlow<List<TransactionCandidate>> = _candidates

    init {
        clearLegacyDemoRecordsOnce()
    }

    fun add(parsed: ParsedTransaction): TransactionCandidate? {
        var added: TransactionCandidate? = null
        _candidates.update { current ->
            if (current.any { it.rawHash == parsed.rawHash }) {
                current
            } else {
                val candidate = parsed.toCandidate()
                added = candidate
                listOf(candidate) + current
            }
        }
        if (added != null) persist()
        return added
    }

    fun candidate(id: String): TransactionCandidate? {
        return _candidates.value.firstOrNull { it.id == id }
    }

    fun markPosted(id: String) {
        updateStatus(id, CandidateStatus.Posted)
    }

    fun ignore(id: String) {
        updateStatus(id, CandidateStatus.Ignored)
    }

    fun clearAll() {
        _candidates.value = emptyList()
        persist()
    }

    private fun clearLegacyDemoRecordsOnce() {
        if (prefs.getBoolean(DEMO_CLEANUP_KEY, false)) return

        val cleaned = _candidates.value.filterNot { it.isLegacyDemoRecord() }
        if (cleaned.size != _candidates.value.size) {
            _candidates.value = cleaned
            persist()
        }
        prefs.edit().putBoolean(DEMO_CLEANUP_KEY, true).apply()
    }

    private fun TransactionCandidate.isLegacyDemoRecord(): Boolean {
        return sourceLabel.equals("Sample alert", ignoreCase = true) ||
            sourceLabel.equals("Mockbank", ignoreCase = true)
    }

    private fun updateStatus(id: String, status: CandidateStatus) {
        _candidates.update { current ->
            current.map {
                if (it.id == id) it.copy(status = status) else it
            }
        }.also { persist() }
    }

    private fun ParsedTransaction.toCandidate(): TransactionCandidate {
        return TransactionCandidate(
            merchant = merchant,
            amount = amount,
            occurredAt = occurredAt,
            sourceLabel = sourceLabel,
            confidence = confidence,
            rawHash = rawHash,
        )
    }

    private fun persist() {
        prefs.edit()
            .putStringSet(STORAGE_KEY, _candidates.value.map { it.serialize() }.toSet())
            .apply()
    }

    private fun loadCandidates(): List<TransactionCandidate> {
        return prefs.getStringSet(STORAGE_KEY, emptySet())
            .orEmpty()
            .mapNotNull { it.deserializeCandidate() }
            .sortedByDescending { it.occurredAt ?: LocalDateTime.MIN }
    }

    private fun TransactionCandidate.serialize(): String {
        val fields = listOf(
            id,
            merchant.name,
            amount.toPlainString(),
            occurredAt?.toString().orEmpty(),
            sourceLabel.encode(),
            confidence.name,
            rawHash,
            status.name,
        )
        return fields.joinToString("|")
    }

    private fun String.deserializeCandidate(): TransactionCandidate? {
        val parts = split("|")
        if (parts.size != 8) return null
        return runCatching {
            TransactionCandidate(
                id = parts[0],
                merchant = Merchant.valueOf(parts[1]),
                amount = BigDecimal(parts[2]),
                occurredAt = parts[3].takeIf { it.isNotBlank() }?.let(LocalDateTime::parse),
                sourceLabel = parts[4].decode(),
                confidence = Confidence.valueOf(parts[5]),
                rawHash = parts[6],
                status = CandidateStatus.valueOf(parts[7]),
            )
        }.getOrNull()
    }

    private fun String.encode(): String = Base64.getUrlEncoder().withoutPadding().encodeToString(toByteArray())

    private fun String.decode(): String = String(Base64.getUrlDecoder().decode(this))

    private companion object {
        const val STORAGE_KEY = "candidates"
        const val DEMO_CLEANUP_KEY = "legacy_demo_records_cleaned"
    }
}
