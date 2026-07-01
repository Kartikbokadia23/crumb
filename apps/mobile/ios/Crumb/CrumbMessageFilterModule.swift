import Foundation
import Security

private let crumbKeychainAccessGroup = "W62HH85PLL.com.flatwise.crumb.shared"

@objc(CrumbMessageFilterModule)
final class CrumbMessageFilterModule: NSObject {
  private let draftsKey = "crumb_message_filter_drafts"
  private let diagnosticsKey = "crumb_message_filter_diagnostics"

  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(getStoredDrafts:rejecter:)
  func getStoredDrafts(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    logDiagnostics()
    guard let data = CrumbKeychainStore.read(key: draftsKey) else {
      NSLog("[CrumbMessageFilter] app read: no drafts stored")
      resolve([])
      return
    }
    guard let drafts = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
      NSLog("[CrumbMessageFilter] app read failed: json root is not draft array bytes=%d", data.count)
      resolve([])
      return
    }
    NSLog("[CrumbMessageFilter] app read drafts count=%d bytes=%d", drafts.count, data.count)
    resolve(drafts)
  }

  @objc(clearStoredDrafts:rejecter:)
  func clearStoredDrafts(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    CrumbKeychainStore.delete(key: draftsKey)
    NSLog("[CrumbMessageFilter] app cleared drafts")
    resolve(nil)
  }

  private func logDiagnostics() {
    guard let data = CrumbKeychainStore.read(key: diagnosticsKey) else {
      NSLog("[CrumbMessageFilter] app diagnostics: none stored")
      return
    }
    let items = (try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
    NSLog("[CrumbMessageFilter] app diagnostics count=%d latest=%@", items.count, String(describing: items.first ?? [:]))
  }
}

private enum CrumbKeychainStore {
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

  static func delete(key: String) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrAccessGroup as String: crumbKeychainAccessGroup,
      kSecAttrAccount as String: key
    ]
    SecItemDelete(query as CFDictionary)
  }
}
