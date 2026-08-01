/**
 * Receipt vocabulary. Mirrors shared/parser-rules.json, which the Android native
 * listener also mirrors — rules.parity.test.ts fails if this copy drifts.
 */

// Money left the account. At least one of these must be present: a merchant name plus
// an amount is also what promos ("Flat Rs.150 OFF on Zepto") and order updates look like.
export const DEBIT_TERMS = [
  'spent', 'debited', 'debit', 'paid', 'payment', 'sent', 'withdrawn',
  'withdrawal', 'charged', 'deducted', 'purchase', 'purchased', 'swiped',
]

// Debit terms that can only mean the user's own money moved out. The rest of
// DEBIT_TERMS also show up in credit alerts ("payment received", "amount sent to you").
export const STRONG_DEBIT_TERMS = [
  'spent', 'debited', 'paid', 'withdrawn', 'withdrawal',
  'charged', 'deducted', 'purchase', 'purchased', 'swiped',
]

// Money came back. Disqualifying unless a strong debit term is also present, because
// "debited from A/c and credited to <merchant>" is a normal way to word a payment.
export const CREDIT_TERMS = ['credited', 'received', 'added']

// Never an expense, whatever else the message says.
export const NON_EXPENSE_TERMS = [
  'refund', 'refunded', 'reversal', 'reversed', 'cashback',
  'declined', 'failed', 'unsuccessful',
]

export const OTP_TERMS = [
  'otp', 'one time password', 'one-time password', 'verification code',
  'login code', 'security code', 'authentication code',
]

// Banks append a fraud-report footer to genuine debit alerts ("Not you? To Block+Reissue
// Call 1800.../SMS BLOCK CC ..."). It is noise, and its wording collides with real
// transaction text, so everything from the footer onward is dropped before parsing.
export const FOOTER_TERMS = ['not you', 'sms block', 'to block', 'to report', 'call 1800']

// Labels that mark an amount as a balance/limit rather than the transaction amount.
export const BALANCE_TERMS = [
  'avl lmt', 'avl limit', 'avl bal', 'available balance',
  'available limit', 'balance', 'bal', 'limit',
]

/** Builds a case-insensitive alternation of whole phrases, tolerant of extra spaces. */
export function termsPattern(terms: string[], flags = 'i'): RegExp {
  const alternation = terms
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'))
    .join('|')
  return new RegExp(`\\b(?:${alternation})\\b`, flags)
}
