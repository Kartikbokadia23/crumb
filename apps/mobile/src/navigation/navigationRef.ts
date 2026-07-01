import { createNavigationContainerRef } from '@react-navigation/native'
import type { RootStackParamList } from './AppNavigator'

export const navigationRef = createNavigationContainerRef<RootStackParamList>()

export function navigateToDraftReview(draftId: string, autoPost = false): void {
  if (!navigationRef.isReady()) return
  navigationRef.navigate('DraftReview', { draftId, autoPost })
}

export function parseDraftDeepLink(url: string): { draftId: string; autoPost: boolean } | null {
  const match = url.match(/^crumb:\/\/draft\/([^/?#]+)/)
  if (!match) return null
  return { draftId: match[1], autoPost: url.includes('action=post') }
}
