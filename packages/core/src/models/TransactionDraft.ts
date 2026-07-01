import { Merchant, Confidence } from './ParsedTransaction'

export type DraftStatus = 'Pending' | 'Posted' | 'Ignored'
export type Platform = 'android' | 'ios'
export type IngestionSource = 'notification' | 'sms_filter' | 'manual'

export interface TransactionDraft {
  id: string
  merchant: Merchant
  amount: string
  occurredAt: string | null
  sourceLabel: string
  confidence: Confidence
  rawHash: string
  status: DraftStatus
  platform: Platform
  ingestionSource: IngestionSource
  createdAt: string
}
