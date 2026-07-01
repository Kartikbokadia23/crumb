import Foundation
import React
import UserNotifications

@objc(CrumbDraftNotificationModule)
final class CrumbDraftNotificationModule: RCTEventEmitter {
  static weak var shared: CrumbDraftNotificationModule?

  private let categoryId = "CRUMB_DRAFT_DECISION"
  private let reviewActionId = "REVIEW"
  private let ignoreActionId = "IGNORE"
  private var pendingAction: [String: String]?
  private var isObserving = false

  override init() {
    super.init()
    Self.shared = self
  }

  @objc static override func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    ["draftNotificationAction"]
  }

  override func startObserving() {
    isObserving = true
    if let pendingAction {
      sendEvent(withName: "draftNotificationAction", body: pendingAction)
      self.pendingAction = nil
    }
  }

  override func stopObserving() {
    isObserving = false
  }

  @objc(requestNotificationPermission:rejecter:)
  func requestNotificationPermission(_ resolve: @escaping RCTPromiseResolveBlock,
                                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
      resolve(granted)
    }
  }

  @objc(scheduleDraftNotification:amount:merchant:resolver:rejecter:)
  func scheduleDraftNotification(_ draftId: String,
                                 amount: String,
                                 merchant: String,
                                 resolver resolve: @escaping RCTPromiseResolveBlock,
                                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    let content = UNMutableNotificationContent()
    content.title = "New Crumb draft"
    content.body = "₹\(amount) at \(merchant)"
    content.categoryIdentifier = categoryId
    content.userInfo = ["draftId": draftId]
    content.sound = .default

    let request = UNNotificationRequest(
      identifier: draftId,
      content: content,
      trigger: nil
    )

    UNUserNotificationCenter.current().add(request) { error in
      if let error {
        reject("schedule_failed", error.localizedDescription, error)
      } else {
        resolve(nil)
      }
    }
  }

  @objc(dismissDraftNotification:resolver:rejecter:)
  func dismissDraftNotification(_ draftId: String,
                                resolver resolve: @escaping RCTPromiseResolveBlock,
                                rejecter reject: @escaping RCTPromiseRejectBlock) {
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [draftId])
    UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [draftId])
    resolve(nil)
  }

  func handleNotificationResponse(_ response: UNNotificationResponse) {
    let userInfo = response.notification.request.content.userInfo
    guard let draftId = userInfo["draftId"] as? String, !draftId.isEmpty else { return }

    let action: String?
    switch response.actionIdentifier {
    case reviewActionId, UNNotificationDefaultActionIdentifier:
      action = "review"
    case ignoreActionId:
      action = "ignore"
    default:
      action = nil
    }

    guard let action else { return }
    emitAction(draftId: draftId, action: action)
    dismissDeliveredNotification(draftId)
  }

  private func emitAction(draftId: String, action: String) {
    let payload = ["draftId": draftId, "action": action]
    if isObserving {
      sendEvent(withName: "draftNotificationAction", body: payload)
    } else {
      pendingAction = payload
    }
  }

  private func dismissDeliveredNotification(_ draftId: String) {
    UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [draftId])
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [draftId])
  }

  static func registerCategories() {
    let review = UNNotificationAction(
      identifier: "REVIEW",
      title: "Review",
      options: [.foreground]
    )
    let ignore = UNNotificationAction(
      identifier: "IGNORE",
      title: "Ignore",
      options: [.destructive, .foreground]
    )
    let category = UNNotificationCategory(
      identifier: "CRUMB_DRAFT_DECISION",
      actions: [ignore, review],
      intentIdentifiers: [],
      options: []
    )
    UNUserNotificationCenter.current().setNotificationCategories([category])
  }
}
