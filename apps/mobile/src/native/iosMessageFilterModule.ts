import { NativeModules, Platform } from 'react-native'
import type { TransactionDraft } from '@crumb/core'

type NativeCrumbMessageFilterModule = {
  getStoredDrafts: () => Promise<TransactionDraft[]>
  clearStoredDrafts: () => Promise<void>
}

const nativeModule: NativeCrumbMessageFilterModule | null =
  Platform.OS === 'ios' ? NativeModules.CrumbMessageFilterModule ?? null : null

export function isMessageFilterModuleAvailable(): boolean {
  return Boolean(nativeModule)
}

function normalizeDraft(value: unknown): TransactionDraft | null {
  if (!value || typeof value !== 'object') return null
  const draft = value as Partial<TransactionDraft>
  if (!draft.id || !draft.amount || !draft.rawHash || !draft.createdAt) return null

  return {
    id: String(draft.id),
    merchant: draft.merchant ?? 'Unknown',
    amount: String(draft.amount),
    occurredAt: draft.occurredAt ?? null,
    sourceLabel: draft.sourceLabel ?? 'Messages',
    confidence: draft.confidence ?? 'Low',
    rawHash: String(draft.rawHash),
    status: draft.status ?? 'Pending',
    platform: 'ios',
    ingestionSource: 'sms_filter',
    createdAt: String(draft.createdAt),
  }
}

export async function getStoredMessageFilterDrafts(): Promise<TransactionDraft[]> {
  if (!nativeModule) return []
  const drafts = await nativeModule.getStoredDrafts()
  return drafts.map(normalizeDraft).filter((draft): draft is TransactionDraft => draft !== null)
}

export async function clearStoredMessageFilterDrafts(): Promise<void> {
  if (!nativeModule) return
  await nativeModule.clearStoredDrafts()
}
