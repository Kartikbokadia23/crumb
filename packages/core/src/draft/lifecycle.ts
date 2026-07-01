import { TransactionDraft } from '../models/TransactionDraft'

export function markPosted(draft: TransactionDraft): TransactionDraft {
  return { ...draft, status: 'Posted' }
}

export function markIgnored(draft: TransactionDraft): TransactionDraft {
  return { ...draft, status: 'Ignored' }
}

export function isPending(draft: TransactionDraft): boolean {
  return draft.status === 'Pending'
}

export function isPosted(draft: TransactionDraft): boolean {
  return draft.status === 'Posted'
}
