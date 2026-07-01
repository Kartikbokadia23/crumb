package com.flatwise.crumb.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.flatwise.crumb.MainActivity
import com.flatwise.crumb.R
import org.json.JSONObject

object CrumbReceiptNotificationCenter {
  const val ACTION_REVIEW = "com.flatwise.crumb.notifications.REVIEW_RECEIPT"
  const val ACTION_IGNORE = "com.flatwise.crumb.notifications.IGNORE_RECEIPT"
  const val ACTION_POST = "com.flatwise.crumb.notifications.POST_RECEIPT"
  const val EXTRA_DRAFT_ID = "draft_id"

  private const val CHANNEL_RECEIPTS = "crumb_receipt_decisions"
  private const val RECEIPT_BASE_ID = 4100

  fun showReceiptDecision(context: Context, draft: JSONObject) {
    val draftId = draft.optString("id")
    if (draftId.isBlank() || !canPostNotifications(context)) return

    createChannels(context)

    val merchant = draft.optString("merchant", "receipt")
    val amount = draft.optString("amount", "")
    val source = draft.optString("sourceLabel", "bank alert")
    val amountText = if (amount.isBlank()) "New receipt" else "Rs.$amount"

    val notification = NotificationCompat.Builder(context, CHANNEL_RECEIPTS)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("Review $merchant receipt?")
      .setContentText("$amountText from $source")
      .setStyle(
        NotificationCompat.BigTextStyle()
          .bigText("$amountText at $merchant. Tap Yes to open Crumb and review before posting to Splitwise, or No to dismiss this draft.")
      )
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setAutoCancel(false)
      .setContentIntent(openAppIntent(context, draftId))
      .addAction(0, "No", actionIntent(context, ACTION_IGNORE, draftId))
      .addAction(0, "Yes", actionIntent(context, ACTION_POST, draftId))
      .build()

    NotificationManagerCompat.from(context).notify(notificationId(draftId), notification)
  }

  fun cancelReceipt(context: Context, draftId: String) {
    NotificationManagerCompat.from(context).cancel(notificationId(draftId))
  }

  fun openReviewIntent(context: Context, draftId: String, autoPost: Boolean = false): Intent =
    Intent(context, MainActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      val url = if (autoPost) "crumb://draft/$draftId?action=post" else "crumb://draft/$draftId"
      data = Uri.parse(url)
      putExtra(EXTRA_DRAFT_ID, draftId)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

  private fun createChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java)
    val channel = NotificationChannel(
      CHANNEL_RECEIPTS,
      "Receipt decisions",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Fast review prompts for Crumb receipt drafts"
    }
    manager.createNotificationChannel(channel)
  }

  private fun actionIntent(context: Context, action: String, draftId: String): PendingIntent {
    val intent = Intent(context, CrumbReceiptActionReceiver::class.java).apply {
      this.action = action
      putExtra(EXTRA_DRAFT_ID, draftId)
    }
    return PendingIntent.getBroadcast(
      context,
      requestCode(action, draftId),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun openAppIntent(context: Context, draftId: String, autoPost: Boolean = false): PendingIntent =
    PendingIntent.getActivity(
      context,
      requestCode(if (autoPost) "post" else "open", draftId),
      openReviewIntent(context, draftId, autoPost),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

  private fun canPostNotifications(context: Context): Boolean {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
  }

  private fun requestCode(prefix: String, draftId: String): Int = ("$prefix:$draftId".hashCode() and 0x7fffffff)

  private fun notificationId(draftId: String): Int = RECEIPT_BASE_ID + ((draftId.hashCode() and 0x7fffffff) % 10000)
}
