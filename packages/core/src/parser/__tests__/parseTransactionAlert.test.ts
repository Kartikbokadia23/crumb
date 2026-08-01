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

  test('plain swiggy alias parses as Swiggy', () => {
    const result = parseTransactionAlert(
      'HDFC Bank: Rs.320.50 spent at SWIGGY on 2024-01-15 19:20:00.',
      'hdfc-card',
    )
    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Swiggy')
    expect(result!.amount).toBe('320.50')
  })

  test('iOS sender label can identify Swiggy when body omits merchant', () => {
    const result = parseTransactionAlert(
      'Paid Rs.320.50 successfully on 2024-01-15 19:20:00.',
      'SWIGGY',
    )
    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Swiggy')
    expect(result!.amount).toBe('320.50')
  })

  test('iOS sender label can identify Instamart when body omits merchant', () => {
    const result = parseTransactionAlert(
      'Paid Rs.459.00 successfully on 2024-01-15 14:30:00.',
      'INSTAMART',
    )
    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Instamart')
    expect(result!.amount).toBe('459.00')
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

  test('hdfc-card-instamart-block-footer: parses despite "Not You? To Block+Reissue" footer', () => {
    const result = parseTransactionAlert(
      'Spent Rs.412 On HDFC Bank Card 2333 At PYU*Instamart Grocery On 2026-08-01:11:22:47.Not You? To Block+Reissue Call 18002586161/SMS BLOCK CC 2333 to 7308080808',
      'HDFCBK',
    )
    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Instamart')
    expect(result!.amount).toBe('412.00')
    expect(result!.occurredAt).toBe('2026-08-01T11:22:47')
    expect(result!.confidence).toBe('High')
  })

  test('rejects transfer to a person even when a merchant name appears elsewhere', () => {
    const result = parseTransactionAlert(
      `Swiggy
      Sent Rs.50.00
      From HDFC Bank A/C *8899
      To Ram Balak
      On 13/07/26
      Ref 656019660532
      Not You?
      Call 18002586161/SMS BLOCK UPI to 7308080808`,
      'bob World',
    )

    expect(result).toBeNull()
  })

  test('keeps direct merchant bank payment eligible', () => {
    const result = parseTransactionAlert(
      'Sent Rs.50.00 From HDFC Bank A/C *8899 To Swiggy On 13/07/26 Ref 656019660532',
      'HDFC Bank',
    )

    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Swiggy')
    expect(result!.amount).toBe('50.00')
  })

  test('kotak-blinkit-not-you-comma: parses Kotak UPI payment ending with "Not you,"', () => {
    const result = parseTransactionAlert(
      'Sent Rs.726.00 from Kotak Bank AC X0984 to blinkit.rzp@hdfcbank on 29-07-26.UPI Ref 657691584427. Not you,',
      'Kotak Bank',
    )
    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Blinkit')
    expect(result!.amount).toBe('726.00')
    expect(result!.occurredAt).toBe('2026-07-29')
    expect(result!.confidence).toBe('Medium')
  })

  test('kotak-blinkit-not-you-space-question: parses Kotak UPI payment ending with "Not you ?"', () => {
    const result = parseTransactionAlert(
      'Sent Rs.726.00 from Kotak Bank AC X0984 to blinkit.rzp@hdfcbank on 29-07-26.UPI Ref 657691584427. Not you ?',
      'Kotak Bank',
    )
    expect(result).not.toBeNull()
    expect(result!.merchant).toBe('Blinkit')
    expect(result!.amount).toBe('726.00')
    expect(result!.occurredAt).toBe('2026-07-29')
  })

  test('rejects otp and verification alerts even with merchant and amount', () => {
    expect(
      parseTransactionAlert(
        'Your Swiggy OTP is 123456 for transaction of Rs.50.00. Do not share it with anyone.',
        'Swiggy',
      ),
    ).toBeNull()

    expect(
      parseTransactionAlert(
        'Use verification code 123456 to login. Never share this code. Amount Rs.50.00',
        'Zomato',
      ),
    ).toBeNull()
  })
})
