package com.flatwise.crumb.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import kotlin.concurrent.thread

class CrumbReceiptActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val draftId = intent.getStringExtra(CrumbReceiptNotificationCenter.EXTRA_DRAFT_ID) ?: return

    when (intent.action) {
      CrumbReceiptNotificationCenter.ACTION_IGNORE -> {
        CrumbNativeDraftStore.markIgnored(context, draftId)
        CrumbReceiptNotificationCenter.cancelReceipt(context, draftId)
        CrumbNotificationModule.instance?.emitIgnoredDraft(draftId)
      }
      CrumbReceiptNotificationCenter.ACTION_POST -> {
        val draft = CrumbNativeDraftStore.findById(context, draftId) ?: run {
          Log.e("CrumbReceiver", "Draft $draftId not found for posting")
          CrumbReceiptNotificationCenter.cancelReceipt(context, draftId)
          return
        }
        CrumbReceiptNotificationCenter.cancelReceipt(context, draftId)
        val appContext = context.applicationContext
        thread {
          val ok = CrumbSplitwiseStore.postExpense(appContext, draft)
          if (ok) {
            CrumbNativeDraftStore.markPosted(appContext, draftId)
            CrumbNotificationModule.instance?.emitPostedDraft(draftId)
          } else {
            // Post failed — re-show notification so user can try again via the app
            CrumbReceiptNotificationCenter.showReceiptDecision(appContext, draft)
          }
        }
      }
      CrumbReceiptNotificationCenter.ACTION_REVIEW -> {
        CrumbReceiptNotificationCenter.cancelReceipt(context, draftId)
        context.startActivity(CrumbReceiptNotificationCenter.openReviewIntent(context, draftId))
      }
    }
  }
}
