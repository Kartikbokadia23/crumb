import { StyleSheet } from 'react-native'
import { Colors } from './colors'

export const Typography = StyleSheet.create({
  hero: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ink,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ink,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.ink,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    letterSpacing: 0.3,
  },
  amount: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
})
