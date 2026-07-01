import { Linking, Platform } from 'react-native'
import {
  checkNotificationListenerEnabled,
  openNativeNotificationListenerSettings,
  requestPostNotificationsPermission as requestAndroidPostNotificationsPermission,
} from '../native/androidNotificationModule'

export async function checkNotificationListenerPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  return checkNotificationListenerEnabled()
}

export async function openNotificationListenerSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await requestAndroidPostNotificationsPermission().catch(() => false)
      await openNativeNotificationListenerSettings()
      return
    } catch {
      await Linking.openSettings()
      return
    }
  }

  await Linking.openSettings()
}

export async function requestNotificationListenerPermission(): Promise<void> {
  await openNotificationListenerSettings()
}
