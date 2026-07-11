import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import Constants from 'expo-constants'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'
import { Typography } from '../theme/typography'
import { useStorage } from '../context/StorageContext'
import { useSplitwiseContext } from '../context/SplitwiseContext'
import { RootStackParamList } from '../navigation/AppNavigator'
import {
  buildNtfyUrl,
  getStoredRelayName,
  setStoredRelayName,
} from '../services/ntfyImportService'

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>

// ---------------------------------------------------------------------------
// Notification permission helpers
// ---------------------------------------------------------------------------

/**
 * Returns whether notification-listener access is granted.
 * On Android this checks the notification listener service permission.
 * On iOS the SMS filter / notification permission cannot be queried the same
 * way, so we always return null (informational only).
 */
async function checkNotificationAccess(): Promise<boolean | null> {
  if (Platform.OS === 'android') {
    try {
      // expo-notifications does not expose NotificationListenerService status;
      // we fall back to checking whether Linking can open settings.
      // Real apps would call a native module here. We return null to indicate
      // "unknown" so the UI shows an "Open Settings" prompt conservatively.
      return null
    } catch {
      return null
    }
  }
  // iOS: cannot programmatically check SMS filter permission
  return null
}

async function openNotificationSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    // ACTION_NOTIFICATION_LISTENER_SETTINGS opens the correct page on Android
    await Linking.sendIntent('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS').catch(
      () => Linking.openSettings(),
    )
  } else {
    await Linking.openSettings()
  }
}

