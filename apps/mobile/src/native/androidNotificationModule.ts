import { NativeEventEmitter, NativeModules, Platform } from 'react-native'
import type { TransactionDraft } from '@crumb/core'

const MODULE_NAME = 'CrumbNotificationModule'

type NativeCrumbNotificationModule = {
  isNotificationListenerEnabled: () => Promise<boolean>
  openNotificationListenerSettings?: () => Promise<boolean | void>
  requestPostNotificationsPermission?: () => Promise<boolean>
  getStoredDrafts?: () => Promise<TransactionDraft[]>
  clearStoredDrafts?: () => Promise<void>
  getDraftsFromStorage?: () => Promise<string>
  clearDraftsFromStorage?: () => Promise<void>
  saveSplitwiseCredentials?: (accessToken: string, groupId: number) => Promise<void>
  addListener?: (eventName: string) => void
  removeListeners?: (count: number) => void
}

const nativeModule: NativeCrumbNotificationModule | null =
  Platform.OS === 'android' ? NativeModules[MODULE_NAME] ?? null : null

export function isModuleAvailable(): boolean {
  return Boolean(nativeModule)
}

export async function checkNotificationListenerEnabled(): Promise<boolean> {
  if (!nativeModule) return false
  return nativeModule.isNotificationListenerEnabled()
}

export async function requestPostNotificationsPermission(): Promise<boolean> {
  if (!nativeModule?.requestPostNotificationsPermission) return false
  return nativeModule.requestPostNotificationsPermission()
}

export async function openNativeNotificationListenerSettings(): Promise<void> {
  if (!nativeModule?.openNotificationListenerSettings) return
  await nativeModule.openNotificationListenerSettings()
}

export async function getStoredDrafts(): Promise<TransactionDraft[]> {
  if (!nativeModule) return []
  if (nativeModule.getStoredDrafts) {
    return nativeModule.getStoredDrafts()
  }
  if (nativeModule.getDraftsFromStorage) {
    const raw = await nativeModule.getDraftsFromStorage()
    return JSON.parse(raw) as TransactionDraft[]
  }
  return []
}

export async function clearStoredDrafts(): Promise<void> {
  if (nativeModule?.clearStoredDrafts) {
    await nativeModule.clearStoredDrafts()
    return
  }
  if (nativeModule?.clearDraftsFromStorage) {
    await nativeModule.clearDraftsFromStorage()
  }
}

export function addDraftListener(callback: (draft: TransactionDraft) => void): { remove: () => void } {
  if (!nativeModule) return { remove: () => undefined }
  const emitter = new NativeEventEmitter(nativeModule as never)
  return emitter.addListener('onNewDraft', callback)
}

export function addIgnoredDraftListener(callback: (draftId: string) => void): { remove: () => void } {
  if (!nativeModule) return { remove: () => undefined }
  const emitter = new NativeEventEmitter(nativeModule as never)
  return emitter.addListener('onDraftIgnored', callback)
}

export function addPostedDraftListener(callback: (draftId: string) => void): { remove: () => void } {
  if (!nativeModule) return { remove: () => undefined }
  const emitter = new NativeEventEmitter(nativeModule as never)
  return emitter.addListener('onDraftPosted', callback)
}

export async function saveSplitwiseCredentials(accessToken: string, groupId: number): Promise<void> {
  await nativeModule?.saveSplitwiseCredentials?.(accessToken, groupId)
}
