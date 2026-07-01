import React, { createContext, useContext, useMemo } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LocalDraftRepository, DraftRepository } from '@crumb/storage'

interface StorageContextValue {
  repo: DraftRepository
}

const StorageContext = createContext<StorageContextValue | null>(null)

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const repo = useMemo(() => new LocalDraftRepository(AsyncStorage), [])

  return (
    <StorageContext.Provider value={{ repo }}>
      {children}
    </StorageContext.Provider>
  )
}

export function useStorage(): StorageContextValue {
  const ctx = useContext(StorageContext)
  if (!ctx) {
    throw new Error('useStorage must be used within a StorageProvider')
  }
  return ctx
}
