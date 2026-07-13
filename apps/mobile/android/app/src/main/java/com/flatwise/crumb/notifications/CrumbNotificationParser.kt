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

object CrumbNotificationParser {
  private val amountRegex = Regex("""(?i)(?:rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)""")
  private val isoBankDate = Regex("""(?i)on\s+(\d{4})-(\d{2})-(\d{2})[:\s](\d{1,2}):(\d{1,2}):(\d{1,2})""")
  private val numericDate = Regex("""(?i)on\s+(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})""")
  private val slashDate = Regex("""(?i)on\s+(\d{1,2})/(\d{1,2})/(\d{2})""")
  private val namedDate = Regex("""(?i)on\s+(\d{1,2})-([a-z]{3})-(\d{2})""")
  private val whitespace = Regex("""\s+""")
  private val sentAmount = Regex("""\bsent\s+(?:rs\.?|inr)\s*[0-9,]+(?:\.[0-9]{1,2})?\b""", RegexOption.IGNORE_CASE)
  private val fromAccount = Regex("""\bfrom\s+[^.]+(?:bank|a/c|account|acct|\*\d{2,})\b""", RegexOption.IGNORE_CASE)
  private val toParty = Regex("""\bto\s+[a-z0-9][a-z0-9 .'-]{1,60}\b""", RegexOption.IGNORE_CASE)
  private val transferReference = Regex("""\b(?:ref|utr|upi\s+ref|transaction\s+id)\b""", RegexOption.IGNORE_CASE)
  private val safetyFooter = Regex("""\bnot\s+you\??\b|\bsms\s+block\s+upi\b|\bblock\s+upi\b""", RegexOption.IGNORE_CASE)
  private val securityAlert = Regex(
    """\b(?:otp|one[-\s]?time password|verification code|login code|security code|do not share|never share)\b""",
    RegexOption.IGNORE_CASE
  )

  fun parse(rawText: String, sourceLabel: String): ParsedNotificationTransaction? {
    val merchant = detectMerchant(rawText) ?: return null
    if (isNonReceiptTransfer(rawText, merchant)) return null

    val amount = parseAmount(rawText) ?: return null

    val occurredAt = parseOccurredAt(rawText)

    return ParsedNotificationTransaction(
      merchant = merchant,
      amount = amount,
      occurredAt = occurredAt,
      sourceLabel = sourceLabel.ifBlank { "Android notification" },
      confidence = "High",
      // Hash the normalized transaction identity, not the raw notification text:
      // Android reposts the same SMS notification multiple times with slightly
      // different concatenated text (growing EXTRA_TEXT_LINES, group summaries),
      // which would otherwise produce a different hash per repost and defeat dedup.
      rawHash = sha256("$merchant|$amount|${occurredAt ?: ""}")
    )
  }

  private fun detectMerchant(text: String): String? {
    val lower = text.lowercase(Locale.US)
    return when {
      lower.contains("blinkit") -> "Blinkit"
      lower.contains("instamart") || lower.contains("swiggy inst") -> "Instamart"
      lower.contains("swiggy") -> "Swiggy"
      lower.contains("zomato") -> "Zomato"
      lower.contains("zepto") -> "Zepto"
      else -> null
    }
  }

  private fun isNonReceiptTransfer(text: String, merchant: String): Boolean {
    val normalized = text.replace(whitespace, " ").trim()
    if (securityAlert.containsMatchIn(normalized)) return true
    if (!sentAmount.containsMatchIn(normalized)) return false
    if (hasDirectMerchantPayee(normalized, merchant)) return false

    val transferShape =
      fromAccount.containsMatchIn(normalized) &&
        toParty.containsMatchIn(normalized) &&
        transferReference.containsMatchIn(normalized)

    return transferShape || safetyFooter.containsMatchIn(normalized)
  }

  private fun hasDirectMerchantPayee(text: String, merchant: String): Boolean {
    val aliases = when (merchant) {
      "Blinkit" -> listOf("blinkit")
      "Instamart" -> listOf("instamart", "swiggy instamart", "swiggy inst")
      "Swiggy" -> listOf("swiggy")
      "Zomato" -> listOf("zomato")
      "Zepto" -> listOf("zepto")
      else -> emptyList()
    }

    return aliases.any { alias ->
      Regex("""\b(?:to|at|paid\s+to)\s+${Regex.escape(alias)}\b""", RegexOption.IGNORE_CASE)
        .containsMatchIn(text)
    }
  }

  private fun parseAmount(text: String): String? {
    val match = amountRegex.find(text) ?: return null
    return try {
      BigDecimal(match.groupValues[1].replace(",", "")).stripTrailingZeros().toPlainString()
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
    return null
  }

  private fun pad(value: String) = value.padStart(2, '0')

  private fun sha256(text: String): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8))
    return digest.joinToString("") { "%02x".format(it) }
  }
}
