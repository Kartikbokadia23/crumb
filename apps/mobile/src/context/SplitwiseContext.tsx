import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import {
  SplitwiseClient,
  SplitwiseAuth,
  SplitwiseConfig,
  SplitwiseUser,
  SplitwiseGroup,
  isSplitwiseConfigured,
} from '@crumb/splitwise'
import { TransactionDraft } from '@crumb/core'
import { Platform } from 'react-native'
import { saveSplitwiseCredentials } from '../native/androidNotificationModule'

// ---------- State shape ----------

export type SplitwiseConnectionState =
  | { type: 'not_configured' }
  | { type: 'disconnected' }
  | { type: 'connecting' }
  | { type: 'connected'; user: SplitwiseUser; groups: SplitwiseGroup[]; selectedGroupId: number | null }
  | { type: 'error'; message: string }

// ---------- Secure store keys ----------

const KEY_ACCESS_TOKEN = 'splitwise_access_token'
const KEY_REFRESH_TOKEN = 'splitwise_refresh_token'
const KEY_SELECTED_GROUP = 'splitwise_selected_group_id'

// ---------- Context interface ----------

interface SplitwiseContextValue {
  state: SplitwiseConnectionState
  connect: () => Promise<void>
  handleRedirect: (url: string) => Promise<void>
  selectGroup: (id: number) => Promise<void>
  disconnect: () => Promise<void>
  createExpense: (draft: TransactionDraft) => Promise<void>
}

const SplitwiseContext = createContext<SplitwiseContextValue | null>(null)

// ---------- Provider ----------

export function SplitwiseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SplitwiseConnectionState>({ type: 'disconnected' })

  // Build config from Expo constants
  const config = useMemo<SplitwiseConfig>(() => {
    const extra = Constants.expoConfig?.extra as
      | { SPLITWISE_CLIENT_ID?: string; SPLITWISE_CLIENT_SECRET?: string; SPLITWISE_REDIRECT_URI?: string }
      | undefined
    return {
      clientId: extra?.SPLITWISE_CLIENT_ID ?? '',
      clientSecret: extra?.SPLITWISE_CLIENT_SECRET ?? '',
      redirectUri: extra?.SPLITWISE_REDIRECT_URI ?? 'crumb://splitwise-auth',
    }
  }, [])

  const client = useMemo(() => new SplitwiseClient(config), [config])
  const auth = useMemo(() => new SplitwiseAuth(config), [config])

  // ---------- Restore session on mount ----------

  useEffect(() => {
    if (!isSplitwiseConfigured(config)) {
      setState({ type: 'not_configured' })
      return
    }

    ;(async () => {
      try {
        const accessToken = await SecureStore.getItemAsync(KEY_ACCESS_TOKEN)
        if (!accessToken) {
          setState({ type: 'disconnected' })
          return
        }

        setState({ type: 'connecting' })
        const [user, groups] = await Promise.all([
          client.getCurrentUser(accessToken),
          client.getGroups(accessToken),
        ])

        const savedGroupId = await SecureStore.getItemAsync(KEY_SELECTED_GROUP)
        const selectedGroupId = savedGroupId ? parseInt(savedGroupId, 10) : null

        setState({ type: 'connected', user, groups, selectedGroupId })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Session restore failed'
        console.warn('SplitwiseContext: session restore error', message)
        setState({ type: 'disconnected' })
      }
    })()
  }, [config, client])

  // ---------- connect ----------

  const connect = useCallback(async () => {
    if (!isSplitwiseConfigured(config)) {
      setState({ type: 'not_configured' })
      return
    }
    // The actual OAuth flow is browser-based; the caller (SplitwiseConnect screen)
    // opens the browser. This is a no-op placeholder so the API is consistent.
    setState({ type: 'connecting' })
  }, [config])

  // ---------- handleRedirect ----------

  const handleRedirect = useCallback(
    async (url: string) => {
      const code = auth.parseRedirectCode(url)
      if (!code) return

      setState({ type: 'connecting' })
      try {
        const tokenResp = await client.exchangeCode(code)
        const { access_token, refresh_token } = tokenResp

        await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, access_token)
        if (refresh_token) {
          await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, refresh_token)
        }

        const [user, groups] = await Promise.all([
          client.getCurrentUser(access_token),
          client.getGroups(access_token),
        ])

        const savedGroupId = await SecureStore.getItemAsync(KEY_SELECTED_GROUP)
        const selectedGroupId = savedGroupId ? parseInt(savedGroupId, 10) : null

        if (Platform.OS === 'android' && selectedGroupId !== null) {
          void saveSplitwiseCredentials(access_token, selectedGroupId)
        }

        setState({ type: 'connected', user, groups, selectedGroupId })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'OAuth exchange failed'
        setState({ type: 'error', message })
      }
    },
    [auth, client],
  )

  // ---------- selectGroup ----------

  const selectGroup = useCallback(async (id: number) => {
    await SecureStore.setItemAsync(KEY_SELECTED_GROUP, String(id))
    if (Platform.OS === 'android') {
      const token = await SecureStore.getItemAsync(KEY_ACCESS_TOKEN)
      if (token) void saveSplitwiseCredentials(token, id)
    }
    setState((prev) => {
      if (prev.type !== 'connected') return prev
      return { ...prev, selectedGroupId: id }
    })
  }, [])

  // ---------- disconnect ----------

  const disconnect = useCallback(async () => {
    await SecureStore.deleteItemAsync(KEY_ACCESS_TOKEN)
    await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN)
    await SecureStore.deleteItemAsync(KEY_SELECTED_GROUP)
    setState({ type: 'disconnected' })
  }, [])

  // ---------- createExpense ----------

  const createExpense = useCallback(
    async (draft: TransactionDraft) => {
      if (state.type !== 'connected' || state.selectedGroupId === null) {
        throw new Error('Not connected to Splitwise or no group selected')
      }

      const accessToken = await SecureStore.getItemAsync(KEY_ACCESS_TOKEN)
      if (!accessToken) {
        throw new Error('No access token found. Please reconnect.')
      }

      const result = await client.createEqualExpense(
        accessToken,
        state.selectedGroupId,
        draft.merchant,
        draft.amount,
      )

      if (Object.keys(result.errors).length > 0) {
        const msgs = Object.values(result.errors).flat().join('; ')
        throw new Error(`Splitwise error: ${msgs}`)
      }
    },
    [state, client],
  )

  // ---------- Context value ----------

  const value = useMemo<SplitwiseContextValue>(
    () => ({ state, connect, handleRedirect, selectGroup, disconnect, createExpense }),
    [state, connect, handleRedirect, selectGroup, disconnect, createExpense],
  )

  return (
    <SplitwiseContext.Provider value={value}>
      {children}
    </SplitwiseContext.Provider>
  )
}

// ---------- Hook ----------

export function useSplitwiseContext(): SplitwiseContextValue {
  const ctx = useContext(SplitwiseContext)
  if (!ctx) {
    throw new Error('useSplitwiseContext must be used within a SplitwiseProvider')
  }
  return ctx
}
