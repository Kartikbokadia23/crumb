import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'

type ConfidenceLevel = 'High' | 'Medium' | 'Low'

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel
}

const BADGE_COLORS: Record<ConfidenceLevel, { background: string; text: string }> = {
  High: { background: '#D6FAE8', text: Colors.confidenceHigh },
  Medium: { background: '#FEF3D0', text: Colors.confidenceMedium },
  Low: { background: '#EBEBED', text: Colors.confidenceLow },
}

/**
 * Small pill badge showing confidence level: High / Medium / Low.
 */
export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const colors = BADGE_COLORS[confidence] ?? BADGE_COLORS.Low

  return (
    <View style={[styles.pill, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>{confidence}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
