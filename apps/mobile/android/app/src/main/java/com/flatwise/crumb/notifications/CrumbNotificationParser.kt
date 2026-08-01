package com.flatwise.crumb.notifications

import java.math.BigDecimal
import java.security.MessageDigest
import java.util.Locale

data class ParsedNotificationTransaction(
  val merchant: String,
  val amount: String,
  val occurredAt: String?,
  val sourceLabel: String,
  val confidence: String,
  val rawHash: String
)

/**
 * Native counterpart of packages/core's parseTransactionAlert: the listener runs with no
 * JS loaded, so the decisions live in CrumbReceiptRules and are mirrored on both sides.
 */
object CrumbNotificationParser {
  private val isoBankDate = Regex("""(?i)(\d{4})-(\d{2})-(\d{2})[:T\s](\d{1,2}):(\d{1,2}):(\d{1,2})""")
  private val numericDate = Regex("""(?i)on\s+(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})""")
  private val slashDate = Regex("""(?i)on\s+(\d{1,2})/(\d{1,2})/(\d{2})""")
  private val namedDate = Regex("""(?i)on\s+(\d{1,2})-([a-z]{3})-(\d{2})""")
  private val dashDate = Regex("""(?i)on\s+(\d{1,2})-(\d{1,2})-(\d{2})\b""")
  private val whitespace = Regex("""\s+""")

  fun parse(rawText: String, sourceLabel: String): ParsedNotificationTransaction? {
    val body = CrumbReceiptRules.stripSecurityFooter(CrumbReceiptRules.normalize(rawText))
    if (CrumbReceiptRules.isOtp(body)) return null

    val merchant = CrumbReceiptRules.detectMerchant("$body\n$sourceLabel") ?: return null
    if (!CrumbReceiptRules.isDebit(body)) return null
    if (CrumbReceiptRules.isTransferToOtherPayee(body, merchant)) return null

    val amount = parseAmount(body) ?: return null

    return ParsedNotificationTransaction(
      merchant = merchant,
      amount = amount,
      occurredAt = parseOccurredAt(body),
      sourceLabel = sourceLabel.ifBlank { "Android notification" },
      confidence = "High",
      // Persistent protection is based on this one notification's normalized text.
      // Listener-level TTL dedupe handles repost events; this prevents the same
      // receipt from being saved again after a process restart.
      rawHash = sha256("${sourceLabel.lowercase(Locale.US)}|${rawText.replace(whitespace, " ").trim().lowercase(Locale.US)}")
    )
  }

  private fun parseAmount(text: String): String? {
    val raw = CrumbReceiptRules.extractAmount(text) ?: return null
    return try {
      BigDecimal(raw).stripTrailingZeros().toPlainString()
    } catch (_: NumberFormatException) {
      null
    }
  }

  private fun parseOccurredAt(text: String): String? {
    isoBankDate.find(text)?.let {
      val g = it.groupValues
      return "${g[1]}-${g[2]}-${g[3]}T${pad(g[4])}:${pad(g[5])}:${pad(g[6])}+05:30"
    }
    numericDate.find(text)?.let {
      val g = it.groupValues
      return "${g[3]}-${pad(g[2])}-${pad(g[1])}T${pad(g[4])}:${pad(g[5])}:${pad(g[6])}+05:30"
    }
    slashDate.find(text)?.let {
      val g = it.groupValues
      return "20${g[3]}-${pad(g[2])}-${pad(g[1])}T00:00:00+05:30"
    }
    namedDate.find(text)?.let {
      val g = it.groupValues
      val month = mapOf(
        "jan" to "01", "feb" to "02", "mar" to "03", "apr" to "04",
        "may" to "05", "jun" to "06", "jul" to "07", "aug" to "08",
        "sep" to "09", "oct" to "10", "nov" to "11", "dec" to "12"
      )[g[2].lowercase(Locale.US)] ?: return null
      return "20${g[3]}-$month-${pad(g[1])}T00:00:00+05:30"
    }
    // Kotak UPI: "on 29-07-26" (DD-MM-YY, no time)
    dashDate.find(text)?.let {
      val g = it.groupValues
      return "20${g[3]}-${pad(g[2])}-${pad(g[1])}T00:00:00+05:30"
    }
    return null
  }

  private fun pad(value: String) = value.padStart(2, '0')

  private fun sha256(text: String): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8))
    return digest.joinToString("") { "%02x".format(it) }
  }
}
