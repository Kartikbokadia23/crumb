export interface SplitwiseConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function isSplitwiseConfigured(config: SplitwiseConfig): boolean {
  return config.clientId.trim().length > 0 && config.redirectUri.trim().length > 0
}

export const DEFAULT_REDIRECT_URI = 'crumb://splitwise-auth'
