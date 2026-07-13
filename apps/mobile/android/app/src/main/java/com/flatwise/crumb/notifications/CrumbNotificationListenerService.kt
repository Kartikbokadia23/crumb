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
    if ((notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0) return ""

    val extras = notification.extras ?: return ""
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
    val body = listOf(
      extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString(),
      extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
    ).firstOrNull { !it.isNullOrBlank() }?.trim()
    val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
      ?.map { it.toString().trim() }
      ?.filter { it.isNotBlank() }
      ?.distinct()
      ?.joinToString("\n")
      ?.takeIf { it.isNotBlank() }

    return listOfNotNull(title, body ?: textLines)
      .filter { it.isNotBlank() }
      .distinct()
      .joinToString("\n")
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
