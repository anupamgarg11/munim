/*
  Inputs the app screens need that persona.ts does not carry yet. Parts only, never
  totals: every total on screen is computed from these and persona.ts in selectors.ts.
  Candidates to move into persona.ts in a later pass.
*/
import type { ISODateTime, Rupees } from '../types'

/* ---------- Spending (SPEC 3, 9.3, 9.5) ---------- */

/** Budget categories, as in persona.monthlySpend */
export type BudgetId = 'rent' | 'food' | 'travel' | 'subscriptions' | 'other'

/** Fine categories a transaction carries; each rolls up into one budget category. */
export type SpendCategoryId = 'groceries' | 'food-delivery' | 'household' | 'shopping' | 'travel'

export const spendCategoryBudget: Record<SpendCategoryId, BudgetId> = {
  groceries: 'food',
  'food-delivery': 'food',
  household: 'other',
  shopping: 'other',
  travel: 'travel',
}

export interface SpendTxn {
  id: string
  /** Corrections are remembered per merchant (SPEC 1.9) */
  merchantId: string
  merchant: string
  amount: Rupees
  category: SpendCategoryId
  at: ISODateTime
  /** Counts against the Diwali budget */
  diwali?: boolean
}

/** Recent transactions from SMS alerts, before the snapshot (illustrative). */
export const recentSpends: SpendTxn[] = [
  { id: 't-blinkit', merchantId: 'blinkit', merchant: 'Blinkit', amount: 1_180, category: 'groceries', at: '2026-10-28T20:40:00+05:30' },
  { id: 't-swiggy', merchantId: 'swiggy', merchant: 'Swiggy', amount: 640, category: 'food-delivery', at: '2026-10-28T13:05:00+05:30' },
  { id: 't-uber', merchantId: 'uber', merchant: 'Uber', amount: 420, category: 'travel', at: '2026-10-27T09:12:00+05:30' },
  { id: 't-amazon', merchantId: 'amazon', merchant: 'Amazon', amount: 2_340, category: 'shopping', at: '2026-10-26T19:30:00+05:30' },
]

/*
  Month-to-date spend before the recent transactions above (illustrative). Rent and
  subscriptions are not listed: rent is paid in full on the 1st and every subscription
  has billed, so both are computed from persona.ts.
*/
export const spendEarlierThisMonth: Partial<Record<BudgetId, Rupees>> = {
  food: 11_460,
  travel: 6_900,
  other: 14_100,
}

/** Diwali budget earmarked from the October salary (SPEC 5.3) */
export const diwaliBudget = { amount: 25_000 as Rupees, date: '2026-11-08', earmarkedAtMoment: 3 }

/* ---------- Protection ---------- */

/** Rule of thumb for term cover: this many times annual income, rounded to the nearest crore */
export const termCoverIncomeMultiple = 10

/* ---------- Caps (SPEC 5.8) ---------- */

export const caps = {
  /** UPI Reserve Pay limit for wallet top-ups, a month */
  reservePayMonthly: 2_000 as Rupees,
  /** A new payee waits this long before Munim pays it */
  newPayeeCoolingHours: 24,
  /** Every automated action waits this long (SPEC 1.4) */
  holdMinutes: 10,
}

/* ---------- Plans (SPEC 5.8) ---------- */

export type PlanId = 'free' | 'plus' | 'family' | 'managed'

export const plans: { id: PlanId; pricePerYear?: Rupees; members?: number; minAssets?: Rupees; feeRate?: number }[] = [
  { id: 'free', pricePerYear: 0 },
  { id: 'plus', pricePerYear: 1_999 },
  { id: 'family', pricePerYear: 2_999, members: 6 },
  { id: 'managed', minAssets: 2_500_000, feeRate: 0.005 },
]

/** Nikhil's plan in the story */
export const currentPlan: PlanId = 'plus'

/* ---------- Consent ---------- */

/** Account Aggregator consents run this long (SPEC 5.1) */
export const consentMonths = 12
/** Show the renew warning when a consent ends within this many days */
export const consentWarnDays = 30
