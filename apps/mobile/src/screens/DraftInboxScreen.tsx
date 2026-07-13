import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  AppState,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { TransactionDraft } from '@crumb/core'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'
import { Typography } from '../theme/typography'
import { RootStackParamList } from '../navigation/AppNavigator'
import { useDrafts } from '../hooks/useDrafts'
import { useSplitwise } from '../hooks/useSplitwise'
import { DraftCard } from '../components/DraftCard'
import { EmptyState } from '../components/EmptyState'
import {
  checkNotificationListenerPermission,
  openNotificationListenerSettings,
} from '../services/permissionsService'

type Props = NativeStackScreenProps<RootStackParamList, 'DraftInbox'>

/**
 * Main inbox screen — lists all pending TransactionDrafts, shows Splitwise
 * connection status, and lets the user post or ignore each draft.
 */
export function DraftInboxScreen({ navigation }: Props) {
  const { pendingDrafts: drafts, loading, refreshing, refresh, ignoreDraft, markPosted } = useDrafts()
  const { isConnected, hasGroup, username, groupName, postDraft } = useSplitwise()

  const [listenerEnabled, setListenerEnabled] = useState(Platform.OS !== 'android')
  const [postingDraftId, setPostingDraftId] = useState<string | null>(null)

  const syncListenerStatus = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setListenerEnabled(true)
      return
    }

    const enabled = await checkNotificationListenerPermission()
    setListenerEnabled(enabled)
  }, [])

  useEffect(() => {
    void syncListenerStatus()

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncListenerStatus()
        void refresh()
      }
    })

    return () => subscription.remove()
  }, [syncListenerStatus, refresh])

  useEffect(() => {
    if (Platform.OS !== 'ios') return
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void refresh()
    }, 60000)
    return () => clearInterval(interval)
  }, [refresh])

  const handleRefresh = useCallback(async () => {
    await syncListenerStatus()
    await refresh()
  }, [refresh, syncListenerStatus])

  const handleOpenListenerSettings = useCallback(async () => {
    await openNotificationListenerSettings()
    setTimeout(() => {
      void syncListenerStatus()
    }, 800)
  }, [syncListenerStatus])

  // ------------------------------------------------------------------ actions

  const handlePost = useCallback(
    async (draft: TransactionDraft) => {
      if (postingDraftId) return

      if (!isConnected) {
        Alert.alert(
          'Not connected',
          'Connect to Splitwise to post this expense.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Connect',
              onPress: () => navigation.navigate('SplitwiseConnect'),
            },
          ],
        )
        return
      }

      if (!hasGroup) {
        Alert.alert(
          'No group selected',
          'Select a Splitwise group before posting.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Select Group',
              onPress: () => navigation.navigate('GroupSelection'),
            },
          ],
        )
        return
      }

      setPostingDraftId(draft.id)
      try {
        await postDraft(draft)
        await markPosted(draft.id)
        await refresh()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        Alert.alert('Post failed', message)
      } finally {
        setPostingDraftId(null)
      }
    },
    [isConnected, hasGroup, markPosted, navigation, postDraft, postingDraftId, refresh],
  )

  const handleIgnore = useCallback(
    async (draft: TransactionDraft) => {
      try {
        await ignoreDraft(draft.id)
      } catch (err) {
        console.error('[DraftInboxScreen] ignore failed', err)
      }
    },
    [ignoreDraft],
  )

  const handleCardPress = useCallback(
    (draft: TransactionDraft) => {
      navigation.navigate('DraftReview', { draftId: draft.id })
    },
    [navigation],
  )

  // ------------------------------------------------------------------ render

  const renderHeader = () => (
    <View style={styles.headerArea}>
      <View style={styles.titleRow}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>C</Text>
          </View>
          <View>
            <Text style={[Typography.hero, styles.title]}>Crumb</Text>
            <Text style={styles.subtitle}>receipt relay</Text>
          </View>
        </View>
        <View style={styles.titleRight}>
          <StatusPill listening={listenerEnabled} />
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Settings"
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.listenerCard,
          listenerEnabled ? styles.listenerCardReady : styles.listenerCardNeedsAction,
        ]}
        onPress={listenerEnabled ? handleRefresh : handleOpenListenerSettings}
        activeOpacity={0.86}
      >
        <View>
          <Text style={styles.kicker}>{listenerEnabled ? 'READY TO PRINT' : 'ACTION NEEDED'}</Text>
          <Text style={styles.listenerTitle}>
            {listenerEnabled ? 'Listener is on' : 'Enable alert listener'}
          </Text>
          <Text style={styles.listenerCopy}>
            {listenerEnabled
              ? 'Bank and wallet alerts can now become drafts.'
              : 'Allow notification access so Crumb can catch bank alerts.'}
          </Text>
        </View>
        <Text style={styles.listenerAction}>{listenerEnabled ? 'Refresh' : 'Open'}</Text>
      </TouchableOpacity>

      {!isConnected ? (
        <TouchableOpacity
          style={styles.connectStrip}
          onPress={() => navigation.navigate('SplitwiseConnect')}
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.connectStripText}>Connect Splitwise</Text>
            <Text style={styles.connectStripSubtext}>Required before any draft can be posted.</Text>
          </View>
          <Text style={styles.connectStripArrow}>→</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.connectedStrip}>
          <View style={styles.connectedLeft}>
            <View style={styles.connectedDot} />
            <View>
              <Text style={styles.connectedUsername}>{username}</Text>
              {groupName ? (
                <Text style={styles.connectedGroup}>{groupName}</Text>
              ) : (
                <Text style={styles.connectedGroupWarning}>No group selected</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => navigation.navigate('GroupSelection')}
          >
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionHeading}>
        {drafts.length > 0
          ? `${drafts.length} pending ${drafts.length === 1 ? 'expense' : 'expenses'}`
          : 'Receipt stack'}
      </Text>
    </View>
  )

  const renderFooter = () => (
    <TouchableOpacity
      style={styles.testButton}
      onPress={() => navigation.navigate('ManualAlertTester')}
      activeOpacity={0.8}
    >
      <Text style={styles.testButtonText}>Test Alert</Text>
    </TouchableOpacity>
  )

  const renderEmpty = () => (
    <EmptyState
      icon="🧾"
      title="Tray is clear"
      subtitle="New Blinkit, Instamart, Swiggy, Zepto, HDFC, ICICI, or Pluxee alerts will land here."
    />
  )

  const renderDraft = ({ item }: { item: TransactionDraft }) => (
    <DraftCard
      draft={item}
      onPost={handlePost}
      onIgnore={handleIgnore}
      onPress={handleCardPress}
      posting={postingDraftId === item.id}
    />
  )

  return (
    <View style={styles.container}>
      <FlatList
        data={drafts}
        keyExtractor={(item) => item.id}
        renderItem={renderDraft}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={loading ? null : renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.acid}
            colors={[Colors.acid]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

// ------------------------------------------------------------------ helpers

function StatusPill({ listening }: { listening: boolean }) {
  return (
    <View style={[pillStyles.pill, listening ? pillStyles.listening : pillStyles.setup]}>
      <View style={[pillStyles.dot, listening ? pillStyles.dotReady : pillStyles.dotSetup]} />
      <Text style={pillStyles.label}>{listening ? 'LISTENING' : 'SETUP'}</Text>
    </View>
  )
}

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    gap: 5,
  },
  listening: {
    backgroundColor: '#D6FAE8',
  },
  setup: {
    backgroundColor: '#FEF3D0',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotReady: {
    backgroundColor: Colors.mint,
  },
  dotSetup: {
    backgroundColor: '#F0B027',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.0,
    color: Colors.ink,
  },
})

