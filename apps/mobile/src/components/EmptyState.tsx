import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'

interface EmptyStateProps {
  title: string
  subtitle: string
  icon?: string
}

/**
 * Centered empty-state view with an optional emoji icon, a title, and a subtitle.
 * Used when the Draft Inbox has no pending items.
 */
export function EmptyState({ title, subtitle, icon }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  icon: {
    fontSize: 56,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
})
