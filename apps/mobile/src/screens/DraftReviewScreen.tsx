import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { TransactionDraft } from '@crumb/core'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'
import { Typography } from '../theme/typography'
import { RootStackParamList } from '../navigation/AppNavigator'
import { useDrafts } from '../hooks/useDrafts'
import { useSplitwise } from '../hooks/useSplitwise'
import { AmountText } from '../components/AmountText'
import { MerchantBadge } from '../components/MerchantBadge'
import { ConfidenceBadge } from '../components/ConfidenceBadge'
import { PrimaryButton } from '../components/PrimaryButton'

type Props = NativeStackScreenProps<RootStackParamList, 'DraftReview'>

export function DraftReviewScreen({ route, navigation }: Props) {
  const { draftId, autoPost } = route.params
  const { drafts, loading, ignoreDraft, markPosted } = useDrafts()
  const { isConnected, hasGroup, groupName, postDraft } = useSplitwise()

  const [draft, setDraft] = useState<TransactionDraft | null | undefined>(undefined)
  const [posting, setPosting] = useState(false)
  const autoPostTriggered = React.useRef(false)

  // Resolve draft from the hook once data is loaded
  useEffect(() => {
    if (!loading) {
      const found = drafts.find((d) => d.id === draftId) ?? null
      setDraft(found)
    }
  }, [draftId, drafts, loading])

  // ------------------------------------------------------------------ actions

  const postNow = useCallback(async (d: TransactionDraft) => {
    setPosting(true)
    try {
      await postDraft(d)
      await markPosted(d.id)
      navigation.goBack()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      Alert.alert('Post failed', message)
    } finally {
      setPosting(false)
    }
  }, [postDraft, markPosted, navigation])

  // Auto-post when opened from "Yes" notification action
  useEffect(() => {
    if (!autoPost || !draft || autoPostTriggered.current) return
    if (!isConnected || !hasGroup) return
    autoPostTriggered.current = true
    void postNow(draft)
  }, [autoPost, draft, isConnected, hasGroup, postNow])

  const handlePost = useCallback(async () => {
    if (!draft) return

    if (!isConnected) {
      Alert.alert(
        'Not connected',
        'Connect to Splitwise and select a group before posting.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect', onPress: () => navigation.navigate('SplitwiseConnect') },
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
          { text: 'Select Group', onPress: () => navigation.navigate('GroupSelection') },
        ],
      )
      return
    }

    Alert.alert(
      'Post expense?',
      `Post ₹${draft.amount} at ${draft.merchant} to ${groupName ?? 'Splitwise'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Post', onPress: () => void postNow(draft) },
      ],
    )
  }, [draft, isConnected, hasGroup, postNow, groupName, navigation])

  const handleIgnore = useCallback(async () => {
    if (!draft) return
    Alert.alert('Ignore expense?', 'This draft will be marked as ignored.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Ignore',
        style: 'destructive',
        onPress: async () => {
          await ignoreDraft(draft.id)
          navigation.goBack()
        },
      },
    ])
  }, [draft, ignoreDraft, navigation])

  // ------------------------------------------------------------------ loading / not-found

  if (loading || draft === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.acid} size="large" />
      </View>
    )
  }

  if (draft === null) {
    return (
      <View style={styles.centered}>
        <Text style={[Typography.body, { color: Colors.muted }]}>Draft not found.</Text>
      </View>
    )
  }

  // ------------------------------------------------------------------ derived values

  const isPending = draft.status === 'Pending'
  const rawHashShort = draft.rawHash.slice(-8).toUpperCase()
  const dateDisplay = formatDate(draft.occurredAt ?? draft.createdAt)
  const resolvedGroupName = groupName ?? null

  const statusBadgeColor =
    draft.status === 'Posted'
      ? Colors.mint
      : draft.status === 'Ignored'
      ? Colors.muted
      : Colors.ink

  // ------------------------------------------------------------------ render

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Amount hero card */}
      <View style={styles.heroCard}>
        <AmountText amount={draft.amount} size="large" style={styles.heroAmount} />
        <MerchantBadge merchant={draft.merchant} style={styles.heroMerchant} />
      </View>

      {/* Details section */}
      <View style={styles.detailsCard}>
        <SectionLabel text="Details" />
        <DetailRow label="Source" value={draft.sourceLabel} />
        <Divider />
        <DetailRow label="Date" value={dateDisplay} />
        <Divider />
        <DetailRow
          label="Confidence"
          value={<ConfidenceBadge confidence={draft.confidence} />}
        />
        <Divider />
        <DetailRow label="Status" value={draft.status} valueColor={statusBadgeColor} />
        {resolvedGroupName && (
          <>
            <Divider />
            <DetailRow label="Group" value={resolvedGroupName} />
          </>
        )}
        <Divider />
        <DetailRow
          label="Dedup ref"
          value={`#${rawHashShort}`}
          valueStyle={styles.monoValue}
        />
      </View>

      {/* Non-pending status badge */}
      {!isPending && (
        <View style={styles.statusBadgeContainer}>
          <View style={[styles.statusBadge, { borderColor: statusBadgeColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusBadgeColor }]}>
              {draft.status}
            </Text>
          </View>
        </View>
      )}

      {/* Splitwise warning when connected but no group */}
      {isPending && isConnected && !hasGroup && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠</Text>
          <Text style={styles.warningText}>
            Select a group first before posting to Splitwise.
          </Text>
        </View>
      )}

      {/* Action buttons — only shown for pending drafts */}
      {isPending && (
        <View style={styles.actions}>
          <PrimaryButton
            title="Send to Splitwise"
            onPress={handlePost}
            variant="primary"
            loading={posting}
            disabled={posting}
            style={styles.postButton}
          />
          <PrimaryButton
            title="Ignore"
            onPress={handleIgnore}
            variant="danger"
            disabled={posting}
            style={styles.ignoreButton}
          />
        </View>
      )}
    </ScrollView>
  )
}

