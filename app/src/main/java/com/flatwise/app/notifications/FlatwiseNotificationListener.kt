package com.flatwise.app.notifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.flatwise.app.data.AppContainer
import com.flatwise.app.parser.TransactionAlertParser

class FlatwiseNotificationListener : NotificationListenerService() {
    override fun onListenerConnected() {
        Log.d(TAG, "Notification listener connected")
        activeNotifications.orEmpty().forEach(::processNotification)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        processNotification(sbn)
    }

    private fun processNotification(sbn: StatusBarNotification) {
        val text = sbn.toReadableText()
        Log.d(TAG, "Notification from ${sbn.packageName}: $text")
        if (text.isBlank()) return

        val source = readableSource(sbn.packageName)
        val parsed = TransactionAlertParser.parse(text, source) ?: return
        Log.d(TAG, "Parsed ${parsed.merchant.displayName} ${parsed.amount} from $source")
        AppContainer.repository.add(parsed)?.let { candidate ->
            ReceiptNotificationCenter.showReceiptDecision(applicationContext, candidate)
        }
    }

    private fun StatusBarNotification.toReadableText(): String {
        val extras = notification.extras ?: return ""
        val fields = buildList {
            add(extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty())
            add(extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty())
            add(extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty())
            extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
                ?.mapNotNull { it?.toString() }
                ?.let(::addAll)
        }
        return fields
            .filter { it.isNotBlank() }
            .distinct()
            .joinToString(" ")
    }

    private fun readableSource(packageName: String): String {
        return packageName
            .substringAfterLast('.')
            .replaceFirstChar { it.uppercase() }
            .ifBlank { "Notification" }
    }

    private companion object {
        const val TAG = "FlatwiseListener"
    }
}
