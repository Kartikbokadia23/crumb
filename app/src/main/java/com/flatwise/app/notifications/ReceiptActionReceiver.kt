package com.flatwise.app.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.flatwise.app.data.AppContainer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ReceiptActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val candidateId = intent.getStringExtra(ReceiptNotificationCenter.EXTRA_CANDIDATE_ID) ?: return
        when (intent.action) {
            ReceiptNotificationCenter.ACTION_IGNORE -> {
                AppContainer.repository.ignore(candidateId)
                ReceiptNotificationCenter.cancelReceipt(context, candidateId)
            }
            ReceiptNotificationCenter.ACTION_POST -> postCandidate(context.applicationContext, candidateId)
        }
    }

    private fun postCandidate(context: Context, candidateId: String) {
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val candidate = AppContainer.repository.candidate(candidateId)
                if (candidate == null) {
                    ReceiptNotificationCenter.cancelReceipt(context, candidateId)
                    return@launch
                }
                runCatching { AppContainer.splitwiseAuthRepository.createExpense(candidate) }
                    .onSuccess {
                        AppContainer.repository.markPosted(candidateId)
                        ReceiptNotificationCenter.cancelReceipt(context, candidateId)
                        ReceiptNotificationCenter.showStatus(
                            context,
                            "Added to Splitwise",
                            "Rs.${candidate.amount.toPlainString()} at ${candidate.merchant.displayName} was posted.",
                        )
                    }
                    .onFailure { error ->
                        ReceiptNotificationCenter.showStatus(
                            context,
                            "Crumb needs attention",
                            error.message ?: "Open Crumb and check Splitwise setup.",
                        )
                    }
            } finally {
                pendingResult.finish()
            }
        }
    }
}
