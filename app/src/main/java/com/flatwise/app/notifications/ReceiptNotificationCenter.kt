package com.flatwise.app.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.flatwise.app.MainActivity
import com.flatwise.app.R
import com.flatwise.app.data.TransactionCandidate

object ReceiptNotificationCenter {
    const val ACTION_POST = "com.flatwise.app.notifications.POST_RECEIPT"
    const val ACTION_IGNORE = "com.flatwise.app.notifications.IGNORE_RECEIPT"
    const val EXTRA_CANDIDATE_ID = "candidate_id"

    private const val CHANNEL_RECEIPTS = "crumb_receipts"
    private const val CHANNEL_STATUS = "crumb_status"
    private const val RECEIPT_BASE_ID = 4100
    private const val STATUS_NOTIFICATION_ID = 5100

    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_RECEIPTS,
                "Receipt decisions",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Actionable Crumb drafts from payment alerts."
            },
        )
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_STATUS,
                "Crumb status",
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = "Posting status and setup reminders."
            },
        )
    }

    fun showReceiptDecision(context: Context, candidate: TransactionCandidate) {
        if (!canPostNotifications(context)) return

        val notification = NotificationCompat.Builder(context, CHANNEL_RECEIPTS)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle("Add ${candidate.merchant.displayName} to Splitwise?")
            .setContentText("Rs.${candidate.amount.toPlainString()} from ${candidate.sourceLabel}")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("Rs.${candidate.amount.toPlainString()} at ${candidate.merchant.displayName}. Tap Yes to add it to your selected flat group, or No to dismiss it."),
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setAutoCancel(false)
            .setContentIntent(openAppIntent(context))
            .addAction(0, "No", actionIntent(context, ACTION_IGNORE, candidate.id))
            .addAction(0, "Yes", actionIntent(context, ACTION_POST, candidate.id))
            .build()

        NotificationManagerCompat.from(context).notify(candidate.notificationId(), notification)
    }

    fun showStatus(context: Context, title: String, message: String) {
        if (!canPostNotifications(context)) return
        val notification = NotificationCompat.Builder(context, CHANNEL_STATUS)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(openAppIntent(context))
            .build()
        NotificationManagerCompat.from(context).notify(STATUS_NOTIFICATION_ID, notification)
    }

    fun cancelReceipt(context: Context, candidate: TransactionCandidate) {
        NotificationManagerCompat.from(context).cancel(candidate.notificationId())
    }

    private fun actionIntent(context: Context, action: String, candidateId: String): PendingIntent {
        val intent = Intent(context, ReceiptActionReceiver::class.java).apply {
            this.action = action
            putExtra(EXTRA_CANDIDATE_ID, candidateId)
        }
        return PendingIntent.getBroadcast(
            context,
            (action + candidateId).hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun openAppIntent(context: Context): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun canPostNotifications(context: Context): Boolean {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
    }

    // Keyed on rawHash so a bank-app notification update (same transaction, slightly different text)
    // replaces the existing Crumb notification instead of stacking a duplicate.
    private fun TransactionCandidate.notificationId(): Int =
        RECEIPT_BASE_ID + rawHash.hashCode().mod(10_000)
}
