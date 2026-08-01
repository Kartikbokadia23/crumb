import { readFileSync } from 'fs'
import { join } from 'path'
import { MERCHANT_ALIASES } from '../merchants'
import {
  BALANCE_TERMS,
  CREDIT_TERMS,
  DEBIT_TERMS,
  FOOTER_TERMS,
  NON_EXPENSE_TERMS,
  OTP_TERMS,
  STRONG_DEBIT_TERMS,
} from '../rules'

// shared/parser-rules.json is the canonical vocabulary. The Android listener keeps its
// own Kotlin copy (it runs without JS loaded) and has the mirror of this test.
const rules = JSON.parse(
  readFileSync(join(__dirname, '../../../../../shared/parser-rules.json'), 'utf8'),
)

describe('parser rules match shared/parser-rules.json', () => {
  test('merchant aliases', () => {
    const { Unknown, ...named } = MERCHANT_ALIASES
    expect(Unknown).toEqual([])
    expect(named).toEqual(rules.merchants)
  })

  test.each([
    ['debitTerms', DEBIT_TERMS],
    ['strongDebitTerms', STRONG_DEBIT_TERMS],
    ['creditTerms', CREDIT_TERMS],
    ['nonExpenseTerms', NON_EXPENSE_TERMS],
    ['otpTerms', OTP_TERMS],
    ['footerTerms', FOOTER_TERMS],
    ['balanceTerms', BALANCE_TERMS],
  ])('%s', (key, terms) => {
    expect(terms).toEqual(rules[key as string])
  })

  test('every strong debit term is also a debit term', () => {
    STRONG_DEBIT_TERMS.forEach((term) => expect(DEBIT_TERMS).toContain(term))
  })
})

// The iOS SMS filter extension has no test target of its own, and Android's copy is
// covered by CrumbReceiptRulesParityTest, so the Swift mirror is checked from here.
describe('iOS CrumbReceiptRules.swift mirrors shared/parser-rules.json', () => {
  const swift = readFileSync(
    join(__dirname, '../../../../../apps/mobile/ios/CrumbMessageFilterExtension/CrumbReceiptRules.swift'),
    'utf8',
  )
  const quoted = (block: string) => Array.from(block.matchAll(/"([^"]*)"/g), (m) => m[1])

  test('merchant aliases', () => {
    const block = swift.slice(swift.indexOf('static let merchants'), swift.indexOf('static let debitTerms'))
    const parsed = Array.from(block.matchAll(/\("(\w+)",\s*\[([^\]]*)\]\)/g), (m) => [m[1], quoted(m[2])])
    expect(Object.fromEntries(parsed)).toEqual(rules.merchants)
  })

  test.each([
    'debitTerms', 'strongDebitTerms', 'creditTerms',
    'nonExpenseTerms', 'otpTerms', 'footerTerms', 'balanceTerms',
  ])('%s', (name) => {
    const declaration = swift.match(new RegExp(`static let ${name} = \\[([^\\]]*)\\]`))
    expect(declaration).not.toBeNull()
    expect(quoted(declaration![1])).toEqual(rules[name])
  })
})
