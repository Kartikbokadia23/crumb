import { sha256 } from 'js-sha256'
import { ParsedTransaction, Confidence } from '../models/ParsedTransaction'
import { detectMerchant } from './merchants'
import { AMOUNT_PATTERN, ISO_DATETIME, PLUXEE_DATETIME, INDIAN_DATE, SLASH_DATE, DASH_DATE } from './patterns'

const MONTH_ABBREVS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

// Only OTP / verification messages are hard-blocked. Everything else that names a
// merchant and an amount is treated as a real expense.
const OTP_PATTERN =
  /\b(?:otp|one[-\s]?time\s?password|verification code|login code|security code|authentication code)\b/i

// Banks append a fraud-report footer to genuine debit alerts ("Not you? To Block+Reissue
// Call 1800.../SMS BLOCK CC ..."). It is noise, and its wording collides with real
// transaction text, so everything from the footer onward is dropped before parsing.
const SECURITY_FOOTER_PATTERN =
  /\b(?:not\s*you\b|sms\s+block\b|to\s+block\b|to\s+report\b|call\s+1800\d+)/i

// Payee of a transfer-style alert ("Sent Rs.50 from A/C X to <payee> on ...").
// Captured so a transfer to someone else is not credited to a merchant that merely
// appears elsewhere in the message (e.g. the notification title).
const TRANSFER_PAYEE_PATTERN =
  /\b(?:sent|paid|debited|transferred)\b[\s\S]{0,80}?\bto\s+(\S[^\n]*?)(?=\s+on\b|\s+ref\b|\s+upi\b|[,;]|\.\s|$)/i

function padTwo(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function parseOccurredAt(text: string): string | null {
  // 1. ISO: YYYY-MM-DD HH:MM:SS
  const isoMatch = text.match(ISO_DATETIME)
  if (isoMatch) {
    // Already in ISO-ish form, normalise the separator to T
    return `${isoMatch[1]}T${isoMatch[2]}`
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

function stripSecurityFooter(text: string): string {
  const match = text.match(SECURITY_FOOTER_PATTERN)
  return match ? text.slice(0, match.index).trim() : text
}

// True when the alert is a transfer to a payee that is not this merchant, i.e. the
// merchant matched somewhere else in the message (title, bank name) and not the payee.
function isTransferToOtherPayee(body: string, merchant: string): boolean {
  const match = body.match(TRANSFER_PAYEE_PATTERN)
  if (!match) return false
  return detectMerchant(match[1]) !== merchant
}

export function parseTransactionAlert(text: string, sourceLabel: string): ParsedTransaction | null {
  if (OTP_PATTERN.test(text)) return null

  const body = stripSecurityFooter(text.replace(/\s+/g, ' ').trim())
  const merchant = detectMerchant(`${body}\n${sourceLabel}`)
  if (merchant === 'Unknown') return null
  if (isTransferToOtherPayee(body, merchant)) return null

  const amount = extractAmount(body)
  if (!amount) return null

  const occurredAt = parseOccurredAt(body)
  const confidence = computeConfidence(body, occurredAt)
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
