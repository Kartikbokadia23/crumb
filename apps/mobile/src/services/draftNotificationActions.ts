type DraftActionHandlers = {
  onReview: (draftId: string) => void
  onIgnore: (draftId: string) => Promise<void>
}

type RefreshListener = () => void

let handlers: DraftActionHandlers | null = null
const refreshListeners = new Set<RefreshListener>()

export function registerDraftActionHandlers(next: DraftActionHandlers): void {
  handlers = next
}

export function registerDraftRefresh(fn: RefreshListener): () => void {
  refreshListeners.add(fn)
  return () => {
    refreshListeners.delete(fn)
  }
}

export function triggerDraftRefresh(): void {
  refreshListeners.forEach((listener) => listener())
}

export async function handleDraftNotificationAction(
  draftId: string,
  action: 'review' | 'ignore',
): Promise<void> {
  if (!handlers) return

  if (action === 'review') {
    handlers.onReview(draftId)
    return
  }

  await handlers.onIgnore(draftId)
  triggerDraftRefresh()
}
