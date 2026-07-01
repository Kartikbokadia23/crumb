import { TransactionDraft, DraftStatus } from '@crumb/core'

export interface DraftRepository {
  listDrafts(): Promise<TransactionDraft[]>
  getPendingDrafts(): Promise<TransactionDraft[]>
  getDraft(id: string): Promise<TransactionDraft | null>
  saveDraft(draft: TransactionDraft): Promise<void>
  saveDrafts(drafts: TransactionDraft[]): Promise<void>
  updateDraftStatus(id: string, status: DraftStatus): Promise<void>
  deleteDraft(id: string): Promise<void>
  clearAll(): Promise<void>
  hasDraftWithHash(rawHash: string): Promise<boolean>
}
