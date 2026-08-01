import CryptoKit
import Foundation
import IdentityLookup

private let crumbKeychainAccessGroup = "W62HH85PLL.com.flatwise.crumb.shared"
private let crumbDraftsKey = "crumb_message_filter_drafts"
private let crumbDiagnosticsKey = "crumb_message_filter_diagnostics"

@objc(MessageFilterExtension)
final class MessageFilterExtension: ILMessageFilterExtension {}

extension MessageFilterExtension: ILMessageFilterQueryHandling, ILMessageFilterCapabilitiesQueryHandling {
  func handle(
    _ capabilitiesQueryRequest: ILMessageFilterCapabilitiesQueryRequest,
    context: ILMessageFilterExtensionContext,
    completion: @escaping (ILMessageFilterCapabilitiesQueryResponse) -> Void
  ) {
    completion(ILMessageFilterCapabilitiesQueryResponse())
  }

  func handle(
    _ queryRequest: ILMessageFilterQueryRequest,
    context: ILMessageFilterExtensionContext,
    completion: @escaping (ILMessageFilterQueryResponse) -> Void
  ) {
    let body = queryRequest.messageBody ?? ""
    let response = ILMessageFilterQueryResponse()
    NSLog("[CrumbMessageFilter] extension invoked sender=%@ bodyLength=%d", queryRequest.sender ?? "nil", body.count)
    CrumbMessageFilterStore.recordDiagnostic(sender: queryRequest.sender, body: body, parsed: false, saved: false, reason: "extension_invoked")

    if let draft = CrumbSMSParser.parse(body: body, sender: queryRequest.sender) {
      NSLog("[CrumbMessageFilter] matched sender=%@ merchant=%@ amount=%@", queryRequest.sender ?? "nil", draft["merchant"] as? String ?? "nil", draft["amount"] as? String ?? "nil")
      let saved = CrumbMessageFilterStore.save(draft)
      CrumbMessageFilterStore.recordDiagnostic(sender: queryRequest.sender, body: body, parsed: true, saved: saved, reason: saved ? "saved" : "save_failed")
      response.action = .junk
    } else {
      NSLog("[CrumbMessageFilter] ignored sender=%@ bodyLength=%d", queryRequest.sender ?? "nil", body.count)
      CrumbMessageFilterStore.recordDiagnostic(sender: queryRequest.sender, body: body, parsed: false, saved: false, reason: "parse_failed")
      response.action = .none
    }

    completion(response)
  }
}

private enum CrumbMessageFilterStore {
  static func save(_ draft: [String: Any]) -> Bool {
    var drafts = CrumbKeychainStore.readArray(key: crumbDraftsKey)
    let beforeCount = drafts.count
    let rawHash = draft["rawHash"] as? String
    if let rawHash, drafts.contains(where: { $0["rawHash"] as? String == rawHash }) {
      NSLog("[CrumbMessageFilter] duplicate skipped rawHash=%@ count=%d", rawHash, drafts.count)
      return true
    }
    drafts.insert(draft, at: 0)
    guard JSONSerialization.isValidJSONObject(drafts),
          let data = try? JSONSerialization.data(withJSONObject: drafts) else {
      NSLog("[CrumbMessageFilter] save failed: invalid json beforeCount=%d", beforeCount)
      return false
    }
    let saved = CrumbKeychainStore.write(data, key: crumbDraftsKey)
    NSLog("[CrumbMessageFilter] saved draft before=%d after=%d bytes=%d success=%@", beforeCount, drafts.count, data.count, saved ? "yes" : "no")
    return saved
  }

  static func recordDiagnostic(sender: String?, body: String, parsed: Bool, saved: Bool, reason: String) {
    var diagnostics = CrumbKeychainStore.readArray(key: crumbDiagnosticsKey)
    diagnostics.insert([
      "createdAt": ISO8601DateFormatter().string(from: Date()),
      "sender": sender ?? "nil",
      "bodyLength": body.count,
      "rawHash": CrumbSMSParser.sha256(body),
      "parsed": parsed,
      "saved": saved,
      "reason": reason
    ], at: 0)
    diagnostics = Array(diagnostics.prefix(10))
    guard let data = try? JSONSerialization.data(withJSONObject: diagnostics) else {
      NSLog("[CrumbMessageFilter] diagnostic failed: invalid json reason=%@", reason)
      return
    }
    let ok = CrumbKeychainStore.write(data, key: crumbDiagnosticsKey)
    NSLog("[CrumbMessageFilter] diagnostic saved reason=%@ count=%d success=%@", reason, diagnostics.count, ok ? "yes" : "no")
  }
}

