import {
  parseTransactionAlert,
  createDraft,
  isDuplicate,
  TransactionDraft,
  Platform,
  IngestionSource,
} from '@crumb/core'

/**
 * Parse a raw alert string and produce a TransactionDraft, or return null when:
 *   - The merchant cannot be identified (parseTransactionAlert returns null)
 *   - The alert is a duplicate (rawHash already present in existingHashes)
 *
 * @param alertText      Raw SMS or notification body text.
 * @param sourceLabel    Human-readable label for the notification source (e.g. bank name).
 * @param platform       'android' | 'ios'
 * @param source         'notification' | 'sms_filter' | 'manual'
 * @param existingHashes Array of rawHash values already stored, used for deduplication.
 */
export function parseAndCreateDraft(
  alertText: string,
  sourceLabel: string,
  platform: Platform,
  source: IngestionSource,
  existingHashes: string[],
): TransactionDraft | null {
  const parsed = parseTransactionAlert(alertText, sourceLabel)
  if (parsed === null) {
    // Unknown merchant or unparseable alert
    return null
  }

  if (isDuplicate(
    existingHashes.map((rawHash) => ({ rawHash } as TransactionDraft)),
    parsed.rawHash,
  )) {
    // Already ingested
    return null
  }

  return createDraft(parsed, platform, source)
}

/**
 * Format a draft's amount as an Indian-locale currency string.
 * Example: '₹ 1,234.56'
 */
export function formatDraftAmount(draft: TransactionDraft): string {
  return '₹ ' + parseFloat(draft.amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Format a draft's occurredAt timestamp as a human-readable date+time string.
 * Example: '10 Jan, 14:30'
 * Returns 'Date unknown' when occurredAt is null.
 */
export function formatDraftDate(draft: TransactionDraft): string {
  if (!draft.occurredAt) return 'Date unknown'
  const d = new Date(draft.occurredAt)
  return (
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
    ', ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  )
}

/**
 * Return a short display label describing how the draft was ingested.
 */
export function getDraftSourceDisplay(draft: TransactionDraft): string {
  switch (draft.ingestionSource) {
    case 'notification':
      return 'via Notification'
    case 'sms_filter':
      return 'via SMS'
    case 'manual':
      return 'Manual'
  }
}
