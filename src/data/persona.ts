/*
  Persona data (SPEC section 2). Parts only: every total is computed in derived.ts.
  Snapshot: 30 Oct 2026, 9:14 am IST (a Friday; the spec labels it Thu, from the 2025 calendar).
*/
import type {
  BankAccount,
  CreditCard,
  DataSource,
  ISODate,
  ISODateTime,
  Loan,
  MutualFund,
  Policy,
  Rupees,
  Sip,
  SpendCategory,
  StockHolding,
  Subscription,
  Wallet,
} from '../types'

export const AS_OF: ISODateTime = '2026-10-30T09:14:00+05:30'

/* ---------- Nikhil ---------- */

export const profile = {
  name: 'Nikhil Mehra',
  firstName: 'Nikhil',
  age: 33,
  city: 'Bengaluru',
  role: 'Product manager',
  employer: 'Orbit Labs',
  ctc: 4_200_000,
  /** Net salary credit, last working day of the month, into HDFC */
  monthlyNetCredit: 238_000,
  salaryAccountId: 'hdfc',
}

/** Household people. Membership state (invited, consented) lives in the store. */
export const people = {
  nikhil: { id: 'nikhil', name: 'Nikhil', fullName: 'Nikhil Mehra', relation: 'self', language: 'en', age: 33, city: 'Bengaluru' },
  shreya: { id: 'shreya', name: 'Shreya', relation: 'spouse', language: 'en' },
  suresh: { id: 'suresh', name: 'Suresh', fullName: 'Suresh Mehra', relation: 'father', language: 'hi', age: 64, city: 'Lucknow' },
  kavita: { id: 'kavita', name: 'Kavita', relation: 'mother', language: 'hi', age: 60, city: 'Lucknow' },
} as const

/** Keep this much in the salary account at all times */
export const buffer = { accountId: 'hdfc', amount: 100_000 as Rupees }

/** Monthly spending, about ₹75,000. "Other" is the remainder after the named categories. */
export const monthlySpend: SpendCategory[] = [
  { id: 'rent', label: 'Rent', monthly: 32_000 },
  { id: 'food', label: 'Food and quick commerce', monthly: 14_000 },
  { id: 'travel', label: 'Travel', monthly: 6_000 },
  { id: 'subscriptions', label: 'Subscriptions', monthly: 2_400 },
  { id: 'other', label: 'Other', monthly: 20_600 },
]

/* ---------- Rates used in the maths ---------- */

export const rates = {
  /** HDFC savings rate on idle cash */
  savings: 0.03,
  /** Sweep target */
  liquidFund: { name: 'ICICI Liquid Direct', yield: 0.068 },
  /** Extra a regular plan costs over the same fund's direct plan, a year */
  regularOverDirect: 0.008,
}

/* ---------- Banks (Account Aggregator) ---------- */

export const banks: BankAccount[] = [
  {
    id: 'hdfc',
    bank: 'HDFC Bank',
    short: 'HDFC',
    kind: 'salary',
    mask: '4471',
    balance: 518_400,
    interestRate: 0.03,
    sourceId: 'aa-hdfc',
    asOf: AS_OF,
  },
  {
    id: 'icici',
    bank: 'ICICI Bank',
    short: 'ICICI',
    kind: 'savings',
    mask: '9023',
    balance: 86_200,
    sourceId: 'aa-icici',
    asOf: AS_OF,
  },
  {
    id: 'kotak',
    bank: 'Kotak Mahindra Bank',
    short: 'Kotak',
    kind: 'savings',
    mask: '1188',
    balance: 22_100,
    note: 'Old, unused',
    sourceId: 'aa-kotak',
    asOf: AS_OF,
  },
]

/* ---------- Credit cards (Gmail statements) ---------- */

export const cards: CreditCard[] = [
  { id: 'regalia', issuer: 'HDFC', name: 'HDFC Regalia', mask: '3310', statement: 48_600, due: '2026-11-09', sourceId: 'gmail', asOf: AS_OF },
  { id: 'magnus', issuer: 'Axis', name: 'Axis Magnus', mask: '7752', statement: 31_200, due: '2026-11-12', sourceId: 'gmail', asOf: AS_OF },
  { id: 'amex', issuer: 'Amex', name: 'Amex Platinum Travel', mask: '2004', statement: 12_900, due: '2026-11-15', sourceId: 'gmail', asOf: AS_OF },
]

/* ---------- Mutual funds (AA via the RTAs) ---------- */