enum CrumbKeychainStore {
  static func readArray(key: String) -> [[String: Any]] {
    guard let data = read(key: key),
          let items = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return [] }
    return items
  }

  static func read(key: String) -> Data? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccessGroup as String: crumbKeychainAccessGroup,
      kSecAttrAccount as String: key,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne
    ]
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    guard status == errSecSuccess else {
      if status != errSecItemNotFound {
        NSLog("[CrumbMessageFilter] keychain read failed key=%@ status=%d", key, status)
      }
      return nil
    }
    return result as? Data
  }

  @discardableResult
  static func write(_ data: Data, key: String) -> Bool {
    let baseQuery: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccessGroup as String: crumbKeychainAccessGroup,
      kSecAttrAccount as String: key
    ]
    let updateStatus = SecItemUpdate(baseQuery as CFDictionary, [kSecValueData as String: data] as CFDictionary)
    if updateStatus == errSecSuccess { return true }
    if updateStatus != errSecItemNotFound {
      NSLog("[CrumbMessageFilter] keychain update failed key=%@ status=%d", key, updateStatus)
      return false
    }
    var addQuery = baseQuery
    addQuery[kSecValueData as String] = data
    addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
    let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
    if addStatus != errSecSuccess {
      NSLog("[CrumbMessageFilter] keychain add failed key=%@ status=%d", key, addStatus)
      return false
    }
    return true
  }
}

enum CrumbSMSParser {
  /// Mirrors packages/core's parseTransactionAlert; the rules themselves live in
  /// CrumbReceiptRules so all three platforms decide the same way.
  static func parse(body rawBody: String, sender: String?) -> [String: Any]? {
    let body = CrumbReceiptRules.stripSecurityFooter(CrumbReceiptRules.normalize(rawBody))
    guard !CrumbReceiptRules.isOtp(body),
          let merchant = CrumbReceiptRules.detectMerchant("\(body)\n\(sender ?? "")"),
          CrumbReceiptRules.isDebit(body),
          !CrumbReceiptRules.isTransferToOtherPayee(body, merchant: merchant),
          let amount = amount(in: body) else { return nil }
    let now = ISO8601DateFormatter().string(from: Date())
    var draft: [String: Any] = [
      "id": UUID().uuidString,
      "merchant": merchant,
      "amount": amount,
      "sourceLabel": sender ?? "Messages",
      "confidence": "High",
      "rawHash": sha256(rawBody),
      "status": "Pending",
      "platform": "ios",
      "ingestionSource": "sms_filter",
      "createdAt": now
    ]
    draft["occurredAt"] = occurredAt(in: body) ?? NSNull()
    return draft
  }

  private static func amount(in text: String) -> String? {
    guard let cleaned = CrumbReceiptRules.extractAmount(text) else { return nil }
    if cleaned.hasSuffix(".00") { return String(cleaned.dropLast(3)) }
    return cleaned
  }

  private static func occurredAt(in text: String) -> String? {
    if let match = firstMatch(#"(?i)(\d{4})-(\d{2})-(\d{2})[:T\s](\d{1,2}):(\d{1,2}):(\d{1,2})"#, in: text),
       let y = group(match, index: 1, text: text),
       let m = group(match, index: 2, text: text),
       let d = group(match, index: 3, text: text),
       let hh = group(match, index: 4, text: text),
       let mm = group(match, index: 5, text: text),
       let ss = group(match, index: 6, text: text) {
      return "\(y)-\(m)-\(d)T\(pad(hh)):\(pad(mm)):\(pad(ss))+05:30"
    }

    if let match = firstMatch(#"(?i)on\s+(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})"#, in: text),
       let d = group(match, index: 1, text: text),
       let m = group(match, index: 2, text: text),
       let y = group(match, index: 3, text: text),
       let hh = group(match, index: 4, text: text),
       let mm = group(match, index: 5, text: text),
       let ss = group(match, index: 6, text: text) {
      return "\(y)-\(pad(m))-\(pad(d))T\(pad(hh)):\(pad(mm)):\(pad(ss))+05:30"
    }

    if let match = firstMatch(#"(?i)on\s+(\d{1,2})/(\d{1,2})/(\d{2})"#, in: text),
       let d = group(match, index: 1, text: text),
       let m = group(match, index: 2, text: text),
       let y = group(match, index: 3, text: text) {
      return "20\(y)-\(pad(m))-\(pad(d))T00:00:00+05:30"
    }

    if let match = firstMatch(#"(?i)on\s+(\d{1,2})-([A-Za-z]{3})-(\d{2})"#, in: text),
       let d = group(match, index: 1, text: text),
       let rawMonth = group(match, index: 2, text: text),
       let y = group(match, index: 3, text: text),
       let month = ["jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06", "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"][rawMonth.lowercased()] {
      return "20\(y)-\(month)-\(pad(d))T00:00:00+05:30"
    }

    // Kotak UPI: "on 29-07-26" (DD-MM-YY, no time)
    if let match = firstMatch(#"(?i)on\s+(\d{1,2})-(\d{1,2})-(\d{2})\b"#, in: text),
       let d = group(match, index: 1, text: text),
       let m = group(match, index: 2, text: text),
       let y = group(match, index: 3, text: text) {
      return "20\(y)-\(pad(m))-\(pad(d))T00:00:00+05:30"
    }

    return nil
  }

  private static func firstMatch(_ pattern: String, in text: String) -> NSTextCheckingResult? {
    guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
    return regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text))
  }

  private static func group(_ match: NSTextCheckingResult, index: Int, text: String) -> String? {
    guard match.numberOfRanges > index, let range = Range(match.range(at: index), in: text) else { return nil }
    return String(text[range])
  }

  private static func pad(_ value: String) -> String {
    value.count == 1 ? "0\(value)" : value
  }

  static func sha256(_ text: String) -> String {
    SHA256.hash(data: Data(text.utf8)).map { String(format: "%02x", $0) }.joined()
  }
}
