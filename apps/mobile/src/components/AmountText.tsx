import React from 'react'
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native'
import { Colors } from '../theme/colors'

interface AmountTextProps {
  amount: string
  size?: 'small' | 'medium' | 'large'
  style?: StyleProp<TextStyle>
}

/**
 * Displays a formatted rupee amount, e.g. "₹ 459.00".
 * Parses the raw decimal string and adds two decimal places if not present.
 */
export function AmountText({ amount, size = 'medium', style }: AmountTextProps) {
  const formatted = formatAmount(amount)

  const textStyle = [
    styles.base,
    size === 'large' && styles.large,
    size === 'medium' && styles.medium,
    size === 'small' && styles.small,
    style,
  ]

  return <Text style={textStyle}>₹ {formatted}</Text>
}

function formatAmount(raw: string): string {
  const num = parseFloat(raw)
  if (isNaN(num)) return raw
  return num.toFixed(2)
}

const styles = StyleSheet.create({
  base: {
    color: Colors.ink,
    includeFontPadding: false,
  },
  large: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  medium: {
    fontSize: 18,
    fontWeight: '700',
  },
  small: {
    fontSize: 14,
    fontWeight: '600',
  },
})