function generateRelayName(): string {
  const timePart = Date.now().toString(36).slice(-6)
  const randomPart = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(2, 8)
  return `${timePart}-${randomPart}`
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function SettingsScreen({ navigation }: Props) {
  const { repo } = useStorage()
  const { state: swState, disconnect } = useSplitwiseContext()

  const [draftCount, setDraftCount] = useState<number | null>(null)
  const [notificationAccess, setNotificationAccess] = useState<boolean | null>(null)
  const [relayName, setRelayName] = useState('')
  const [shortcutOpen, setShortcutOpen] = useState(false)

  // Load draft count on mount
  useEffect(() => {
    repo.listDrafts().then((drafts) => setDraftCount(drafts.length)).catch(() => setDraftCount(0))
  }, [repo])

  // Check notification permission on mount
  useEffect(() => {
    checkNotificationAccess().then(setNotificationAccess)
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'ios') return
    getStoredRelayName().then(setRelayName).catch(() => setRelayName(''))
  }, [])

  const handleOpenNotificationSettings = useCallback(async () => {
    await openNotificationSettings()
  }, [])

  const relayUrl = buildNtfyUrl(relayName)

  const handleRelayAction = useCallback(async () => {
    if (relayUrl) {
      await Clipboard.setStringAsync(relayUrl)
      Alert.alert('Copied', 'Relay URL copied. Paste it in your iOS Shortcut.')
      return
    }

    const generatedName = generateRelayName()
    await setStoredRelayName(generatedName)
    setRelayName(generatedName)
  }, [relayUrl])

  const handleClearDrafts = useCallback(() => {
    Alert.alert(
      'Clear all drafts?',
      'This will permanently delete every draft including posted and ignored ones.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await repo.clearAll()
            setDraftCount(0)
            Alert.alert('Done', 'All drafts have been cleared.')
          },
        },
      ],
    )
  }, [repo])

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      'Disconnect Splitwise?',
      'Your access token and selected group will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnect()
          },
        },
      ],
    )
  }, [disconnect])

  // Derived Splitwise values
  const isConnected = swState.type === 'connected'
  const connectedUserName =
    swState.type === 'connected'
      ? `${swState.user.first_name}${swState.user.last_name ? ' ' + swState.user.last_name : ''}`
      : null
  const selectedGroupName =
    swState.type === 'connected' && swState.selectedGroupId !== null
      ? swState.groups.find((g) => g.id === swState.selectedGroupId)?.name ?? 'Unknown'
      : null

  const appVersion =
    (Constants.expoConfig?.version ?? Constants.manifest?.version ?? null)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ------------------------------------------------------------------ */}
      {/* Section: Notification Access                                        */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Access</Text>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.rowLabel}>Status</Text>
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: notificationAccess === true ? Colors.mint : Colors.ember },
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  { color: notificationAccess === true ? Colors.mint : Colors.ember },
                ]}
              >
                {notificationAccess === true ? 'Enabled' : 'Needs setup'}
              </Text>
            </View>
          </View>

          {Platform.OS === 'android' && notificationAccess !== true && (
            <TouchableOpacity
              style={styles.inlineButton}
              onPress={handleOpenNotificationSettings}
              activeOpacity={0.8}
            >
              <Text style={styles.inlineButtonText}>Open Notification Settings</Text>
            </TouchableOpacity>
          )}

          {Platform.OS === 'ios' && (
            <Text style={styles.infoNote}>
              On iOS, Crumb imports transaction alerts through your personal Shortcuts relay.
            </Text>
          )}
        </View>

        {Platform.OS === 'ios' && (
          <View style={styles.card}>
            <View style={styles.relayHeader}>
              <View>
                <Text style={styles.rowLabel}>iOS Shortcut Relay</Text>
                <Text style={styles.infoNote}>Generate a private relay for this iPhone.</Text>
              </View>
            </View>

            {relayUrl && (
              <View style={styles.urlBox}>
                <Text style={styles.urlLabel}>Relay URL</Text>
                <Text style={styles.urlText} selectable>
                  {relayUrl}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={handleRelayAction}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonPrimaryText}>
                {relayUrl ? 'Copy Shortcut URL' : 'Generate iOS Relay'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setShortcutOpen((open) => !open)}
              activeOpacity={0.75}
            >
              <Text style={styles.accordionTitle}>How to create iOS Shortcut</Text>
              <Text style={styles.chevron}>{shortcutOpen ? '⌃' : '⌄'}</Text>
            </TouchableOpacity>

            {shortcutOpen && (
              <View style={styles.shortcutSteps}>
                {[
                  'Open Shortcuts app',
                  'Create automation for Messages/SMS',
                  'Add Get Contents of URL',
                  'Paste copied ntfy URL',
                  'Method POST',
                  'Body should send SMS text as JSON/text',
                  'Save automation',
                ].map((step, index) => (
                  <Text key={step} style={styles.stepText}>
                    {index + 1}. {step}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Section: Splitwise                                                  */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Splitwise</Text>

        <View style={styles.card}>
          {/* Connection status */}
          <View style={styles.statusRow}>
            <Text style={styles.rowLabel}>Connection</Text>
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? Colors.mint : Colors.ember },
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  { color: isConnected ? Colors.mint : Colors.ember },
                ]}
              >
                {isConnected ? 'Connected' : 'Not connected'}
              </Text>
            </View>
          </View>

          {isConnected && connectedUserName && (
            <View style={styles.detailRow}>
              <Text style={styles.rowLabel}>Account</Text>
              <Text style={styles.rowValue}>{connectedUserName}</Text>
            </View>
          )}

          {isConnected && (
            <View style={styles.detailRow}>
              <Text style={styles.rowLabel}>Group</Text>
              <Text style={styles.rowValue}>
                {selectedGroupName ?? 'Not selected'}
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.cardActions}>
            {isConnected ? (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('GroupSelection')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>Change Group</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonDanger]}
                  onPress={handleDisconnect}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonDangerText}>Disconnect</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => navigation.navigate('SplitwiseConnect')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonPrimaryText}>Connect Splitwise</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Section: Data                                                       */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>

        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>Total drafts</Text>
            <Text style={styles.rowValue}>
              {draftCount === null ? '—' : draftCount}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDanger, styles.fullWidthButton]}
            onPress={handleClearDrafts}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonDangerText}>Clear All Drafts</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Section: Developer                                                  */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developer</Text>

        <TouchableOpacity
          style={styles.navRow}
          onPress={() => navigation.navigate('ManualAlertTester')}
          activeOpacity={0.8}
        >
          <Text style={styles.rowLabel}>Manual Alert Tester</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Section: About                                                      */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>App version</Text>
            <Text style={styles.rowValue}>{appVersion ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Crumb — Receipt Relay for Indian alerts</Text>
        </View>
      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  content: {
    padding: Spacing.screenPadding,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },

  // Section
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.muted,
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },

  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.ink,
  },
  rowValue: {
    fontSize: 14,
    color: Colors.muted,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: Spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  tagline: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoNote: {
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 18,
  },
  relayHeader: {
    gap: 2,
  },
  urlBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.paper,
    padding: Spacing.sm,
    gap: 3,
  },
  urlLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.muted,
  },
  urlText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ink,
  },
  accordionHeader: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
  shortcutSteps: {
    gap: 5,
  },
  stepText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.muted,
  },

  // Card actions
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.border,
    minHeight: 40,
    justifyContent: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: Colors.acid,
  },
  actionButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
  actionButtonDanger: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.ember,
  },
  disabledButton: {
    opacity: 0.45,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
  },
  actionButtonDangerText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ember,
  },
  fullWidthButton: {
    flex: undefined,
  },
  inlineButton: {
    backgroundColor: Colors.paper,
    borderRadius: 10,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
  },
  inlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
  },

  // Nav row (for items that navigate away)
  navRow: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chevron: {
    fontSize: 20,
    color: Colors.muted,
  },
})
