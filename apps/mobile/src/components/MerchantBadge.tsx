import React from 'react'
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'

// Merchant brand colors
const MERCHANT_COLORS: Record<string, string> = {
  Blinkit: '#F5A623',
  Instamart: '#FC4B08',
  Swiggy: '#FC8019',
  Zomato: '#CB202D',
  Zepto: '#7B2D8B',
  Unknown: '#9494A0',
}

interface MerchantBadgeProps {
  merchant: string
  style?: StyleProp<ViewStyle>
}

/**
 * Shows a merchant name with a colored brand dot on the left.
 */
export function MerchantBadge({ merchant, style }: MerchantBadgeProps) {
  const dotColor = MERCHANT_COLORS[merchant] ?? MERCHANT_COLORS.Unknown

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.label} numberOfLines={1}>
        {merchant}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.ink,
    flexShrink: 1,
  },
})
