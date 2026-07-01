import { ParsedTransaction } from '../models/ParsedTransaction'
import { TransactionDraft, Platform, IngestionSource } from '../models/TransactionDraft'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function createDraft(
  parsed: ParsedTransaction,
  platform: Platform,
  source: IngestionSource,
): TransactionDraft {
  return {
    id: generateUUID(),
    merchant: parsed.merchant,
    amount: parsed.amount,
    occurredAt: parsed.occurredAt,
    sourceLabel: parsed.sourceLabel,
    confidence: parsed.confidence,
    rawHash: parsed.rawHash,
    status: 'Pending',
    platform,
    ingestionSource: source,
    createdAt: new Date().toISOString(),
  }
}
