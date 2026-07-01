package com.flatwise.app

import android.app.Application
import com.flatwise.app.data.AppContainer
import com.flatwise.app.notifications.ReceiptNotificationCenter

class FlatwiseApp : Application() {
    override fun onCreate() {
        super.onCreate()
        AppContainer.init(this)
        ReceiptNotificationCenter.createChannels(this)
    }
}
