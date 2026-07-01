package com.flatwise.app.splitwise

import com.flatwise.app.BuildConfig

data class SplitwiseConfig(
    val clientId: String,
    val clientSecret: String,
    val redirectUri: String,
) {
    val isConfigured: Boolean
        get() = clientId.isNotBlank() && redirectUri.isNotBlank()

    companion object {
        fun fromBuildConfig(): SplitwiseConfig {
            return SplitwiseConfig(
                clientId = BuildConfig.SPLITWISE_CLIENT_ID,
                clientSecret = BuildConfig.SPLITWISE_CLIENT_SECRET,
                redirectUri = BuildConfig.SPLITWISE_REDIRECT_URI,
            )
        }
    }
}
