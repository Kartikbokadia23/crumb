import type { SplitwiseConfig } from './SplitwiseConfig'

const AUTH_URL = 'https://secure.splitwise.com/oauth/authorize'

export class SplitwiseAuth {
  constructor(private readonly config: SplitwiseConfig) {}

  buildAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
    })
    return `${AUTH_URL}?${params.toString()}`
  }

  parseRedirectCode(url: string): string | null {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return null
    }

    const expectedSchemeHost = new URL(this.config.redirectUri)
    if (
      parsed.protocol !== expectedSchemeHost.protocol ||
      parsed.hostname !== expectedSchemeHost.hostname
    ) {
      return null
    }

    const code = parsed.searchParams.get('code')
    return code ?? null
  }
}