export const funds: MutualFund[] = [
  // Direct, on Groww
  {
    id: 'ppfas',
    name: 'Parag Parikh Flexi Cap',
    plan: 'direct',
    heldVia: 'Groww',
    lots: [{ value: 412_000 }],
    sourceId: 'aa-cams',
    asOf: AS_OF,
  },
  {
    id: 'uti-nifty',
    name: 'UTI Nifty 50 Index',
    plan: 'direct',
    heldVia: 'Groww',
    lots: [{ value: 304_000 }],
    sourceId: 'aa-kfintech',
    asOf: AS_OF,
  },
  {
    id: 'mirae-midcap',
    name: 'Mirae Asset Midcap',
    plan: 'direct',
    heldVia: 'Groww',
    // Bought Mar 2026 at a cost of ₹1,86,000; now ₹38,000 below cost
    lots: [{ value: 148_000, gain: -38_000, olderThanYear: false, bought: 'Mar 2026' }],
    sourceId: 'aa-kfintech',
    asOf: AS_OF,
  },
  // Regular, sold by the bank RM
  {
    id: 'hdfc-flexi-reg',
    name: 'HDFC Flexi Cap',
    plan: 'regular',
    heldVia: 'HDFC Bank RM',
    lots: [
      { value: 510_000, gain: 42_000, olderThanYear: true },
      { value: 110_000, olderThanYear: false },
    ],
    sourceId: 'aa-cams',
    asOf: AS_OF,
  },
  {
    id: 'axis-bluechip-reg',
    name: 'Axis Bluechip',
    plan: 'regular',
    heldVia: 'HDFC Bank RM',
    lots: [
      { value: 230_000, gain: 19_000, olderThanYear: true },
      { value: 250_000, olderThanYear: false },
    ],
    sourceId: 'aa-kfintech',
    asOf: AS_OF,
  },
]

export const sips: Sip[] = [
  { fundId: 'ppfas', amount: 20_000, dayOfMonth: 5 },
  { fundId: 'uti-nifty', amount: 15_000, dayOfMonth: 5 },
  { fundId: 'mirae-midcap', amount: 10_000, dayOfMonth: 5 },
]

/* ---------- Stocks (AA via the depository), Zerodha ---------- */

/*
  The spec gives only the total (₹4,32,000) and the four names. The split below is
  illustrative so each holding can render; it sums to the spec total (checked in tie-out).
*/
export const stocks = {
  broker: 'Zerodha',
  sourceId: 'aa-cdsl',
  asOf: AS_OF,
  holdings: [
    { id: 'reliance', name: 'Reliance Industries', value: 146_000 },
    { id: 'hdfcbank', name: 'HDFC Bank', value: 118_000 },
    { id: 'tataelxsi', name: 'Tata Elxsi', value: 92_000 },
    { id: 'dixon', name: 'Dixon Technologies', value: 76_000 },
  ] as StockHolding[],
}

/* ---------- ESOPs (Orbit Labs) ---------- */

export const esop = {
  company: 'Orbit Labs',
  vested: 1_200,
  buybackUnits: 800,
  buybackPrice: 1_000,
  /** Perquisite tax withheld at source */
  perquisiteTaxRate: 0.2,
  landsOn: '2026-11-04' as ISODate,
  sourceId: 'gmail',
  asOf: AS_OF,
}

/* ---------- Retirement ---------- */

export const nps = { tier: 1, value: 312_000 as Rupees, sourceId: 'aa-nps', asOf: AS_OF }
export const epf = { value: 624_000 as Rupees, sourceId: 'aa-epfo', asOf: AS_OF }

/* ---------- Loans ---------- */

export const loans: Loan[] = [
  {
    id: 'sbi-edu',
    lender: 'SBI',
    kind: 'Education loan (MBA)',
    outstanding: 680_000,
    rate: 0.092,
    rateType: 'floating',
    emi: 16_400,
    monthsLeft: 48,
    interestThisYear: 58_000,
    taxSection: '80E',
    sourceId: 'gmail',
    asOf: AS_OF,
  },
]

/* ---------- Insurance ---------- */

export const policies: Policy[] = [
  {
    id: 'corp-health',
    kind: 'health',
    name: 'Corporate health cover',
    cover: 500_000,
    covers: 'Nikhil',
    provider: 'Orbit Labs (employer)',
    sourceId: 'gmail',
    asOf: AS_OF,
  },
  {
    id: 'family-floater',
    kind: 'health',
    name: 'Family floater',
    cover: 1_000_000,
    covers: 'Nikhil and Shreya',
    premium: 18_600,
    premiumPer: 'year',
    premiumDue: '2026-11-13',
    sourceId: 'gmail',
    asOf: AS_OF,
  },
  {
    id: 'term',
    kind: 'term',
    name: 'Term cover',
    cover: 10_000_000,
    covers: 'Nikhil',
    premium: 11_200,
    premiumPer: 'year',
    note: 'Bought at 26, sized at a ₹12 L salary',
    sourceId: 'gmail',
    asOf: AS_OF,
  },
]

