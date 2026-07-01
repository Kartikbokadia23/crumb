import { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import { TransactionDraft } from '@crumb/core'
import { useStorage } from '../context/StorageContext'
import {
  addDraftListener,
  addIgnoredDraftListener,
  addPostedDraftListener,
  clearStoredDrafts as clearAndroidStoredDrafts,
  getStoredDrafts as getAndroidStoredDrafts,
} from '../native/androidNotificationModule'
import {
  clearStoredMessageFilterDrafts,
  getStoredMessageFilterDrafts,
} from '../native/iosMessageFilterModule'
import {
  requestIosNotificationPermission,
  scheduleIosDraftNotification,
} from '../native/iosDraftNotificationModule'
import { registerDraftRefresh } from '../services/draftNotificationActions'
import { pollNtfyDraftCandidates } from '../services/ntfyImportService'
import { parseAndCreateDraft } from '../services/draftService'

export function useDrafts() {
  const { repo } = useStorage()
  const [drafts, setDrafts] = useState<TransactionDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDrafts = useCallback(async () => {
    setDrafts(await repo.listDrafts())
  }, [repo])

  useEffect(() => {
    return registerDraftRefresh(() => {
      void loadDrafts()
    })
  }, [loadDrafts])

  const importNativeDrafts = useCallback(async () => {
    const nativeDrafts =
      Platform.OS === 'android'
        ? await getAndroidStoredDrafts()
        : Platform.OS === 'ios'
          ? await getStoredMessageFilterDrafts()
          : []

    if (nativeDrafts.length === 0) return

    const existing = await repo.listDrafts()
    const existingIds = new Set(existing.map((draft) => draft.id))

    await repo.saveDrafts(nativeDrafts)

    if (Platform.OS === 'android') {
      await clearAndroidStoredDrafts()
    } else if (Platform.OS === 'ios') {
      await clearStoredMessageFilterDrafts()

      const imported = nativeDrafts.filter(
        (draft) => !existingIds.has(draft.id) && draft.status === 'Pending',
      )
      if (imported.length > 0) {
        await requestIosNotificationPermission()
        for (const draft of imported) {
          await scheduleIosDraftNotification(draft)
        }
      }
    }
  }, [repo])

  const importShortcutDrafts = useCallback(async () => {
    if (Platform.OS !== 'ios') return

    const candidates = await pollNtfyDraftCandidates()
    if (candidates.length === 0) return

    const existing = await repo.listDrafts()
    const existingHashes = existing.map((draft) => draft.rawHash)
    const newDrafts: TransactionDraft[] = []

    for (const candidate of candidates) {
      const draft = parseAndCreateDraft(
        candidate.text,
        candidate.sender,
        'ios',
        'sms_filter',
        [...existingHashes, ...newDrafts.map((d) => d.rawHash)],
      )
      if (draft) newDrafts.push(draft)
    }

    if (newDrafts.length === 0) return

    for (const draft of newDrafts) {
      await repo.saveDraft(draft)
    }

    await requestIosNotificationPermission()
    for (const draft of newDrafts) {
      await scheduleIosDraftNotification(draft)
    }
  }, [repo])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await importNativeDrafts()
      await importShortcutDrafts()
      await loadDrafts()
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [importNativeDrafts, importShortcutDrafts, loadDrafts])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addDraft = useCallback(async (draft: TransactionDraft) => {
    await repo.saveDraft(draft)
    await loadDrafts()
  }, [loadDrafts, repo])

  useEffect(() => {
    if (Platform.OS !== 'android') return
    const subscription = addDraftListener((draft) => {
      void addDraft(draft)
    })
    return () => subscription.remove()
  }, [addDraft])

  const updateStatus = useCallback(async (id: string, status: TransactionDraft['status']) => {
    await repo.updateDraftStatus(id, status)
    await loadDrafts()
  }, [loadDrafts, repo])

  useEffect(() => {
    if (Platform.OS !== 'android') return
    const subscription = addIgnoredDraftListener((draftId) => {
      void updateStatus(draftId, 'Ignored')
    })
    return () => subscription.remove()
  }, [updateStatus])

  useEffect(() => {
    if (Platform.OS !== 'android') return
    const subscription = addPostedDraftListener((draftId) => {
      void updateStatus(draftId, 'Posted')
    })
    return () => subscription.remove()
  }, [updateStatus])

  const ignoreDraft = useCallback(async (id: string) => {
    await updateStatus(id, 'Ignored')
  }, [updateStatus])

  const markPosted = useCallback(async (id: string) => {
    await updateStatus(id, 'Posted')
  }, [updateStatus])

  const pendingDrafts = useMemo(() => drafts.filter((draft) => draft.status === 'Pending'), [drafts])

  return {
    drafts,
    pendingDrafts,
    loading,
    refreshing,
    refresh,
    addDraft,
    updateStatus,
    ignoreDraft,
    markPosted,
  }
}
