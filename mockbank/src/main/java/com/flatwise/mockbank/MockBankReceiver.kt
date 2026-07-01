package com.flatwise.mockbank

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class MockBankReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val alert = intent.getStringExtra("alert") ?: return
        MockBankNotifier.postAlert(context, 99, alert)
    }
}
