package com.flatwise.crumb.notifications

import java.security.MessageDigest
import java.util.Locale

/** Android-only safety checks that run before the receipt parser. */
object CrumbAndroidNotificationIngestion {
  const val GOOGLE_MESSAGES_PACKAGE_NAME = "com.google.android.apps.messaging"

  private val whitespace = Regex("""\s+""")
  private val twilioTransportPrefix = Regex(
    """^\s*sent from your twilio trial account\s*-\s*""",
    RegexOption.IGNORE_CASE
  )
  private val securityTerms = Regex(
    """\b(?:otp|one[-\s]?time password|verification code|login code|security code|do not share|never share)\b""",
    RegexOption.IGNORE_CASE
  )
  private val transactionContext = Regex(
    """\b(?:spent|debited|paid|txn|transaction|card|a/c|account|upi|ref|utr)\b""",
    RegexOption.IGNORE_CASE
  )
  private val amount = Regex(
    """(?i)(?:(?:rs\.?|inr)\s*\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s*rupees?)"""
  )
  private val merchant = Regex("""(?i)\b(?:swiggy|zomato|blinkit|instamart|zepto)\b""")

  fun isEligibleReceiptText(text: String): Boolean {
    val normalized = normalize(text)
    if (normalized.isBlank() || securityTerms.containsMatchIn(normalized)) return false

    // Requiring all three signals prevents chat such as "20 rupees sent to Swiggy"
    // from being treated as a bank receipt.
    return amount.containsMatchIn(normalized) &&
      merchant.containsMatchIn(normalized) &&
      transactionContext.containsMatchIn(normalized)
  }

  /**
   * Returns isolated notification messages in display order. Text lines are kept
   * separate because a conversation notification may contain unrelated SMSes.
   */
  fun candidateTexts(
    textLines: List<CharSequence?>,
    bigText: CharSequence?,
    text: CharSequence?
  ): List<String> {
    val candidates = linkedMapOf<String, String>()

    fun add(candidate: CharSequence?) {
      val value = candidate?.toString()?.trim().orEmpty()
      val normalized = normalize(value)
      if (value.isNotBlank() && !candidates.containsKey(normalized)) {
        candidates[normalized] = value
      }
    }

    textLines.forEach(::add)
    add(bigText)
    add(text)
    return candidates.values.toList()
  }

  fun stripTransportPrefix(text: String): String = text.replace(twilioTransportPrefix, "").trim()

  fun isGoogleMessagesPackage(packageName: String): Boolean =
    packageName == GOOGLE_MESSAGES_PACKAGE_NAME

  fun normalizedTextHash(text: String): String {
    val bytes = MessageDigest.getInstance("SHA-256")
      .digest(normalize(text).toByteArray(Charsets.UTF_8))
    return bytes.joinToString("") { "%02x".format(it.toInt() and 0xff) }
  }

  fun normalize(text: String): String = text.replace(whitespace, " ").trim().lowercase(Locale.US)
}

/** Process-local repost protection. Persistent draft hashing is intentionally separate. */
class CrumbNotificationEventDedupe(
  private val ttlMs: Long = 60_000L,
  private val nowMs: () -> Long = { System.currentTimeMillis() }
) {
  private val seenAt = mutableMapOf<String, Long>()

  @Synchronized
  fun shouldProcess(packageName: String, text: String): Boolean {
    val now = nowMs()
    seenAt.entries.removeAll { now - it.value >= ttlMs }
    val key = "$packageName:${CrumbAndroidNotificationIngestion.normalizedTextHash(text)}"
    if (seenAt.containsKey(key)) return false
    seenAt[key] = now
    return true
  }
}
