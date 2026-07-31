import { sha256 } from 'js-sha256'
import { ParsedTransaction, Confidence } from '../models/ParsedTransaction'
import { detectMerchant } from './merchants'
import { AMOUNT_PATTERN, ISO_DATETIME, PLUXEE_DATETIME, INDIAN_DATE, SLASH_DATE, DASH_DATE } from './patterns'

const MONTH_ABBREVS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const NON_EXPENSE_SECURITY_PATTERN =
  /\b(?:otp|one[-\s]?time password|verification code|login code|security code|do not share|never share|not you\??|sms block upi|block upi)\b/i

function padTwo(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function parseOccurredAt(text: string): string | null {
  // 1. ISO: YYYY-MM-DD HH:MM:SS
  const isoMatch = text.match(ISO_DATETIME)
  if (isoMatch) {
    // Already in ISO-ish form, convert to ISO-8601 with T separator
    const raw = isoMatch[1]
    return raw.replace(' ', 'T')
  }

  // 2. Pluxee: DD-MM-YYYY HH:MM:SS
  const pluxeeMatch = text.match(PLUXEE_DATETIME)
  if (pluxeeMatch) {
    const raw = pluxeeMatch[1]
    // raw format: "15-01-2024 12:45:00"
    const [datePart, timePart] = raw.split(' ')
    const [dd, mm, yyyy] = datePart.split('-')
    return `${yyyy}-${mm}-${dd}T${timePart}`
  }

  // 3. Indian short: DD-Mon-YY
  const indianMatch = text.match(INDIAN_DATE)
  if (indianMatch) {
    const raw = indianMatch[1]
    // raw format: "10-Jan-24"
    const parts = raw.split('-')
    const dd = parts[0]
    const monthAbbrev = parts[1].toLowerCase()
    const yy = parseInt(parts[2], 10)
    const month = MONTH_ABBREVS[monthAbbrev]
    if (!month) return null
    const yyyy = 2000 + yy
    return `${yyyy}-${padTwo(month)}-${dd}`
  }

  // 4. Slash: DD/MM/YY
  const slashMatch = text.match(SLASH_DATE)
  if (slashMatch) {
    const raw = slashMatch[1]
    // raw format: "12/01/24"
    const [dd, mm, yy] = raw.split('/')
    const yyyy = 2000 + parseInt(yy, 10)
    return `${yyyy}-${mm}-${dd}`
  }

  // 5. Dash numeric: DD-MM-YY (e.g. Kotak "on 29-07-26")
  const dashMatch = text.match(DASH_DATE)
  if (dashMatch) {
    const raw = dashMatch[1]
    // raw format: "29-07-26"
    const [dd, mm, yy] = raw.split('-')
    const yyyy = 2000 + parseInt(yy, 10)
    return `${yyyy}-${mm}-${dd}`
  }

  return null
}

function extractAmount(text: string): string | null {
  // Reset lastIndex since AMOUNT_PATTERN is global
  AMOUNT_PATTERN.lastIndex = 0
  const match = AMOUNT_PATTERN.exec(text)
  if (!match) return null
  const raw = match[1].replace(/,/g, '')
  const num = parseFloat(raw)
  if (isNaN(num)) return null
  return num.toFixed(2)
}

function hasFullDatetime(text: string): boolean {
  // Only patterns with a time component count as "full datetime"
  return ISO_DATETIME.test(text) || PLUXEE_DATETIME.test(text)
}

function computeConfidence(text: string, occurredAt: string | null): Confidence {
  if (occurredAt !== null && hasFullDatetime(text)) return 'High'
  const lower = text.toLowerCase()
  if (lower.includes('spent') || lower.includes('debited') || lower.includes('sent')) {
    return 'Medium'
  }
  return 'Low'
}

function computeRawHash(text: string): string {
  return sha256(text.toLowerCase().trim())
}

function hasDirectMerchantPayee(text: string, merchant: string): boolean {
  const aliases = MERCHANT_PAYEE_ALIASES[merchant] ?? []
  return aliases.some((alias) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b(?:to|at|paid\\s+to)\\s+${escaped}\\b`, 'i').test(text)
  })
}

const MERCHANT_PAYEE_ALIASES: Record<string, string[]> = {
  Blinkit: ['blinkit'],
  Instamart: ['instamart', 'swiggy instamart', 'swiggy inst'],
  Swiggy: ['swiggy'],
  Zomato: ['zomato'],
  Zepto: ['zepto'],
  Amazon: ['amazonpaygrocery', 'amazonselle'],
}

function isNonExpenseAlert(text: string, merchant: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim()
  // Direct merchant UPI payee wins over any security-footer language.
  // e.g. Kotak appends "Not you," to all payment confirmations — still a real expense.
  if (hasDirectMerchantPayee(normalized, merchant)) return false
  if (NON_EXPENSE_SECURITY_PATTERN.test(normalized)) return true
  return false
}

export function parseTransactionAlert(text: string, sourceLabel: string): ParsedTransaction | null {
  const merchant = detectMerchant(`${text}\n${sourceLabel}`)
  if (merchant === 'Unknown') return null
  if (isNonExpenseAlert(text, merchant)) return null

  const amount = extractAmount(text)
  if (!amount) return null

  const occurredAt = parseOccurredAt(text)
  const confidence = computeConfidence(text, occurredAt)
  const rawHash = computeRawHash(text)

  return {
    merchant,
    amount,
    occurredAt,
    sourceLabel,
    confidence,
    rawHash,
  }
}
