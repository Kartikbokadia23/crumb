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
  // Messages carries chat as well as bank SMS, so an eligible receipt must also read like
  // it came from an account. This is the one rule the parser does not share.
  private val accountContext = Regex(
    """\b(?:txn|transaction|card|a/c|ac|acct|account|upi|ref|utr|wallet)\b""",
    RegexOption.IGNORE_CASE
  )

  fun isEligibleReceiptText(text: String): Boolean {
    val body = CrumbReceiptRules.stripSecurityFooter(normalize(text))
    if (body.isBlank() || CrumbReceiptRules.isOtp(body)) return false

    // Chat such as "20 rupees sent to Swiggy" has a merchant, an amount and a loose
    // debit word, so it also has to name an account or say plainly that money left one.
    return CrumbReceiptRules.extractAmount(body) != null &&
      CrumbReceiptRules.detectMerchant(body) != null &&
      CrumbReceiptRules.isDebit(body) &&
      (CrumbReceiptRules.hasStrongDebit(body) || accountContext.containsMatchIn(body))
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
