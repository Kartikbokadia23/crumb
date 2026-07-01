import { TransactionDraft, DraftStatus } from '@crumb/core'
import { DraftRepository } from './DraftRepository'

interface AsyncStorageInterface {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

const STORAGE_KEY = 'crumb_drafts'

export class LocalDraftRepository implements DraftRepository {
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
    const drafts = await this.loadAll()
    const alreadyExists = drafts.some((d) => d.rawHash === draft.rawHash)
    if (!alreadyExists) {
      drafts.push(draft)
      await this.saveAll(drafts)
    }
  }

  async saveDrafts(incoming: TransactionDraft[]): Promise<void> {
    const existing = await this.loadAll()
    const existingHashes = new Set(existing.map((d) => d.rawHash))
    const newDrafts = incoming.filter((d) => !existingHashes.has(d.rawHash))
    if (newDrafts.length > 0) {
      await this.saveAll([...existing, ...newDrafts])
    }
  }

  async updateDraftStatus(id: string, status: DraftStatus): Promise<void> {
    const drafts = await this.loadAll()
    const index = drafts.findIndex((d) => d.id === id)
    if (index === -1) {
      throw new Error(`Draft not found: ${id}`)
    }
    drafts[index] = { ...drafts[index], status }
    await this.saveAll(drafts)
  }

  async deleteDraft(id: string): Promise<void> {
    const drafts = await this.loadAll()
    const filtered = drafts.filter((d) => d.id !== id)
    await this.saveAll(filtered)
  }

  async clearAll(): Promise<void> {
    await this.storage.removeItem(STORAGE_KEY)
  }

  async hasDraftWithHash(rawHash: string): Promise<boolean> {
    const drafts = await this.loadAll()
    return drafts.some((d) => d.rawHash === rawHash)
  }
}
