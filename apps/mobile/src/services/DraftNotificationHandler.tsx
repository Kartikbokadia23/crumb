import React, { useEffect } from 'react'
import { Linking, Platform } from 'react-native'
import { useStorage } from '../context/StorageContext'
import {
  addDraftNotificationActionListener,
  dismissIosDraftNotification,
} from '../native/iosDraftNotificationModule'
import {
  handleDraftNotificationAction,
  registerDraftActionHandlers,
} from '../services/draftNotificationActions'
import { navigateToDraftReview, parseDraftDeepLink } from '../navigation/navigationRef'

export function DraftNotificationHandler() {
  const { repo } = useStorage()

  useEffect(() => {
    registerDraftActionHandlers({
      onReview: (draftId) => {
        navigateToDraftReview(draftId)
      },
      onIgnore: async (draftId) => {
        await repo.updateDraftStatus(draftId, 'Ignored')
        if (Platform.OS === 'ios') {
          await dismissIosDraftNotification(draftId)
        }
      },
    })
  }, [repo])

  useEffect(() => {
    if (Platform.OS !== 'ios') return

    const subscription = addDraftNotificationActionListener(({ draftId, action }) => {
      void handleDraftNotificationAction(draftId, action)
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    const openDraftFromUrl = (url: string) => {
      const result = parseDraftDeepLink(url)
      if (result) {
        navigateToDraftReview(result.draftId, result.autoPost)
      }
    }

    const subscription = Linking.addEventListener('url', ({ url }) => {
      openDraftFromUrl(url)
    })

    Linking.getInitialURL().then((url) => {
      if (url) openDraftFromUrl(url)
    })

    return () => subscription.remove()
  }, [])

  return null
}
