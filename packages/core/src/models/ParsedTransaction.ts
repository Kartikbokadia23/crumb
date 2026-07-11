export type Merchant = 'Blinkit' | 'Instamart' | 'Swiggy' | 'Zomato' | 'Zepto' | 'Amazon' | 'Unknown'
export type Confidence = 'High' | 'Medium' | 'Low'

export interface ParsedTransaction {
  merchant: Merchant
  amount: string       // decimal string e.g. "459.00"
  occurredAt: string | null  // ISO-8601 or null
  sourceLabel: string
  confidence: Confidence
  rawHash: string      // SHA-256 hex
}
