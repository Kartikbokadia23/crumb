import { TransactionDraft, DraftStatus } from '@crumb/core'
import { DraftRepository } from './DraftRepository'

interface AsyncStorageInterface {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

const STORAGE_KEY = 'crumb_drafts'

function normalizeAmount(amount: string): string {
  const parsed = Number(amount.replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed.toFixed(2) : amount.trim()
}

function semanticDraftKey(draft: TransactionDraft): string | null {
  if (!draft.occurredAt) return null
  const occurredAtDate = new Date(draft.occurredAt)
  if (Number.isNaN(occurredAtDate.getTime())) return null
  const occurredAt = occurredAtDate.toISOString()
  return [
    draft.merchant.trim().toLowerCase(),
    normalizeAmount(draft.amount),
    occurredAt,
  ].join('|')
}

function draftDedupKeys(draft: TransactionDraft): string[] {
  const keys = [`hash:${draft.rawHash}`]
  const semanticKey = semanticDraftKey(draft)
  if (semanticKey) keys.push(`transaction:${semanticKey}`)
  return keys
}

export class LocalDraftRepository implements DraftRepository {
  private writeQueue: Promise<void> = Promise.resolve()

  constructor(private readonly storage: AsyncStorageInterface) {}

  private async loadAll(): Promise<TransactionDraft[]> {
    const raw = await this.storage.getItem(STORAGE_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed as TransactionDraft[]
    } catch {
      return []
    }
  }

  private async saveAll(drafts: TransactionDraft[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(drafts))
  }

  private async withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(operation, operation)
    this.writeQueue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  async listDrafts(): Promise<TransactionDraft[]> {
    const drafts = await this.loadAll()
    return drafts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  async getPendingDrafts(): Promise<TransactionDraft[]> {
    const drafts = await this.loadAll()
    return drafts
      .filter((d) => d.status === 'Pending')
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
  }

  async getDraft(id: string): Promise<TransactionDraft | null> {
    const drafts = await this.loadAll()
    return drafts.find((d) => d.id === id) ?? null
  }

  async saveDraft(draft: TransactionDraft): Promise<void> {
    await this.withWriteLock(async () => {
      const drafts = await this.loadAll()
      const existingKeys = new Set(drafts.flatMap(draftDedupKeys))
      const alreadyExists = draftDedupKeys(draft).some((key) => existingKeys.has(key))
      if (!alreadyExists) {
        drafts.push(draft)
        await this.saveAll(drafts)
      }
    })
  }

  async saveDrafts(incoming: TransactionDraft[]): Promise<void> {
    await this.withWriteLock(async () => {
      const existing = await this.loadAll()
      const seenKeys = new Set(existing.flatMap(draftDedupKeys))
      const newDrafts: TransactionDraft[] = []

      for (const draft of incoming) {
        const keys = draftDedupKeys(draft)
        if (keys.some((key) => seenKeys.has(key))) continue
        newDrafts.push(draft)
        keys.forEach((key) => seenKeys.add(key))
      }

      if (newDrafts.length > 0) {
        await this.saveAll([...existing, ...newDrafts])
      }
    })
  }

  async updateDraftStatus(id: string, status: DraftStatus): Promise<void> {
    await this.withWriteLock(async () => {
      const drafts = await this.loadAll()
      const index = drafts.findIndex((d) => d.id === id)
      if (index === -1) {
        throw new Error(`Draft not found: ${id}`)
      }
      drafts[index] = { ...drafts[index], status }
      await this.saveAll(drafts)
    })
  }

  async deleteDraft(id: string): Promise<void> {
    await this.withWriteLock(async () => {
      const drafts = await this.loadAll()
      const filtered = drafts.filter((d) => d.id !== id)
      await this.saveAll(filtered)
    })
  }

  async clearAll(): Promise<void> {
    await this.withWriteLock(async () => {
      await this.storage.removeItem(STORAGE_KEY)
    })
  }

  async hasDraftWithHash(rawHash: string): Promise<boolean> {
    const drafts = await this.loadAll()
    return drafts.some((d) => d.rawHash === rawHash)
  }
}
