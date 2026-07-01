import { ExpoConfig, ConfigContext } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Crumb',
  slug: 'crumb',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    backgroundColor: '#F5F5F0',
  },
  android: {
    package: 'com.flatwise.crumb',
    adaptiveIcon: {
      backgroundColor: '#F5F5F0',
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'crumb',
            host: 'splitwise-auth',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  ios: {
    bundleIdentifier: 'com.flatwise.crumb',
    supportsTablet: false,
  },
  scheme: 'crumb',
  plugins: ['expo-secure-store'],
  extra: {
    SPLITWISE_CLIENT_ID: process.env.SPLITWISE_CLIENT_ID ?? '',
    SPLITWISE_CLIENT_SECRET: process.env.SPLITWISE_CLIENT_SECRET ?? '',
    SPLITWISE_REDIRECT_URI: process.env.SPLITWISE_REDIRECT_URI ?? 'crumb://splitwise-auth',
  },
})
