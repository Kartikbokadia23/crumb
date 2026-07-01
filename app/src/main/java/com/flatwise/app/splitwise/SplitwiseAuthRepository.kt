package com.flatwise.app.splitwise

import android.content.Context
import android.content.Intent
import android.net.Uri
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import com.flatwise.app.data.TransactionCandidate

class SplitwiseAuthRepository(
    context: Context,
    private val config: SplitwiseConfig = SplitwiseConfig.fromBuildConfig(),
    private val client: SplitwiseClient = SplitwiseClient(),
) {
    private val prefs = context.getSharedPreferences("crumb_splitwise_auth", Context.MODE_PRIVATE)
    private val scope = CoroutineScope(Dispatchers.IO)
    private val _state = MutableStateFlow(loadInitialState())
    val state: StateFlow<SplitwiseConnectionState> = _state

    val isConfigured: Boolean get() = config.isConfigured

    fun buildAuthIntent(): Intent? = SplitwiseAuth(config).buildAuthIntent()

    fun handleRedirect(uri: Uri?) {
        if (uri == null || uri.scheme != "crumb" || uri.host != "splitwise-auth") return
        val error = uri.getQueryParameter("error")
        if (error != null) {
            _state.value = SplitwiseConnectionState.Error("Splitwise returned: $error")
            return
        }
        val code = uri.getQueryParameter("code")
        if (code.isNullOrBlank()) {
            _state.value = SplitwiseConnectionState.Error("Splitwise did not return an authorization code.")
            return
        }
        exchangeAndLoad(code)
    }

    fun refreshFromStoredToken() {
        val token = prefs.getString(KEY_ACCESS_TOKEN, null) ?: return
        loadAccount(token)
    }

    fun disconnect() {
        prefs.edit().clear().apply()
        _state.value = SplitwiseConnectionState.Disconnected
    }

    fun selectGroup(groupId: Long) {
        prefs.edit().putLong(KEY_SELECTED_GROUP_ID, groupId).apply()
        _state.update { current ->
            if (current is SplitwiseConnectionState.Connected) {
                current.copy(selectedGroupId = groupId)
            } else {
                current
            }
        }
    }

    suspend fun createExpense(candidate: TransactionCandidate) {
        val token = prefs.getString(KEY_ACCESS_TOKEN, null) ?: error("Splitwise is not connected.")
        val groupId = (_state.value as? SplitwiseConnectionState.Connected)?.selectedGroupId
            ?: prefs.getLong(KEY_SELECTED_GROUP_ID, 0L).takeIf { it != 0L }
            ?: error("Select a Splitwise group first.")
        client.createEqualExpense(token, groupId, candidate)
    }

    private fun exchangeAndLoad(code: String) {
        _state.value = SplitwiseConnectionState.Connecting
        scope.launch {
            runCatching {
                val token = client.exchangeCode(config, code)
                prefs.edit()
                    .putString(KEY_ACCESS_TOKEN, token.accessToken)
                    .putString(KEY_REFRESH_TOKEN, token.refreshToken)
                    .apply()
                loadAccountBlocking(token.accessToken)
            }.onFailure { error ->
                _state.value = SplitwiseConnectionState.Error(error.message ?: "Splitwise connection failed.")
            }
        }
    }

    private fun loadAccount(accessToken: String) {
        _state.value = SplitwiseConnectionState.Connecting
        scope.launch {
            runCatching { loadAccountBlocking(accessToken) }
                .onFailure { error -> _state.value = SplitwiseConnectionState.Error(error.message ?: "Could not load Splitwise account.") }
        }
    }

    private suspend fun loadAccountBlocking(accessToken: String) {
        val user = client.getCurrentUser(accessToken)
        val groups = client.getGroups(accessToken)
        val selectedGroupId = prefs.getLong(KEY_SELECTED_GROUP_ID, 0L).takeIf { selected -> groups.any { it.id == selected } }
        _state.value = SplitwiseConnectionState.Connected(user = user, groups = groups, selectedGroupId = selectedGroupId)
    }

    private fun loadInitialState(): SplitwiseConnectionState {
        return if (!config.isConfigured) {
            SplitwiseConnectionState.NotConfigured
        } else if (prefs.getString(KEY_ACCESS_TOKEN, null).isNullOrBlank()) {
            SplitwiseConnectionState.Disconnected
        } else {
            SplitwiseConnectionState.Connecting
        }
    }

    private companion object {
        const val KEY_ACCESS_TOKEN = "access_token"
        const val KEY_REFRESH_TOKEN = "refresh_token"
        const val KEY_SELECTED_GROUP_ID = "selected_group_id"
    }
}

sealed interface SplitwiseConnectionState {
    data object NotConfigured : SplitwiseConnectionState
    data object Disconnected : SplitwiseConnectionState
    data object Connecting : SplitwiseConnectionState
    data class Connected(
        val user: SplitwiseUser,
        val groups: List<SplitwiseGroup>,
        val selectedGroupId: Long? = null,
    ) : SplitwiseConnectionState
    data class Error(val message: String) : SplitwiseConnectionState
}
