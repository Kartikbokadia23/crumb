import { TransactionDraft } from '../models/TransactionDraft'

export function isDuplicate(drafts: TransactionDraft[], rawHash: string): boolean {
  return drafts.some((draft) => draft.rawHash === rawHash)
}
