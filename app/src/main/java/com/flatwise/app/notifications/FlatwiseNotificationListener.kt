package com.flatwise.app.notifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.flatwise.app.data.AppContainer
import com.flatwise.app.parser.TransactionAlertParser
import java.util.Collections

class FlatwiseNotificationListener : NotificationListenerService() {
    // onListenerConnected + onNotificationPosted both fire for active SBNs when the listener binds,
    // and bank apps update their notification (appending balance) which re-posts the same key with
    // slightly different text → new rawHash → duplicate Crumb notification. Track by SBN key so
    // updates to the same slot are ignored until the notification is removed.
    private val seenKeys = Collections.synchronizedSet(mutableSetOf<String>())

    override fun onListenerConnected() {
        Log.d(TAG, "Notification listener connected")
        seenKeys.clear()
        activeNotifications.orEmpty().forEach { sbn ->
            if (isAllowedSource(sbn.packageName)) seenKeys.add(sbn.key)
            processNotification(sbn)
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (!isAllowedSource(sbn.packageName)) return
        if (!seenKeys.add(sbn.key)) return
        processNotification(sbn)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        seenKeys.remove(sbn.key)
    }

    private fun processNotification(sbn: StatusBarNotification) {
        if (!isAllowedSource(sbn.packageName)) return
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

    private fun isAllowedSource(packageName: String): Boolean = packageName in ALLOWED_PACKAGES

    private companion object {
        const val TAG = "FlatwiseListener"

        val ALLOWED_PACKAGES = setOf(
            "com.google.android.apps.messaging",
            "com.samsung.android.messaging",
            "com.android.mms",
            "com.miui.sms",
            "com.oneplus.mms",
        )
    }
}
