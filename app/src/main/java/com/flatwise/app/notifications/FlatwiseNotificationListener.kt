package com.flatwise.app.notifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.flatwise.app.data.AppContainer
import com.flatwise.app.parser.TransactionAlertParser
import java.util.Collections

class FlatwiseNotificationListener : NotificationListenerService() {
    // Track processed notification keys to prevent double-firing.
    // Two sources of duplicates:
    //   1. onListenerConnected + onNotificationPosted both fire for the same SBN when the listener first binds.
    //   2. Payment apps update their existing notification (e.g., appending balance), which re-posts
    //      the same key with a different text → new rawHash → second Crumb notification.
    // Using the SBN key (package+tag+id) as the dedup unit so updates to the same notification slot
    // are ignored until it is removed and a genuinely new notification occupies that slot.
    private val seenKeys = Collections.synchronizedSet(mutableSetOf<String>())

    override fun onListenerConnected() {
        Log.d(TAG, "Notification listener connected")
        seenKeys.clear()
        activeNotifications.orEmpty().forEach { sbn ->
            // Only track allowed sources in seenKeys to keep it clean.
            if (isAllowedSource(sbn.packageName)) seenKeys.add(sbn.key)
            // Always attempt processing; repository rawHash dedup prevents duplicate storage
            // for notifications that were already persisted in a prior session.
            processNotification(sbn)
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (!isAllowedSource(sbn.packageName)) return
        // seenKeys.add() returns false when the key is already present — skip re-processing.
        if (!seenKeys.add(sbn.key)) return
        processNotification(sbn)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        // Clear the key so a genuinely new notification in the same app slot is processed normally.
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

    // Only listen to SMS/messaging apps. Payment alert SMSes arrive via these apps;
    // watching all apps was reading unrelated notifications (social, email, etc.).
    private fun isAllowedSource(packageName: String): Boolean {
        return ALLOWED_PACKAGES.any { packageName.startsWith(it) }
    }

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
