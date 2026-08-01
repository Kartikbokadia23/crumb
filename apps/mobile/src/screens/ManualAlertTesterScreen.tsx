import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { parseTransactionAlert, createDraft } from '@crumb/core'
import type { ParsedTransaction } from '@crumb/core'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'
import { Typography } from '../theme/typography'
import { useStorage } from '../context/StorageContext'
import { RootStackParamList } from '../navigation/AppNavigator'

type Props = NativeStackScreenProps<RootStackParamList, 'ManualAlertTester'>

// ---------------------------------------------------------------------------
// Sample alert texts for one-tap testing
// ---------------------------------------------------------------------------

const SAMPLE_ALERTS: { label: string; text: string }[] = [
  {
    label: 'HDFC Instamart',
    text: 'HDFC Bank: Rs.459.00 spent on HDFC Bank Credit Card ending 1234 at INSTAMART on 2024-01-15 14:30:00. Avl Lmt: Rs.45,000.00',
  },
  {
    label: 'Pluxee Blinkit',
    text: 'Pluxee: Rs.899.00 spent at BLINKIT on 15-01-2024 12:45:00. Balance: Rs.5,101.00',
  },
  {
    label: 'HDFC UPI Blinkit',
    text: 'HDFC Bank: Rs.199.00 debited via UPI to Blinkit on 12/01/24. UPI Ref No: 123456789',
  },
  {
    label: 'HDFC card + fraud footer',
    text: 'Spent Rs.412 On HDFC Bank Card 2333 At PYU*Instamart Grocery On 2026-08-01:11:22:47.Not You? To Block+Reissue Call 18002586161/SMS BLOCK CC 2333 to 7308080808',
  },
  {
    label: 'Refund (skipped)',
    text: 'Refund of Rs.412.00 for your Instamart order is credited to A/c X1234',
  },
]

// ---------------------------------------------------------------------------
// Sub-components: MerchantBadge, AmountText, ConfidenceBadge
// ---------------------------------------------------------------------------

function MerchantBadge({ merchant }: { merchant: string }) {
  return (
    <View style={badgeStyles.merchantContainer}>
      <Text style={badgeStyles.merchantLabel}>MERCHANT</Text>
      <Text style={badgeStyles.merchantName}>{merchant}</Text>
    </View>
  )
}

function AmountText({ amount }: { amount: string }) {
  return (
    <View style={badgeStyles.amountContainer}>
      <Text style={badgeStyles.amountLabel}>AMOUNT</Text>
      <Text style={badgeStyles.amountValue}>₹{amount}</Text>
    </View>
  )
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const color =
    confidence === 'High'
      ? Colors.confidenceHigh
      : confidence === 'Medium'
      ? Colors.confidenceMedium
      : Colors.confidenceLow

  return (
    <View style={[badgeStyles.confidenceContainer, { borderColor: color }]}>
      <Text style={badgeStyles.confidenceLabel}>CONFIDENCE</Text>
      <Text style={[badgeStyles.confidenceValue, { color }]}>{confidence}</Text>
    </View>
  )
}

