package com.flatwise.crumb.notifications

import java.util.Locale

/**
 * Receipt vocabulary and the decisions built on it, shared by the notification gate and
 * the parser. Mirrors shared/parser-rules.json, which packages/core also mirrors — the
 * listener needs these rules with no JS runtime loaded, so the duplication is deliberate
 * and CrumbReceiptRulesParityTest fails if either copy drifts.
 */
object CrumbReceiptRules {
  val merchantAliases: List<Pair<String, List<String>>> = listOf(
    "Blinkit" to listOf("blinkit", "blnkit", "blink commerce", "grofers"),
    "Instamart" to listOf("instamart", "swiggy instamart", "swiggy inst"),
    "Swiggy" to listOf("swiggy food", "swiggy", "bundl technologies", "bundl"),
    "Zomato" to listOf("zomato", "eternal"),
    "Zepto" to listOf("zepto", "zeptonow", "kiranakart"),
    "Amazon" to listOf(
      "amazon now", "amazonnow", "amazon fresh", "amazonfresh",
      "amazonpaygrocery", "amazonselle"
    )
  )

  val debitTerms = listOf(
    "spent", "debited", "debit", "paid", "payment", "sent", "withdrawn",
    "withdrawal", "charged", "deducted", "purchase", "purchased", "swiped"
  )
  val strongDebitTerms = listOf(
    "spent", "debited", "paid", "withdrawn", "withdrawal",
    "charged", "deducted", "purchase", "purchased", "swiped"
  )
  val creditTerms = listOf("credited", "received", "added")
  val nonExpenseTerms = listOf(
    "refund", "refunded", "reversal", "reversed", "cashback",
    "declined", "failed", "unsuccessful"
  )
  val otpTerms = listOf(
    "otp", "one time password", "one-time password", "verification code",
    "login code", "security code", "authentication code"
  )
  val footerTerms = listOf("not you", "sms block", "to block", "to report", "call 1800")
  val balanceTerms = listOf(
    "avl lmt", "avl limit", "avl bal", "available balance",
    "available limit", "balance", "bal", "limit"
  )

  private val whitespace = Regex("""\s+""")
  private val debit = termsRegex(debitTerms)
  private val strongDebit = termsRegex(strongDebitTerms)
  private val credit = termsRegex(creditTerms)
  private val nonExpense = termsRegex(nonExpenseTerms)
  private val otp = termsRegex(otpTerms)
  private val footer = termsRegex(footerTerms)
  private val balance = termsRegex(balanceTerms)

  /** Prefixed ("Rs.412", "INR 412", "₹412") or suffixed ("412 INR", "412 rupees"). */
  val amount = Regex(
    """(?:(?:\bRs\.?|\bINR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)|\b([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:Rs\.?|INR|rupees?)\b)""",
    RegexOption.IGNORE_CASE
  )

  /** Payee of a transfer-style alert ("Sent Rs.50 from A/C X to <payee> on ..."). */
  private val transferPayee = Regex(
    """\b(?:sent|paid|debited|transferred)\b[\s\S]{0,80}?\bto\s+(\S[^\n]*?)(?=\s+on\b|\s+ref\b|\s+upi\b|[,;]|\.\s|$)""",
    RegexOption.IGNORE_CASE
  )

  private const val BALANCE_LOOKBEHIND = 24

  fun normalize(text: String): String = text.replace(whitespace, " ").trim()

  /** Drops the bank's fraud-report footer, whose wording collides with real payee text. */
  fun stripSecurityFooter(text: String): String {
    val match = footer.find(text) ?: return text
    return text.substring(0, match.range.first).trim()
  }

  fun isOtp(text: String): Boolean = otp.containsMatchIn(text)

  /** Debit wording that cannot also describe money arriving ("spent", not "sent"). */
  fun hasStrongDebit(text: String): Boolean = strongDebit.containsMatchIn(text)

  /**
   * True when the message says money left the account. Promos, order updates, refunds
   * and declined payments all carry a merchant and an amount, so this is what separates
   * a receipt from the rest.
   */
  fun isDebit(text: String): Boolean {
    if (nonExpense.containsMatchIn(text)) return false
    if (!debit.containsMatchIn(text)) return false
    if (credit.containsMatchIn(text) && !strongDebit.containsMatchIn(text)) return false
    return true
  }

  fun detectMerchant(text: String): String? {
    val lower = text.lowercase(Locale.US)
    // Card descriptors arrive with acquirer prefixes ("PYU*Instamart Grocery"), so this
    // is a substring match; longest alias first so "swiggy inst" beats "swiggy".
    for ((merchant, aliases) in merchantAliases) {
      if (aliases.sortedByDescending { it.length }.any { lower.contains(it) }) return merchant
    }
    return null
  }

  /** True when the alert is a transfer to somebody who is not the detected merchant. */
  fun isTransferToOtherPayee(text: String, merchant: String): Boolean {
    val payee = transferPayee.find(text)?.groupValues?.get(1) ?: return false
    return detectMerchant(payee) != merchant
  }

  /** First amount that is not labelled as a balance or a limit. */
  fun extractAmount(text: String): String? {
    var fallback: String? = null
    var previousEnd = 0

    for (match in amount.findAll(text)) {
      val from = maxOf(previousEnd, match.range.first - BALANCE_LOOKBEHIND)
      val preceding = text.substring(from, match.range.first)
      previousEnd = match.range.last + 1

      val raw = match.groupValues[1].ifEmpty { match.groupValues[2] }.replace(",", "")
      if (raw.isEmpty()) continue
      if (fallback == null) fallback = raw
      if (!balance.containsMatchIn(preceding)) return raw
    }
    return fallback
  }

  private fun termsRegex(terms: List<String>): Regex = Regex(
    terms.joinToString("|", prefix = """\b(?:""", postfix = """)\b""") {
      Regex.escape(it).replace(" ", """\E\s+\Q""")
    },
    RegexOption.IGNORE_CASE
  )
}
