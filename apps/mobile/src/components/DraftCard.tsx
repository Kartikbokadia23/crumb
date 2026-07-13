import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { TransactionDraft } from '@crumb/core'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'
import { MerchantBadge } from './MerchantBadge'
import { ConfidenceBadge } from './ConfidenceBadge'
import { AmountText } from './AmountText'
import { PrimaryButton } from './PrimaryButton'

interface DraftCardProps {
  draft: TransactionDraft
  onPost: (draft: TransactionDraft) => void
  onIgnore: (draft: TransactionDraft) => void
  onPress?: (draft: TransactionDraft) => void
  posting?: boolean
}

/**
 * Card component displaying a single TransactionDraft.
 *
 * Layout:
 *   Top row  — MerchantBadge | ConfidenceBadge | date-time (right-aligned)
 *   Middle   — Large amount + source label below
 *   Bottom   — SEND TO SPLITWISE (primary) | IGNORE (danger)
 */
export function DraftCard({
  draft,
  onPost,
  onIgnore,
  onPress,
  posting = false,
}: DraftCardProps) {
  const dateLabel = formatDate(draft.occurredAt ?? draft.createdAt)

  const handleCardPress = () => {
    onPress?.(draft)
  }

  const handlePost = () => {
    onPost(draft)
  }

  const handleIgnore = () => {
    onIgnore(draft)
  }

  return (
    <View style={styles.card}>
      {/* Top row: merchant + confidence + date */}
      <TouchableOpacity
        style={styles.reviewArea}
        onPress={handleCardPress}
        activeOpacity={onPress ? 0.85 : 1}
        disabled={!onPress}
      >
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <MerchantBadge merchant={draft.merchant} style={styles.merchantBadge} />
            <ConfidenceBadge confidence={draft.confidence} />
          </View>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
        </View>

        {/* Middle: amount and source */}
        <View style={styles.middleRow}>
          <AmountText amount={draft.amount} size="large" />
          <Text style={styles.sourceLabel}>{draft.sourceLabel}</Text>
        </View>
      </TouchableOpacity>

      {/* Bottom: action buttons */}
      <View style={styles.actions}>
        <PrimaryButton
          title="Send to Splitwise"
          onPress={handlePost}
          variant="primary"
          loading={posting}
          disabled={posting}
          style={styles.postButton}
        />
        <TouchableOpacity
          style={styles.ignoreButton}
          onPress={handleIgnore}
          disabled={posting}
          activeOpacity={0.7}
        >
          <Text style={[styles.ignoreText, posting && styles.ignoreTextDisabled]}>
            IGNORE
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Date unknown'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Date unknown'
    const month = d.toLocaleDateString('en-IN', { month: 'short' })
    const day = d.getDate()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${month} ${day}, ${hours}:${minutes}`
  } catch {
    return 'Date unknown'
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: Spacing.md,
  },
  reviewArea: {
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
    flexWrap: 'wrap',
  },
  merchantBadge: {
    flexShrink: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    flexShrink: 0,
  },
  middleRow: {
    gap: 2,
  },
  sourceLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  postButton: {
    flex: 1,
  },
  ignoreButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  ignoreText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: Colors.ember,
  },
  ignoreTextDisabled: {
    opacity: 0.4,
  },
})