const badgeStyles = StyleSheet.create({
  merchantContainer: {
    flex: 1,
    backgroundColor: Colors.ink,
    borderRadius: 10,
    padding: Spacing.sm,
    gap: 2,
  },
  merchantLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: Colors.muted,
    textTransform: 'uppercase',
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.acid,
  },
  amountContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 2,
  },
  amountLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: Colors.muted,
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  confidenceContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: Spacing.sm,
    borderWidth: 1.5,
    gap: 2,
  },
  confidenceLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: Colors.muted,
    textTransform: 'uppercase',
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
})

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function ManualAlertTesterScreen({ navigation }: Props) {
  const { repo } = useStorage()
  const [alertText, setAlertText] = useState('')
  const [parsed, setParsed] = useState<ParsedTransaction | null | undefined>(undefined)
  // undefined = not yet parsed, null = parse failed, object = success
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)
  const [samplesExpanded, setSamplesExpanded] = useState(true)

  const handleParse = useCallback(() => {
    const text = alertText.trim()
    if (!text) {
      Alert.alert('Empty input', 'Paste or type an alert message first.')
      return
    }
    setSaveFeedback(null)
    const result = parseTransactionAlert(text, 'manual')
    setParsed(result)
  }, [alertText])

  const handleAddDraft = useCallback(async () => {
    if (!parsed) return
    const platform = Platform.OS === 'ios' ? 'ios' : 'android'
    const draft = createDraft(parsed, platform, 'manual')
    await repo.saveDraft(draft)
    setSaveFeedback(`Draft saved: ${parsed.merchant} — ₹${parsed.amount}`)
    setAlertText('')
    setParsed(undefined)
  }, [parsed, repo])

  const handleUseSample = useCallback((text: string) => {
    setAlertText(text)
    setParsed(undefined)
    setSaveFeedback(null)
  }, [])

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header description */}
      <Text style={[Typography.subheading, styles.headerNote]}>
        Paste a bank SMS or notification to test the transaction parser.
      </Text>

      {/* TextInput */}
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={6}
        value={alertText}
        onChangeText={(t) => {
          setAlertText(t)
          setParsed(undefined)
          setSaveFeedback(null)
        }}
        placeholder="Paste bank alert text here..."
        placeholderTextColor={Colors.muted}
        textAlignVertical="top"
        autoCorrect={false}
        autoCapitalize="none"
      />

      {/* Parse button */}
      <TouchableOpacity
        style={styles.parseButton}
        onPress={handleParse}
        activeOpacity={0.85}
      >
        <Text style={styles.parseButtonText}>Parse</Text>
      </TouchableOpacity>

      {/* Results section */}
      {parsed !== undefined && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionLabel}>Result</Text>

          {parsed === null ? (
            <View style={styles.failCard}>
              <Text style={styles.failText}>Not a spend alert</Text>
              <Text style={styles.failHint}>
                Crumb keeps a message only when it names Blinkit, Instamart, Swiggy, Zomato,
                Zepto or Amazon grocery, has an amount, and says money left the account.
                OTPs, refunds, credits, declined payments and offers are skipped.
              </Text>
            </View>
          ) : (
            <>
              {/* Badges row 1: merchant + amount */}
              <View style={styles.badgeRow}>
                <MerchantBadge merchant={parsed.merchant} />
                <AmountText amount={parsed.amount} />
              </View>

              {/* Badges row 2: confidence + datetime */}
              <View style={styles.badgeRow}>
                <ConfidenceBadge confidence={parsed.confidence} />
                <View style={badgeStyles.amountContainer}>
                  <Text style={badgeStyles.amountLabel}>DATE / TIME</Text>
                  <Text style={styles.datetimeValue}>
                    {parsed.occurredAt
                      ? parsed.occurredAt.replace('T', ' ').slice(0, 19)
                      : '—'}
                  </Text>
                </View>
              </View>

              {/* Add as Draft button */}
              <TouchableOpacity
                style={styles.addDraftButton}
                onPress={handleAddDraft}
                activeOpacity={0.85}
              >
                <Text style={styles.addDraftButtonText}>Add as Draft</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Success feedback */}
          {saveFeedback && (
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackText}>{saveFeedback}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('DraftInbox')}
                style={styles.viewInboxButton}
              >
                <Text style={styles.viewInboxText}>View in Inbox</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Sample alerts section (collapsible) */}
      <View style={styles.samplesSection}>
        <TouchableOpacity
          style={styles.samplesHeader}
          onPress={() => setSamplesExpanded((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionLabel}>Sample Alerts</Text>
          <Text style={styles.chevron}>{samplesExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {samplesExpanded &&
          SAMPLE_ALERTS.map((sample) => (
            <TouchableOpacity
              key={sample.label}
              style={styles.sampleCard}
              onPress={() => handleUseSample(sample.text)}
              activeOpacity={0.8}
            >
              <Text style={styles.sampleChipLabel}>{sample.label}</Text>
              <Text style={styles.sampleText} numberOfLines={3}>
                {sample.text}
              </Text>
            </TouchableOpacity>
          ))}
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
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  headerNote: {
    color: Colors.muted,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
  },

  // Input
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: 13,
    color: Colors.ink,
    minHeight: 140,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    lineHeight: 20,
  },

  // Parse button
  parseButton: {
    backgroundColor: Colors.acid,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  parseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },

  // Results
  resultsSection: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.muted,
  },
  failCard: {
    backgroundColor: '#FFF0ED',
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.ember,
    gap: Spacing.xs,
  },
  failText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ember,
  },
  failHint: {
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  datetimeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ink,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },

  // Add Draft button
  addDraftButton: {
    backgroundColor: Colors.mint,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  addDraftButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.surface,
  },

  // Feedback card
  feedbackCard: {
    backgroundColor: Colors.ink,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  feedbackText: {
    fontSize: 13,
    color: Colors.acid,
    fontWeight: '600',
  },
  viewInboxButton: {
    backgroundColor: Colors.acid,
    borderRadius: 8,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  viewInboxText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
  },

  // Samples section
  samplesSection: {
    gap: Spacing.sm,
  },
  samplesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chevron: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: '700',
  },
  sampleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  sampleChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.muted,
  },
  sampleText: {
    fontSize: 12,
    color: Colors.ink,
    lineHeight: 18,
  },
})
