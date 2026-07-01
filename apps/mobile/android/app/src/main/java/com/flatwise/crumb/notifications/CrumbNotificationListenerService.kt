package com.flatwise.crumb.notifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class CrumbNotificationListenerService : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    processNotification(sbn)
  }

  override fun onListenerConnected() {
    activeNotifications?.forEach { processNotification(it) }
  }

  private fun processNotification(sbn: StatusBarNotification) {
    val text = notificationText(sbn.notification).trim()
    if (text.isBlank()) return

    val parsed = CrumbNotificationParser.parse(text, sourceLabel(sbn.packageName)) ?: return
    val draft = CrumbNativeDraftStore.addParsed(applicationContext, parsed) ?: return
    CrumbNotificationModule.instance?.emitNewDraft(draft)
    CrumbReceiptNotificationCenter.showReceiptDecision(applicationContext, draft)
  }

  private fun notificationText(notification: Notification): String {
    val extras = notification.extras ?: return ""
    val parts = mutableListOf<String>()
    extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.let(parts::add)
    extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.let(parts::add)
    extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.let(parts::add)
    extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.forEach { parts.add(it.toString()) }
    return parts.distinct().joinToString("\n")
  }

  private fun sourceLabel(packageName: String): String {
    return try {
      val info = packageManager.getApplicationInfo(packageName, 0)
      packageManager.getApplicationLabel(info).toString()
    } catch (_: Exception) {
      packageName
    }
  }
}
