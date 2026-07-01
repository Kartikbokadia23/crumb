import { NativeEventEmitter, NativeModules, Platform } from 'react-native'
import type { TransactionDraft } from '@crumb/core'

const MODULE_NAME = 'CrumbDraftNotificationModule'

type NativeCrumbDraftNotificationModule = {
  requestNotificationPermission: () => Promise<boolean>
  scheduleDraftNotification: (draftId: string, amount: string, merchant: string) => Promise<void>
  dismissDraftNotification: (draftId: string) => Promise<void>
  addListener?: (eventName: string) => void
  removeListeners?: (count: number) => void
}

export type DraftNotificationAction = {
  draftId: string
  action: 'review' | 'ignore'
}

const nativeModule: NativeCrumbDraftNotificationModule | null =
  Platform.OS === 'ios' ? NativeModules[MODULE_NAME] ?? null : null

export function isDraftNotificationModuleAvailable(): boolean {
  return Boolean(nativeModule)
}

export async function requestIosNotificationPermission(): Promise<boolean> {
  if (!nativeModule) return false
  return nativeModule.requestNotificationPermission()
}

export async function scheduleIosDraftNotification(draft: TransactionDraft): Promise<void> {
  if (!nativeModule) return
  await nativeModule.scheduleDraftNotification(draft.id, draft.amount, String(draft.merchant))
}

export async function dismissIosDraftNotification(draftId: string): Promise<void> {
  if (!nativeModule) return
  await nativeModule.dismissDraftNotification(draftId)
}

export function addDraftNotificationActionListener(
  callback: (payload: DraftNotificationAction) => void,
): { remove: () => void } {
  if (!nativeModule) return { remove: () => undefined }
  const emitter = new NativeEventEmitter(nativeModule as never)
  return emitter.addListener('draftNotificationAction', (payload: DraftNotificationAction) => {
    callback(payload)
  })
}
