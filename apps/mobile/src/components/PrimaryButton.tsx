import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'

interface PrimaryButtonProps {
  title: string
  onPress: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  style?: StyleProp<ViewStyle>
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  loading = false,
  style,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading

  const containerStyle = [
    styles.button,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'danger' && styles.danger,
    isDisabled && styles.disabled,
    style,
  ]

  const textStyle = [
    styles.label,
    variant === 'primary' && styles.primaryText,
    variant === 'secondary' && styles.secondaryText,
    variant === 'danger' && styles.dangerText,
    isDisabled && styles.disabledText,
  ]

  const indicatorColor =
    variant === 'primary'
      ? Colors.ink
      : variant === 'danger'
      ? '#FFFFFF'
      : Colors.ink

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} size="small" />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  // Variant backgrounds
  primary: {
    backgroundColor: Colors.acid,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  danger: {
    backgroundColor: Colors.ember,
  },
  // Disabled state
  disabled: {
    opacity: 0.45,
  },
  // Text styles
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  primaryText: {
    color: Colors.ink,
  },
  secondaryText: {
    color: Colors.ink,
  },
  dangerText: {
    color: '#FFFFFF',
  },
  disabledText: {
    color: Colors.muted,
  },
})