// ------------------------------------------------------------------ sub-components

function SectionLabel({ text }: { text: string }) {
  return <Text style={sectionStyles.label}>{text}</Text>
}

const sectionStyles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.muted,
    marginBottom: Spacing.xs,
  },
})

interface DetailRowProps {
  label: string
  value: string | React.ReactNode
  valueColor?: string
  valueStyle?: object
}

function DetailRow({ label, value, valueColor, valueStyle }: DetailRowProps) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      {typeof value === 'string' ? (
        <Text
          style={[rowStyles.value, valueColor ? { color: valueColor } : undefined, valueStyle]}
          numberOfLines={2}
        >
          {value}
        </Text>
      ) : (
        <View style={rowStyles.nodeValue}>{value}</View>
      )}
    </View>
  )
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
    letterSpacing: 0.3,
    flexShrink: 0,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.ink,
    textAlign: 'right',
    flexShrink: 1,
  },
  nodeValue: {
    alignItems: 'flex-end',
  },
})

function Divider() {
  return <View style={{ height: 1, backgroundColor: Colors.border }} />
}

// ------------------------------------------------------------------ helpers

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// ------------------------------------------------------------------ styles

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  content: {
    padding: Spacing.screenPadding,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Hero card
  heroCard: {
    backgroundColor: Colors.ink,
    borderRadius: 20,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.acid,
    letterSpacing: -1,
  },
  heroMerchant: {
    // override dot color to surface for contrast
  },
  // Details card
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  monoValue: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: Colors.muted,
  },
  // Status badge (non-pending)
  statusBadgeContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  statusBadge: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  // Warning banner
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3D0',
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  warningIcon: {
    fontSize: 16,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.ink,
    flex: 1,
  },
  // Actions
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  postButton: {
    // full width via default flex
  },
  ignoreButton: {
    // full width
  },
})