// ------------------------------------------------------------------ styles

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Platform.OS === 'ios' ? 60 : Spacing.lg,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
  headerArea: {
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: Colors.surface,
    fontSize: 20,
    fontWeight: '900',
  },
  title: {
    fontSize: 26,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: -2,
    color: Colors.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingsIcon: {
    fontSize: 16,
  },
  kicker: {
    color: Colors.ember,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  listenerCard: {
    borderRadius: 26,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: Colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  listenerCardReady: {
    backgroundColor: '#E7F7EE',
  },
  listenerCardNeedsAction: {
    backgroundColor: '#FFF2C8',
  },
  listenerTitle: {
    marginTop: 5,
    color: Colors.ink,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  listenerCopy: {
    marginTop: 3,
    color: Colors.muted,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 250,
  },
  listenerAction: {
    color: Colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  connectStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.acid,
    borderRadius: 22,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    shadowColor: Colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  connectStripText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.ink,
  },
  connectStripSubtext: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
    opacity: 0.66,
  },
  connectStripArrow: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.ink,
  },
  connectedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 22,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  connectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  connectedDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.mint,
    flexShrink: 0,
  },
  connectedUsername: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.ink,
  },
  connectedGroup: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
  },
  connectedGroupWarning: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ember,
  },
  changeButton: {
    backgroundColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  changeButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.ink,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  testButton: {
    marginTop: Spacing.lg,
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.muted,
  },
})