/** Salary the term cover was sized at (SPEC 5.2 card C) */
export const termSizedAtSalary: Rupees = 1_200_000

/* ---------- Wallets ---------- */

export const wallets: Wallet[] = [
  { id: 'swiggy', name: 'Swiggy Money', balance: 420, sourceId: 'sms' },
  { id: 'zomato', name: 'Zomato', balance: 1_180, sourceId: 'sms' },
  { id: 'blinkit', name: 'Blinkit', balance: 260, sourceId: 'sms' },
  { id: 'amazonpay', name: 'Amazon Pay', balance: 3_900, sourceId: 'sms' },
]

/* ---------- Subscriptions (found in Gmail) ---------- */

export const subscriptions: Subscription[] = [
  { id: 'netflix', name: 'Netflix', monthly: 649, sourceId: 'gmail' },
  { id: 'spotify', name: 'Spotify', monthly: 119, sourceId: 'gmail' },
  { id: 'cult', name: 'Cult', monthly: 1_650, unusedFor: '11 weeks', sourceId: 'gmail' },
  { id: 'notion', name: 'Notion', monthly: 800, unusedFor: '3 months', sourceId: 'gmail' },
]

/* ---------- Data sources (SPEC 4) ---------- */

const CONSENT_12M: ISODate = '2027-10-30'

export const dataSources: DataSource[] = [
  { id: 'aa-hdfc', name: 'HDFC', via: 'Account Aggregator', covers: 'Salary account', freshness: AS_OF, consentExpiry: CONSENT_12M },
  { id: 'aa-icici', name: 'ICICI', via: 'Account Aggregator', covers: 'Savings account', freshness: AS_OF, consentExpiry: CONSENT_12M },
  // Older consent from when this account was linked elsewhere; drives the "expires in 9 days" edge state (SPEC 9.5)
  { id: 'aa-kotak', name: 'Kotak', via: 'Account Aggregator', covers: 'Savings account', freshness: AS_OF, consentExpiry: '2026-11-21' },
  { id: 'aa-cams', name: 'CAMS', via: 'Account Aggregator', covers: 'Mutual funds', freshness: AS_OF, consentExpiry: CONSENT_12M },
  { id: 'aa-kfintech', name: 'KFintech', via: 'Account Aggregator', covers: 'Mutual funds', freshness: AS_OF, consentExpiry: CONSENT_12M },
  { id: 'aa-cdsl', name: 'CDSL', via: 'Account Aggregator', covers: 'Stocks (Zerodha)', freshness: AS_OF, consentExpiry: CONSENT_12M },
  { id: 'aa-nps', name: 'NPS CRA', via: 'Account Aggregator', covers: 'NPS Tier 1', freshness: AS_OF, consentExpiry: CONSENT_12M },
  { id: 'aa-epfo', name: 'EPFO', via: 'Account Aggregator', covers: 'EPF', freshness: AS_OF, consentExpiry: CONSENT_12M },
  { id: 'gmail', name: 'Gmail', via: 'Gmail', covers: 'Card statements, policies, loan and ESOP letters, subscriptions', freshness: AS_OF },
  { id: 'sms', name: 'SMS', via: 'SMS', covers: 'Wallet balances, payment alerts', freshness: AS_OF },
  // Suresh's own consent, given in moment 7
  { id: 'aa-sbi-suresh', name: 'SBI', via: 'Account Aggregator', covers: 'Savings and fixed deposit', freshness: AS_OF, consentExpiry: CONSENT_12M, memberId: 'suresh' },
]

/* ---------- Suresh Mehra (moment 7) ---------- */

export const suresh = {
  name: 'Suresh Mehra',
  age: 64,
  city: 'Lucknow',
  language: 'hi' as const,
  background: 'Retired PSU banker',
  savings: { id: 'suresh-sbi', bank: 'SBI', kind: 'savings' as const, balance: 240_000 as Rupees, sourceId: 'aa-sbi-suresh' },
  fd: {
    id: 'suresh-fd',
    bank: 'SBI',
    principal: 800_000 as Rupees,
    rate: 0.065,
    maturesOn: '2026-11-14' as ISODate,
    autoRenew: true,
    sourceId: 'aa-sbi-suresh',
  },
  /** Senior-citizen FD on offer at maturity (SPEC 5.7) */
  seniorFdRate: 0.074,
  pensionMonthly: 52_000 as Rupees,
  lic: { name: 'LIC Jeevan Anand', status: 'Paid up' },
  health: { name: 'Senior citizen health policy', cover: 300_000 as Rupees },
  /** Total income below the taxable limit for seniors, so Form 15H applies */
  form15H: true,
}
