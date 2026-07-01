export interface SplitwiseTokenResponse {
  access_token: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
}

export interface SplitwiseUser {
  id: number
  first_name: string
  last_name?: string
  email?: string
}

export function getUserDisplayName(user: SplitwiseUser): string {
  return user.last_name ? user.first_name + ' ' + user.last_name : user.first_name
}

export interface SplitwiseGroup {
  id: number
  name: string
  members?: SplitwiseGroupMember[]
}

export interface SplitwiseGroupMember {
  id: number
  first_name: string
  last_name?: string
}

export interface SplitwiseExpenseResult {
  expenses: SplitwiseExpense[]
  errors: Record<string, string[]>
}

export interface SplitwiseExpense {
  id: number
  description: string
  cost: string
  group_id?: number
}
