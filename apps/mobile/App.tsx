import React, { useEffect } from 'react'
import { Linking } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { AppNavigator } from './src/navigation/AppNavigator'
import { flushPendingNavigation, navigationRef } from './src/navigation/navigationRef'
import { StorageProvider, useStorage } from './src/context/StorageContext'
import { SplitwiseProvider, useSplitwiseContext } from './src/context/SplitwiseContext'
import { DraftNotificationHandler } from './src/services/DraftNotificationHandler'
import { parseAndCreateDraft } from './src/services/draftService'
import { triggerDraftRefresh } from './src/services/draftNotificationActions'

/**
 * Inner component that can access SplitwiseContext to handle deep links.
 * Placed inside SplitwiseProvider so it can call handleRedirect.
 */
function DeepLinkHandler() {
  const { handleRedirect } = useSplitwiseContext()
  const { repo } = useStorage()

  useEffect(() => {
    const ingestFromShortcut = async (url: string) => {
      const queryIndex = url.indexOf('?')
      if (queryIndex === -1) return
      const params = new Map<string, string>()
      for (const pair of url.slice(queryIndex + 1).split('&')) {
        const [key, value] = pair.split('=')
        if (key && value) params.set(key, decodeURIComponent(value.replace(/\+/g, ' ')))
      }

      const text = params.get('text')
      if (!text) return

      const sender = params.get('sender') ?? 'Messages'
      const existing = await repo.listDrafts()
      const draft = parseAndCreateDraft(
        text,
        sender,
        'ios',
        'sms_filter',
        existing.map((d) => d.rawHash),
      )
      if (draft) {
        await repo.saveDraft(draft)
        triggerDraftRefresh()
      }
    }

    const handleUrl = ({ url }: { url: string }) => {
      if (url.startsWith('crumb://splitwise-auth')) {
        handleRedirect(url)
      } else if (url.startsWith('crumb://add-draft')) {
        void ingestFromShortcut(url)
      }
    }

    // Handle deep links received while app is open
    const subscription = Linking.addEventListener('url', handleUrl)

    // Handle deep link that launched the app from a cold start
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url })
    })

    return () => {
      subscription.remove()
    }
  }, [handleRedirect, repo])

  return null
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StorageProvider>
        <SplitwiseProvider>
          <NavigationContainer ref={navigationRef} onReady={flushPendingNavigation}>
            <DeepLinkHandler />
            <DraftNotificationHandler />
            <AppNavigator />
            <StatusBar style="dark" />
          </NavigationContainer>
        </SplitwiseProvider>
      </StorageProvider>
    </SafeAreaProvider>
  )
}
