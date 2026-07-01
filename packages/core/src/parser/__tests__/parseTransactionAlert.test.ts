import { parseTransactionAlert } from '../parseTransactionAlert'

const ALERTS = {
  'hdfc-card-instamart':
    'HDFC Bank: Rs.459.00 spent on HDFC Bank Credit Card ending 1234 at INSTAMART on 2024-01-15 14:30:00. Avl Lmt: Rs.45,000.00',
  'hdfc-card-swiggy':
    'HDFC Bank: Rs.320.50 spent on HDFC Bank Credit Card ending 5678 at SWIGGY FOOD on 2024-01-15 19:20:00. Avl Lmt: Rs.44,679.50',
  'pluxee-blinkit':
    'Pluxee: Rs.899.00 spent at BLINKIT on 15-01-2024 12:45:00. Balance: Rs.5,101.00',
  'pluxee-swiggy-inst':
    'Pluxee: Rs.250.00 spent at SWIGGY INST on 14-01-2024 08:30:00. Balance: Rs.4,851.00',
  'hdfc-upi-blinkit':
    'HDFC Bank: Rs.199.00 debited via UPI to Blinkit on 12/01/24. UPI Ref No: 123456789',
  'icici-blinkit':
    'ICICI Bank: Rs.549.00 spent at BLINKIT on 10-Jan-24. Avl limit: Rs.30,000.00',
  'hdfc-zepto':
    'HDFC Bank: Rs.299.00 spent on Credit Card at ZEPTO on 2024-01-16 11:15:00. Avl Lmt: Rs.44,380.50',
}

describe('parseTransactionAlert', () => {
  test('hdfc-card-instamart: merchant Instamart, amount 459.00, confidence High, has datetime', () => {
    const result = parseTransactionAlert(ALERTS['hdfc-card-instamart'], 'hdfc-card')
    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Instamart')
    expect(result!.amount).toBe('459.00')
    expect(result!.confidence).toBe('High')
    expect(result!.occurredAt).toBe('2024-01-15T14:30:00')
    expect(result!.sourceLabel).toBe('hdfc-card')
  })

  test('hdfc-card-swiggy: merchant Swiggy, amount 320.50, confidence High', () => {
    const result = parseTransactionAlert(ALERTS['hdfc-card-swiggy'], 'hdfc-card')
    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Swiggy')
    expect(result!.amount).toBe('320.50')
    expect(result!.confidence).toBe('High')
    expect(result!.occurredAt).toBe('2024-01-15T19:20:00')
  })

  test('pluxee-blinkit: merchant Blinkit, amount 899.00, confidence High (Pluxee format)', () => {
    const result = parseTransactionAlert(ALERTS['pluxee-blinkit'], 'pluxee')
    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Blinkit')
    expect(result!.amount).toBe('899.00')
    expect(result!.confidence).toBe('High')
    expect(result!.occurredAt).toBe('2024-01-15T12:45:00')
  })

  test('pluxee-swiggy-inst: merchant Instamart (swiggy inst alias), amount 250.00', () => {
    const result = parseTransactionAlert(ALERTS['pluxee-swiggy-inst'], 'pluxee')
    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Instamart')
    expect(result!.amount).toBe('250.00')
    expect(result!.confidence).toBe('High')
    expect(result!.occurredAt).toBe('2024-01-14T08:30:00')
  })

  test('hdfc-upi-blinkit: merchant Blinkit, amount 199.00, confidence Medium (has debited)', () => {
    const result = parseTransactionAlert(ALERTS['hdfc-upi-blinkit'], 'hdfc-upi')
    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Blinkit')
    expect(result!.amount).toBe('199.00')
    expect(result!.confidence).toBe('Medium')
    expect(result!.occurredAt).toBe('2024-01-12')
  })

  test('icici-blinkit: merchant Blinkit, amount 549.00, Indian date format', () => {
    const result = parseTransactionAlert(ALERTS['icici-blinkit'], 'icici')
    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Blinkit')
    expect(result!.amount).toBe('549.00')
    // Date-only (no time) → not "full datetime" → falls to Medium (has "spent")
    expect(result!.confidence).toBe('Medium')
    expect(result!.occurredAt).toBe('2024-01-10')
  })

  test('hdfc-zepto: merchant Zepto, amount 299.00', () => {
    const result = parseTransactionAlert(ALERTS['hdfc-zepto'], 'hdfc-card')
    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Zepto')
    expect(result!.amount).toBe('299.00')
    expect(result!.confidence).toBe('High')
    expect(result!.occurredAt).toBe('2024-01-16T11:15:00')
  })

  test('unknown merchant text returns null', () => {
    const result = parseTransactionAlert(
      'SBI Bank: Rs.1000.00 spent at Amazon on 2024-01-15 10:00:00.',
      'sbi',
    )
    expect(result).toBeNull()
  })

  test('amount dedup: first amount taken, not balance', () => {
    const text =
      'HDFC Bank: Rs.459.00 spent at BLINKIT on 2024-01-15 10:00:00. Balance: Rs.45000.00'
    const result = parseTransactionAlert(text, 'hdfc-card')
    expect(result).not.toBeNull()
    expect(result!.amount).toBe('459.00')
  })

  test('rawHash is a 64-char hex string (SHA-256)', () => {
    const result = parseTransactionAlert(ALERTS['hdfc-card-instamart'], 'hdfc-card')
    expect(result).not.toBeNull()
    expect(result!.rawHash).toMatch(/^[0-9a-f]{64}$/)
  })

  test('rawHash is deterministic for same input', () => {
    const r1 = parseTransactionAlert(ALERTS['hdfc-card-swiggy'], 'hdfc-card')
    const r2 = parseTransactionAlert(ALERTS['hdfc-card-swiggy'], 'hdfc-card')
    expect(r1!.rawHash).toBe(r2!.rawHash)
  })

  test('rawHash differs for different inputs', () => {
    const r1 = parseTransactionAlert(ALERTS['hdfc-card-instamart'], 'hdfc-card')
    const r2 = parseTransactionAlert(ALERTS['hdfc-card-swiggy'], 'hdfc-card')
    expect(r1!.rawHash).not.toBe(r2!.rawHash)
  })
})
