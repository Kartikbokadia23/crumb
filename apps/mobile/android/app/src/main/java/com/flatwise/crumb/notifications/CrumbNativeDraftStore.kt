package com.flatwise.crumb.notifications

import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

object CrumbNativeDraftStore {
  private const val PREFS = "crumb_native_drafts"
  private const val KEY_DRAFTS = "drafts"

  fun all(context: Context): JSONArray {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_DRAFTS, "[]")
    return JSONArray(raw ?: "[]")
  }

  fun clear(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY_DRAFTS).apply()
  }

  fun addParsed(context: Context, parsed: ParsedNotificationTransaction): JSONObject? {
    val drafts = all(context)
    for (index in 0 until drafts.length()) {
      if (drafts.optJSONObject(index)?.optString("rawHash") == parsed.rawHash) return null
    }

    val draft = JSONObject().apply {
      put("id", UUID.randomUUID().toString())
      put("merchant", parsed.merchant)
      put("amount", parsed.amount)
      put("occurredAt", parsed.occurredAt)
      put("sourceLabel", parsed.sourceLabel)
      put("confidence", parsed.confidence)
      put("rawHash", parsed.rawHash)
      put("status", "Pending")
      put("platform", "android")
      put("ingestionSource", "notification")
      put("createdAt", nowIsoUtc())
    }

    val next = JSONArray()
    next.put(draft)
    for (index in 0 until drafts.length()) next.put(drafts.get(index))
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_DRAFTS, next.toString()).apply()
    return draft
  }

  fun findById(context: Context, draftId: String): JSONObject? {
    val drafts = all(context)
    for (index in 0 until drafts.length()) {
      val draft = drafts.optJSONObject(index) ?: continue
      if (draft.optString("id") == draftId) return draft
    }
    return null
  }

  fun markPosted(context: Context, draftId: String): Boolean {
    return updateStatus(context, draftId, "Posted")
  }

  fun markIgnored(context: Context, draftId: String): Boolean {
    return updateStatus(context, draftId, "Ignored")
  }

  private fun updateStatus(context: Context, draftId: String, status: String): Boolean {
    val drafts = all(context)
    val next = JSONArray()
    var changed = false

    for (index in 0 until drafts.length()) {
      val draft = drafts.optJSONObject(index) ?: continue
      if (draft.optString("id") == draftId) {
        draft.put("status", status)
        changed = true
      }
      next.put(draft)
    }

    if (changed) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_DRAFTS, next.toString()).apply()
    }
    return changed
  }

  fun toWritableArray(array: JSONArray): WritableArray {
    val writable = Arguments.createArray()
    for (index in 0 until array.length()) {
      array.optJSONObject(index)?.let { writable.pushMap(toWritableMap(it)) }
    }
    return writable
  }

  fun toWritableMap(json: JSONObject): WritableMap {
    val map = Arguments.createMap()
    val keys = json.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      val value = json.opt(key)
      when (value) {
        null, JSONObject.NULL -> map.putNull(key)
        is Boolean -> map.putBoolean(key, value)
        is Int -> map.putInt(key, value)
        is Double -> map.putDouble(key, value)
        is JSONObject -> map.putMap(key, toWritableMap(value))
        is JSONArray -> map.putArray(key, toWritableArray(value))
        else -> map.putString(key, value.toString())
      }
    }
    return map
  }

  private fun nowIsoUtc(): String {
    val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    formatter.timeZone = TimeZone.getTimeZone("UTC")
    return formatter.format(Date())
  }
}
