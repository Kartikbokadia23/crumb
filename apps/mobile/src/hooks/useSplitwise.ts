import { useSplitwiseContext, SplitwiseConnectionState } from '../context/SplitwiseContext'
import { SplitwiseGroup, SplitwiseUser } from '@crumb/splitwise'
import { TransactionDraft } from '@crumb/core'

interface UseSplitiwseReturn {
  state: SplitwiseConnectionState
  connect: () => Promise<void>
  handleRedirect: (url: string) => Promise<void>
  selectGroup: (id: number) => Promise<void>
  disconnect: () => Promise<void>
  createExpense: (draft: TransactionDraft, memberIds?: number[]) => Promise<void>
  /** Alias for createExpense — used by screens as postDraft */
  postDraft: (draft: TransactionDraft, memberIds?: number[]) => Promise<void>
  isConnected: boolean
  /** True when connected and a group is selected */
  hasGroup: boolean
  selectedGroup: SplitwiseGroup | null
  /** Display name of the selected group, or null */
  groupName: string | null
  currentUser: SplitwiseUser | null
  /** Display name of the authenticated user, or null */
  username: string | null
}

export function useSplitwise(): UseSplitiwseReturn {
  const { state, connect, handleRedirect, selectGroup, disconnect, createExpense } =
    useSplitwiseContext()

  const isConnected = state.type === 'connected'

  const selectedGroup: SplitwiseGroup | null =
    state.type === 'connected' && state.selectedGroupId !== null
      ? (state.groups.find((g) => g.id === state.selectedGroupId) ?? null)
      : null

  const currentUser: SplitwiseUser | null =
    state.type === 'connected' ? state.user : null

  const hasGroup = selectedGroup !== null

  const groupName = selectedGroup?.name ?? null

  const username = currentUser
    ? currentUser.last_name
      ? `${currentUser.first_name} ${currentUser.last_name}`
      : currentUser.first_name
    : null

  return {
    state,
    connect,
    handleRedirect,
    selectGroup,
    disconnect,
    createExpense,
    postDraft: createExpense,
    isConnected,
    hasGroup,
    selectedGroup,
    groupName,
    currentUser,
    username,
  }
}
