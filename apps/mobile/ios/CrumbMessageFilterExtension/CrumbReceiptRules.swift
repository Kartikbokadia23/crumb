import Foundation

/// Receipt vocabulary and the decisions built on it. Mirrors shared/parser-rules.json,
/// which packages/core and the Android listener also mirror — the SMS filter extension
/// runs with no JS loaded, so the duplication is deliberate and rules.parity.test.ts
/// fails if this copy drifts.
enum CrumbReceiptRules {
  static let merchants: [(name: String, aliases: [String])] = [
    ("Blinkit", ["blinkit", "blnkit", "blink commerce", "grofers"]),
    ("Instamart", ["instamart", "swiggy instamart", "swiggy inst"]),
    ("Swiggy", ["swiggy food", "swiggy", "bundl technologies", "bundl"]),
    ("Zomato", ["zomato", "eternal"]),
    ("Zepto", ["zepto", "zeptonow", "kiranakart"]),
    ("Amazon", ["amazon now", "amazonnow", "amazon fresh", "amazonfresh", "amazonpaygrocery", "amazonselle"])
  ]

  static let debitTerms = [
    "spent", "debited", "debit", "paid", "payment", "sent", "withdrawn",
    "withdrawal", "charged", "deducted", "purchase", "purchased", "swiped"
  ]
  static let strongDebitTerms = [
    "spent", "debited", "paid", "withdrawn", "withdrawal",
    "charged", "deducted", "purchase", "purchased", "swiped"
  ]
  static let creditTerms = ["credited", "received", "added"]
  static let nonExpenseTerms = [
    "refund", "refunded", "reversal", "reversed", "cashback",
    "declined", "failed", "unsuccessful"
  ]
  static let otpTerms = [
    "otp", "one time password", "one-time password", "verification code",
    "login code", "security code", "authentication code"
  ]
  static let footerTerms = ["not you", "sms block", "to block", "to report", "call 1800"]
  static let balanceTerms = [
    "avl lmt", "avl limit", "avl bal", "available balance",
    "available limit", "balance", "bal", "limit"
  ]

  /// Prefixed ("Rs.412", "INR 412", "₹412") or suffixed ("412 INR", "412 rupees").
  static let amountPattern =
    #"(?:(?:\bRs\.?|\bINR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)|\b([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:Rs\.?|INR|rupees?)\b)"#

  /// Payee of a transfer-style alert ("Sent Rs.50 from A/C X to <payee> on ...").
  private static let transferPayeePattern =
    #"\b(?:sent|paid|debited|transferred)\b[\s\S]{0,80}?\bto\s+(\S[^\n]*?)(?=\s+on\b|\s+ref\b|\s+upi\b|[,;]|\.\s|$)"#

  private static let balanceLookbehind = 24

  private static let debit = regex(terms: debitTerms)
  private static let strongDebit = regex(terms: strongDebitTerms)
  private static let credit = regex(terms: creditTerms)
  private static let nonExpense = regex(terms: nonExpenseTerms)
  private static let otp = regex(terms: otpTerms)
  private static let footer = regex(terms: footerTerms)
  private static let balance = regex(terms: balanceTerms)
  private static let amount = try! NSRegularExpression(pattern: amountPattern, options: [.caseInsensitive])
  private static let transferPayee =
    try! NSRegularExpression(pattern: transferPayeePattern, options: [.caseInsensitive])

  static func normalize(_ text: String) -> String {
    text.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }

  /// Drops the bank's fraud-report footer, whose wording collides with real payee text.
  static func stripSecurityFooter(_ text: String) -> String {
    guard let match = firstMatch(footer, in: text),
          let range = Range(match.range, in: text) else { return text }
    return String(text[text.startIndex..<range.lowerBound])
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }

  static func isOtp(_ text: String) -> Bool { firstMatch(otp, in: text) != nil }

  static func hasStrongDebit(_ text: String) -> Bool { firstMatch(strongDebit, in: text) != nil }

  /// True when the message says money left the account. Promos, order updates, refunds
  /// and declined payments all carry a merchant and an amount, so this is what separates
  /// a receipt from the rest.
  static func isDebit(_ text: String) -> Bool {
    if firstMatch(nonExpense, in: text) != nil { return false }
    if firstMatch(debit, in: text) == nil { return false }
    if firstMatch(credit, in: text) != nil && !hasStrongDebit(text) { return false }
    return true
  }

  static func detectMerchant(_ text: String) -> String? {
    let lower = text.lowercased()
    // Card descriptors arrive with acquirer prefixes ("PYU*Instamart Grocery"), so this
    // is a substring match; longest alias first so "swiggy inst" beats "swiggy".
    for merchant in merchants
    where merchant.aliases.sorted(by: { $0.count > $1.count }).contains(where: { lower.contains($0) }) {
      return merchant.name
    }
    return nil
  }

  /// True when the alert is a transfer to somebody who is not the detected merchant.
  static func isTransferToOtherPayee(_ text: String, merchant: String) -> Bool {
    guard let match = firstMatch(transferPayee, in: text),
          match.numberOfRanges > 1,
          let range = Range(match.range(at: 1), in: text) else { return false }
    return detectMerchant(String(text[range])) != merchant
  }

  /// First amount that is not labelled as a balance or a limit.
  static func extractAmount(_ text: String) -> String? {
    let ns = text as NSString
    var fallback: String?
    var previousEnd = 0

    for match in amount.matches(in: text, range: NSRange(location: 0, length: ns.length)) {
      let from = max(previousEnd, match.range.location - balanceLookbehind)
      let preceding = ns.substring(with: NSRange(location: from, length: match.range.location - from))
      previousEnd = match.range.location + match.range.length

      var raw = ""
      for index in 1...2 where match.range(at: index).location != NSNotFound {
        raw = ns.substring(with: match.range(at: index))
        break
      }
      if raw.isEmpty { continue }
      let cleaned = raw.replacingOccurrences(of: ",", with: "")
      if fallback == nil { fallback = cleaned }
      if firstMatch(balance, in: preceding) == nil { return cleaned }
    }
    return fallback
  }

  private static func firstMatch(_ regex: NSRegularExpression, in text: String) -> NSTextCheckingResult? {
    regex.firstMatch(in: text, range: NSRange(location: 0, length: (text as NSString).length))
  }

  private static func regex(terms: [String]) -> NSRegularExpression {
    let alternation = terms
      .map { $0.replacingOccurrences(of: " ", with: #"\s+"#) }
      .joined(separator: "|")
    return try! NSRegularExpression(pattern: #"\b(?:"# + alternation + #")\b"#, options: [.caseInsensitive])
  }
}
