import React, { useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import Constants from 'expo-constants'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { SplitwiseAuth, SplitwiseConfig } from '@crumb/splitwise'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'
import { Typography } from '../theme/typography'
import { useSplitwiseContext } from '../context/SplitwiseContext'
import { RootStackParamList } from '../navigation/AppNavigator'

type Props = NativeStackScreenProps<RootStackParamList, 'SplitwiseConnect'>

export function SplitwiseConnectScreen({ navigation }: Props) {
  const { state, disconnect } = useSplitwiseContext()
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-navigate back after connection
  useEffect(() => {
    if (state.type === 'connected') {
      autoNavTimerRef.current = setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack()
        }
      }, 1500)
    }
    return () => {
      if (autoNavTimerRef.current) {
        clearTimeout(autoNavTimerRef.current)
      }
    }
  }, [state.type, navigation])

  const extra = Constants.expoConfig?.extra as
    | { SPLITWISE_CLIENT_ID?: string; SPLITWISE_CLIENT_SECRET?: string; SPLITWISE_REDIRECT_URI?: string }
    | undefined

  const config: SplitwiseConfig = {
    clientId: extra?.SPLITWISE_CLIENT_ID ?? '',
    clientSecret: extra?.SPLITWISE_CLIENT_SECRET ?? '',
    redirectUri: extra?.SPLITWISE_REDIRECT_URI ?? 'crumb://splitwise-auth',
  }

  const isConfigured = (config.clientId ?? '').trim().length > 0

  const handleConnect = useCallback(async () => {
    if (!isConfigured) {
      Alert.alert(
        'Not configured',
        'Splitwise client ID is not set. Please configure the app with valid credentials.',
      )
      return
    }
    const auth = new SplitwiseAuth(config)
    const url = auth.buildAuthUrl()
    await WebBrowser.openBrowserAsync(url)
  }, [isConfigured, config])

  const handleDisconnect = useCallback(async () => {
    Alert.alert(
      'Disconnect Splitwise?',
      'Your access token will be removed and you will need to reconnect.',
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

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [navigation])

  return (
    <View style={styles.container}>
      {/* Logo / icon area */}
      <View style={styles.iconContainer}>
        <View
          style={[
            styles.iconCircle,
            state.type === 'connected' && styles.iconCircleConnected,
            state.type === 'error' && styles.iconCircleError,
          ]}
        >
          <Text style={styles.iconLabel}>Splitwise</Text>
        </View>
      </View>

      {/* Explanation text */}
      <Text style={styles.explanation}>
        Connect your Splitwise account to post expense drafts
      </Text>

      {/* not_configured state */}
      {state.type === 'not_configured' && (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Splitwise credentials not configured</Text>
          <Text style={styles.warningBody}>
            To enable Splitwise integration, add a{' '}
            <Text style={styles.warningCode}>SPLITWISE_CLIENT_ID</Text> to your app
            config (app.config.js{' '}→{' '}extra). Then rebuild the app.
          </Text>
        </View>
      )}

      {/* disconnected state */}
      {state.type === 'disconnected' && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleConnect}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Connect Splitwise</Text>
        </TouchableOpacity>
      )}

      {/* connecting state */}
      {state.type === 'connecting' && (
        <View style={styles.connectingRow}>
          <ActivityIndicator color={Colors.acid} size="small" />
          <Text style={styles.connectingText}>Connecting...</Text>
        </View>
      )}

      {/* connected state */}
      {state.type === 'connected' && (
        <>
          <Text style={styles.connectedText}>
            Connected as{' '}
            <Text style={styles.connectedName}>
              {state.user.first_name}
              {state.user.last_name ? ` ${state.user.last_name}` : ''}
            </Text>
          </Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleDisconnect}
            activeOpacity={0.85}
          >
            <Text style={styles.dangerButtonText}>Disconnect</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleGoBack}
            activeOpacity={0.75}
          >
            <Text style={styles.secondaryButtonText}>Go back</Text>
          </TouchableOpacity>
        </>
      )}

      {/* error state */}
      {state.type === 'error' && (
        <>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{state.message}</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleConnect}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
    padding: Spacing.screenPadding,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  iconContainer: {
    marginTop: Spacing.xl,
  },
  iconCircle: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 20,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  iconCircleConnected: {
    backgroundColor: Colors.mint,
  },
  iconCircleError: {
    backgroundColor: '#FFF0ED',
    borderWidth: 1.5,
    borderColor: Colors.ember,
  },
  iconLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  explanation: {
    fontSize: 15,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  warningCard: {
    backgroundColor: '#FFF8ED',
    borderRadius: 14,
    padding: Spacing.md,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#F0B027',
    gap: Spacing.sm,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#C87F00',
  },
  warningBody: {
    fontSize: 13,
    color: Colors.ink,
    lineHeight: 20,
  },
  warningCode: {
    fontFamily: 'monospace',
    backgroundColor: Colors.border,
    color: Colors.ink,
  },
  primaryButton: {
    backgroundColor: Colors.acid,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },
  connectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  connectingText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.muted,
  },
  connectedText: {
    fontSize: 17,
    color: Colors.muted,
    textAlign: 'center',
  },
  connectedName: {
    color: Colors.mint,
    fontWeight: '700',
  },
  dangerButton: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    minHeight: 52,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.ember,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ember,
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.muted,
  },
  errorCard: {
    backgroundColor: '#FFF0ED',
    borderRadius: 14,
    padding: Spacing.md,
    width: '100%',
    borderWidth: 1.5,
    borderColor: Colors.ember,
  },
  errorText: {
    fontSize: 14,
    color: Colors.ember,
    textAlign: 'center',
    lineHeight: 20,
  },
})
