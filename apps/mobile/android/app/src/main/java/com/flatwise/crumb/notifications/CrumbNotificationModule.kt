package com.flatwise.crumb.notifications

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject

class CrumbNotificationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    var instance: CrumbNotificationModule? = null
      private set
  }

  init {
    instance = this
  }

  override fun getName(): String = "CrumbNotificationModule"

  @ReactMethod
  fun isNotificationListenerEnabled(promise: Promise) {
    val enabledListeners = Settings.Secure.getString(
      reactContext.contentResolver,
      "enabled_notification_listeners"
    )
    val packageName = reactContext.packageName
    val enabled = enabledListeners
      ?.split(":")
      ?.any {
        ComponentName.unflattenFromString(it)?.packageName == packageName
      } ?: false
    promise.resolve(enabled)
  }

  @ReactMethod
  fun requestPostNotificationsPermission(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      promise.resolve(true)
      return
    }

    val granted = ContextCompat.checkSelfPermission(
      reactContext,
      Manifest.permission.POST_NOTIFICATIONS
    ) == PackageManager.PERMISSION_GRANTED

    if (granted) {
      promise.resolve(true)
      return
    }

    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.resolve(false)
      return
    }

    ActivityCompat.requestPermissions(
      activity,
      arrayOf(Manifest.permission.POST_NOTIFICATIONS),
      4700
    )
    promise.resolve(false)
  }

  @ReactMethod
  fun openNotificationListenerSettings(promise: Promise) {
    val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    reactContext.startActivity(intent)
    promise.resolve(true)
  }

  @ReactMethod
  fun getStoredDrafts(promise: Promise) {
    promise.resolve(CrumbNativeDraftStore.toWritableArray(CrumbNativeDraftStore.all(reactContext)))
  }

  @ReactMethod
  fun clearStoredDrafts(promise: Promise) {
    CrumbNativeDraftStore.clear(reactContext)
    promise.resolve(null)
  }

  @ReactMethod
  fun getDraftsFromStorage(promise: Promise) {
    promise.resolve(CrumbNativeDraftStore.all(reactContext).toString())
  }

  @ReactMethod
  fun clearDraftsFromStorage(promise: Promise) {
    CrumbNativeDraftStore.clear(reactContext)
    promise.resolve(null)
  }

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Int) = Unit

  fun emitNewDraft(draft: JSONObject) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onNewDraft", CrumbNativeDraftStore.toWritableMap(draft))
  }

  @ReactMethod
  fun saveSplitwiseCredentials(accessToken: String, groupId: Double, promise: Promise) {
    CrumbSplitwiseStore.saveCredentials(reactContext, accessToken, groupId.toInt())
    promise.resolve(null)
  }

  fun emitIgnoredDraft(draftId: String) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onDraftIgnored", draftId)
  }

  fun emitPostedDraft(draftId: String) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onDraftPosted", draftId)
  }
}
