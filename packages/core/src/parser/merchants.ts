import { Merchant } from '../models/ParsedTransaction'

export const MERCHANT_ALIASES: Record<Merchant, string[]> = {
  Blinkit: ['blinkit', 'blnkit', 'grofers'],
  Instamart: ['instamart', 'swiggy inst', 'swiggy instamart'],
  Swiggy: ['swiggy food', 'swiggy', 'bundl technologies', 'bundl'],
  Zomato: ['zomato', 'eternal'],
  Zepto: ['zepto'],
  Unknown: [],
}

export function detectMerchant(text: string): Merchant {
  const lower = text.toLowerCase()
  for (const [merchant, aliases] of Object.entries(MERCHANT_ALIASES) as [Merchant, string[]][]) {
    if (merchant === 'Unknown') continue
    // Check longer aliases first to avoid partial matches (e.g. "swiggy inst" before "swiggy")
    const sorted = [...aliases].sort((a, b) => b.length - a.length)
    for (const alias of sorted) {
      if (lower.includes(alias)) {
        return merchant
      }
    }
  }
  return 'Unknown'
}
