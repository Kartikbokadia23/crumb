package com.flatwise.app.splitwise

import com.flatwise.app.data.TransactionCandidate
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.forms.submitForm
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.statement.HttpResponse
import io.ktor.http.Parameters
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

class SplitwiseClient(
    private val apiBaseUrl: String = "https://secure.splitwise.com/api/v3.0",
    private val tokenUrl: String = "https://secure.splitwise.com/oauth/token",
) {
    private val http = HttpClient(Android) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
    }

    suspend fun exchangeCode(
        config: SplitwiseConfig,
        code: String,
    ): SplitwiseTokenResponse {
        return http.submitForm(
            url = tokenUrl,
            formParameters = Parameters.build {
                append("grant_type", "authorization_code")
                append("client_id", config.clientId)
                append("client_secret", config.clientSecret)
                append("redirect_uri", config.redirectUri)
                append("code", code)
            },
        ).body()
    }

    suspend fun getCurrentUser(accessToken: String): SplitwiseUser {
        return http.get("$apiBaseUrl/get_current_user") {
            header("Authorization", "Bearer $accessToken")
        }.body<SplitwiseCurrentUserResponse>().user
    }

    suspend fun getGroups(accessToken: String): List<SplitwiseGroup> {
        return http.get("$apiBaseUrl/get_groups") {
            header("Authorization", "Bearer $accessToken")
        }.body<SplitwiseGroupsResponse>().groups
    }

    suspend fun createEqualExpense(
        accessToken: String,
        groupId: Long,
        candidate: TransactionCandidate,
    ): HttpResponse {
        return http.submitForm(
            url = "$apiBaseUrl/create_expense",
            formParameters = Parameters.build {
                append("cost", candidate.amount.toPlainString())
                append("description", candidate.merchant.displayName)
                append("currency_code", "INR")
                append("group_id", groupId.toString())
                append("split_equally", "true")
                append("details", "Added by Crumb from ${candidate.sourceLabel}")
            },
        ) {
            header("Authorization", "Bearer $accessToken")
        }
    }
}
