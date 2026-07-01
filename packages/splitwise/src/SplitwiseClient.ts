import type { SplitwiseConfig } from './SplitwiseConfig'
import type {
  SplitwiseTokenResponse,
  SplitwiseUser,
  SplitwiseGroup,
  SplitwiseExpenseResult,
} from './SplitwiseModels'

export class SplitwiseClient {
  private readonly baseUrl = 'https://secure.splitwise.com/api/v3.0'
  private readonly tokenUrl = 'https://secure.splitwise.com/oauth/token'

  constructor(private readonly config: SplitwiseConfig) {}

  async exchangeCode(code: string): Promise<SplitwiseTokenResponse> {
    return this.post<SplitwiseTokenResponse>(
      this.tokenUrl,
      {
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      },
      undefined,
      true,
    )
  }

  async getCurrentUser(accessToken: string): Promise<SplitwiseUser> {
    const response = await this.get<{ user: SplitwiseUser }>('/get_current_user', accessToken)
    return response.user
  }

  async getGroups(accessToken: string): Promise<SplitwiseGroup[]> {
    const response = await this.get<{ groups: SplitwiseGroup[] }>('/get_groups', accessToken)
    return response.groups.filter((g) => g.id !== 0)
  }

  async createEqualExpense(
    accessToken: string,
    groupId: number,
    description: string,
    cost: string,
  ): Promise<SplitwiseExpenseResult> {
    return this.post<SplitwiseExpenseResult>(
      '/create_expense',
      {
        description,
        cost,
        group_id: groupId,
        split_equally: true,
        currency_code: 'INR',
      },
      accessToken,
    )
  }

  private async get<T>(path: string, accessToken: string): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(
        `Splitwise GET ${path} failed with status ${response.status}: ${response.statusText}`,
      )
    }

    return response.json() as Promise<T>
  }

  private async post<T>(
    path: string,
    body: Record<string, string | number | boolean>,
    accessToken?: string,
    absoluteUrl = false,
  ): Promise<T> {
    const url = absoluteUrl ? path : `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(
        `Splitwise POST ${path} failed with status ${response.status}: ${response.statusText}`,
      )
    }

    return response.json() as Promise<T>
  }
}
