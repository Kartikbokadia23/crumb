package com.flatwise.crumb.notifications

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object CrumbSplitwiseStore {
  private const val PREFS = "crumb_splitwise"
  private const val KEY_TOKEN = "access_token"
  private const val KEY_GROUP = "group_id"
  private const val TAG = "CrumbSplitwise"

  fun saveCredentials(context: Context, accessToken: String, groupId: Int) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putString(KEY_TOKEN, accessToken)
      .putInt(KEY_GROUP, groupId)
      .apply()
  }

  fun postExpense(context: Context, draft: org.json.JSONObject): Boolean {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val token = prefs.getString(KEY_TOKEN, null) ?: run {
      Log.e(TAG, "No access token saved — cannot post expense")
      return false
    }
    val groupId = prefs.getInt(KEY_GROUP, -1).takeIf { it != -1 } ?: run {
      Log.e(TAG, "No group ID saved — cannot post expense")
      return false
    }

    val merchant = draft.optString("merchant", "Expense")
    val amount = draft.optString("amount", "0")

    return try {
      val body = JSONObject().apply {
        put("description", merchant)
        put("cost", amount)
        put("group_id", groupId)
        put("split_equally", true)
        put("currency_code", "INR")
      }.toString()

      val url = URL("https://secure.splitwise.com/api/v3.0/create_expense")
      val conn = url.openConnection() as HttpURLConnection
      conn.requestMethod = "POST"
      conn.setRequestProperty("Authorization", "Bearer $token")
      conn.setRequestProperty("Content-Type", "application/json")
      conn.setRequestProperty("Accept", "application/json")
      conn.doOutput = true
      conn.connectTimeout = 10_000
      conn.readTimeout = 10_000

      OutputStreamWriter(conn.outputStream).use { it.write(body) }

      val code = conn.responseCode
      if (code in 200..299) {
        Log.i(TAG, "Expense posted: $merchant ₹$amount → group $groupId")
        true
      } else {
        Log.e(TAG, "Splitwise returned $code for expense post")
        false
      }
    } catch (e: Exception) {
      Log.e(TAG, "Expense post failed: ${e.message}")
      false
    }
  }
}
