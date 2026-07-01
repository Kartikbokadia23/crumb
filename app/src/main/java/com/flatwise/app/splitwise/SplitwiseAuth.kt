package com.flatwise.app.splitwise

import android.content.Intent
import android.net.Uri

class SplitwiseAuth(
    private val config: SplitwiseConfig,
) {
    fun buildAuthIntent(): Intent? {
        if (!config.isConfigured) return null

        val uri = Uri.parse("https://secure.splitwise.com/oauth/authorize")
            .buildUpon()
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("client_id", config.clientId)
            .appendQueryParameter("redirect_uri", config.redirectUri)
            .build()

        return Intent(Intent.ACTION_VIEW, uri)
    }
}
