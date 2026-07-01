package com.flatwise.mockbank

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

class MockBankActivity : Activity() {
    private val alerts = listOf(
        "Sent Rs.270.00 From HDFC Bank A/C *8899 To Blinkit On 31/05/26 Ref 651715008613",
        "Spent Rs.476 On HDFC Bank Card 1116 At PYU*Swiggy Food On 2026-03-19:16:08:31.Not You? To Block+Reissue Call 18002586161",
        "Rs. 801.00 spent from Pluxee Meal wallet, card no.xx8691 on 25-03-2026 22:44:50 at BLINKIT . Avl bal Rs.1574.24",
        "ICICI Bank Credit Card XX8006 debited for INR 598.00 on 12-Jun-26 for UPI-652977384174-Blinkit.",
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        MockBankNotifier.ensureChannel(this)
        requestNotificationPermission()

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(48, 48, 48, 48)
            setBackgroundColor(0xFFF8F2E8.toInt())
        }

        root.addView(TextView(this).apply {
            text = "Mock Bank"
            textSize = 34f
            setTextColor(0xFF17120F.toInt())
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        })

        root.addView(TextView(this).apply {
            text = "Posts realistic payment notifications so Flatwise can be tested like a real phone."
            textSize = 16f
            setTextColor(0xFF6F6256.toInt())
            setPadding(0, 16, 0, 32)
        })

        alerts.forEachIndexed { index, alert ->
            root.addView(Button(this).apply {
                text = buttonTitle(alert)
                setOnClickListener { postAlert(index, alert) }
            })
        }

        setContentView(root)
    }

    private fun buttonTitle(alert: String): String {
        return when {
            alert.contains("Swiggy", ignoreCase = true) -> "Post Swiggy Rs.476"
            alert.contains("Pluxee", ignoreCase = true) -> "Post Pluxee Blinkit Rs.801"
            alert.contains("ICICI", ignoreCase = true) -> "Post ICICI Blinkit Rs.598"
            else -> "Post HDFC Blinkit Rs.270"
        }
    }

    private fun postAlert(id: Int, alert: String) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestNotificationPermission()
            return
        }

        MockBankNotifier.postAlert(this, id, alert)
    }

    private fun requestNotificationPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 10)
        }
    }

    private companion object
}
