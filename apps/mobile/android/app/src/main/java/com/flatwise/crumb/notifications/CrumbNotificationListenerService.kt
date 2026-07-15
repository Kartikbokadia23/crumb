package com.flatwise.crumb.notifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class CrumbNotificationListenerService : NotificationListenerService() {
  private val eventDedupe = CrumbNotificationEventDedupe()

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    processNotification(sbn)
  }

  override fun onListenerConnected() {
    // Android may not replay posts that arrived while this listener was disconnected.
    // These still go through the same event TTL gate as normal posts.
    activeNotifications?.forEach { processNotification(it) }
  }

  private fun processNotification(sbn: StatusBarNotification) {
    if (sbn.packageName == CRUMB_PACKAGE_NAME) return
    if ((sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0) return

    notificationTexts(sbn.notification).forEach { candidate ->
      val text = CrumbAndroidNotificationIngestion.stripTransportPrefix(candidate)
      if (!CrumbAndroidNotificationIngestion.isEligibleReceiptText(text)) return@forEach

      val parsed = CrumbNotificationParser.parse(text, sourceLabel(sbn.packageName)) ?: return@forEach
      // Dedupe only verified parser candidates. Conversation updates share an
      // sbn.key, so the delivery key is package + candidate text instead.
      if (!eventDedupe.shouldProcess(sbn.packageName, text)) return@forEach

      val draft = CrumbNativeDraftStore.addParsed(applicationContext, parsed) ?: return@forEach
      CrumbNotificationModule.instance?.emitNewDraft(draft)
      CrumbReceiptNotificationCenter.showReceiptDecision(applicationContext, draft)
    }
  }

  private fun notificationTexts(notification: Notification): List<String> {
    val extras = notification.extras ?: return emptyList()
    return CrumbAndroidNotificationIngestion.candidateTexts(
      textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.toList().orEmpty(),
      bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT),
      text = extras.getCharSequence(Notification.EXTRA_TEXT)
    )
  }

  private fun sourceLabel(packageName: String): String {
    return try {
      val info = packageManager.getApplicationInfo(packageName, 0)
      packageManager.getApplicationLabel(info).toString()
    } catch (_: Exception) {
      packageName
    }
  }

  private companion object {
    const val CRUMB_PACKAGE_NAME = "com.flatwise.crumb"
  }
}
