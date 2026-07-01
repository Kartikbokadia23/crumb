package com.flatwise.app.splitwise

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SplitwiseTokenResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String? = null,
    @SerialName("token_type") val tokenType: String? = null,
    @SerialName("expires_in") val expiresIn: Long? = null,
)

@Serializable
data class SplitwiseCurrentUserResponse(
    val user: SplitwiseUser,
)

@Serializable
data class SplitwiseGroupsResponse(
    val groups: List<SplitwiseGroup> = emptyList(),
)

@Serializable
data class SplitwiseUser(
    val id: Long,
    @SerialName("first_name") val firstName: String = "",
    @SerialName("last_name") val lastName: String? = null,
) {
    val displayName: String
        get() = listOfNotNull(firstName.takeIf { it.isNotBlank() }, lastName).joinToString(" ").ifBlank { "Splitwise user" }
}

@Serializable
data class SplitwiseGroup(
    val id: Long,
    val name: String,
)

data class SplitwiseExpenseDraft(
    val groupId: Long,
    val description: String,
    val amount: String,
    val currencyCode: String = "INR",
)
