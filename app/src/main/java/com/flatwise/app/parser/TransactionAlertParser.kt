package com.flatwise.app.parser

import java.math.BigDecimal
import java.security.MessageDigest
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale

object TransactionAlertParser {
    private val amountPatterns = listOf(
        Regex("""(?i)\b(?:rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)"""),
        Regex("""(?i)\b([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr)\b"""),
    )

    private val exactDateTimePatterns = listOf(
        Regex("""\b(20\d{2})-(\d{2})-(\d{2})[:\s](\d{1,2}):(\d{1,2}):(\d{1,2})\b"""),
        Regex("""\bon\s+(\d{2})-(\w{3})-(\d{2})\b""", RegexOption.IGNORE_CASE),
        Regex("""\bon\s+(\d{2})/(\d{2})/(\d{2})\b""", RegexOption.IGNORE_CASE),
    )

    fun parse(rawText: String, sourceLabel: String = "Notification"): ParsedTransaction? {
        val cleanText = rawText.replace(Regex("""\s+"""), " ").trim()
        val merchant = Merchant.fromText(cleanText) ?: return null
        val amount = extractAmount(cleanText) ?: return null
        val occurredAt = extractDateTime(cleanText)

        val confidence = when {
            occurredAt != null -> Confidence.High
            cleanText.contains("spent", ignoreCase = true) ||
                cleanText.contains("debited", ignoreCase = true) ||
                cleanText.contains("sent", ignoreCase = true) -> Confidence.Medium
            else -> Confidence.Low
        }

        return ParsedTransaction(
            amount = amount,
            merchant = merchant,
            occurredAt = occurredAt,
            sourceLabel = sourceLabel,
            confidence = confidence,
            rawHash = sha256(cleanText),
        )
    }

    private fun extractAmount(text: String): BigDecimal? {
        return amountPatterns.firstNotNullOfOrNull { pattern ->
            pattern.find(text)?.groupValues?.getOrNull(1)
        }?.replace(",", "")?.let(::BigDecimal)
    }

    private fun extractDateTime(text: String): LocalDateTime? {
        exactDateTimePatterns.forEachIndexed { index, pattern ->
            val match = pattern.find(text) ?: return@forEachIndexed
            return when (index) {
                0 -> LocalDateTime.of(
                    match.groupValues[1].toInt(),
                    match.groupValues[2].toInt(),
                    match.groupValues[3].toInt(),
                    match.groupValues[4].toInt(),
                    match.groupValues[5].toInt(),
                    match.groupValues[6].toInt(),
                )
                1 -> LocalDate.parse(
                    match.value.substringAfter("on ", match.value.substringAfter("On ")),
                    DateTimeFormatter.ofPattern("dd-MMM-yy", Locale.ENGLISH),
                ).atStartOfDay()
                2 -> LocalDate.parse(
                    match.value.substringAfter("on ", match.value.substringAfter("On ")),
                    DateTimeFormatter.ofPattern("dd/MM/yy", Locale.ENGLISH),
                ).atStartOfDay()
                else -> null
            }
        }

        val pluxeePattern = Regex("""\bon\s+(\d{2})-(\d{2})-(20\d{2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})\b""", RegexOption.IGNORE_CASE)
        val pluxeeMatch = pluxeePattern.find(text) ?: return null
        return LocalDateTime.of(
            pluxeeMatch.groupValues[3].toInt(),
            pluxeeMatch.groupValues[2].toInt(),
            pluxeeMatch.groupValues[1].toInt(),
            pluxeeMatch.groupValues[4].toInt(),
            pluxeeMatch.groupValues[5].toInt(),
            pluxeeMatch.groupValues[6].toInt(),
        )
    }

    private fun sha256(text: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(text.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }
}
