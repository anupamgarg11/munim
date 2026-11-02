/*
  Derived values (SPEC 2 "Derived"). Every total is computed here from the parts in
  persona.ts; no total is typed anywhere. Selectors take the persona as an argument
  (defaulting to the real one) so the tie-out can test them.
*/
import * as P from './persona'
import type { ActionCard, MutualFund, Rule } from '../types'
import { fmtINR } from '../lib/format'

export type PersonaData = typeof P

export const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0)

/* ---------- Funds ---------- */

export const fundValue = (f: MutualFund): number => sum(f.lots.map((l) => l.value))
/** Unrealised gain where known (negative for a loss) */
export const fundGain = (f: MutualFund): number => sum(f.lots.map((l) => l.gain ?? 0))
/** Cost = value minus gain, for lots whose gain is known */
export const fundCost = (f: MutualFund): number =>
  sum(f.lots.filter((l) => l.gain !== undefined).map((l) => l.value - (l.gain ?? 0)))

/* ---------- Cash ---------- */

export function selectCash(p: PersonaData = P): number {
  return sum(p.banks.map((b) => b.balance))
}

/** Salary-account balance above the buffer (SPEC: ₹4,18,400) */
export function selectIdleAboveBuffer(p: PersonaData = P): number {
  const acct = p.banks.find((b) => b.id === p.buffer.accountId)
  if (!acct) return 0
  return Math.max(0, acct.balance - p.buffer.amount)
}

export function selectWallets(p: PersonaData = P): number {
  return sum(p.wallets.map((w) => w.balance))
}

/* ---------- Investments ---------- */

export function selectInvestments(p: PersonaData = P) {
  const mutualFunds = sum(p.funds.map(fundValue))
  const stocks = sum(p.stocks.holdings.map((h) => h.value))
  const nps = p.nps.value
  const epf = p.epf.value
  return { mutualFunds, stocks, nps, epf, total: mutualFunds + stocks + nps + epf }
}

export function selectSipsMonthly(p: PersonaData = P): number {
  return sum(p.sips.map((s) => s.amount))
}

/** Regular plans and what they cost over direct (SPEC: ₹11 L, ₹8,800 a year) */
export function selectRegularPlans(p: PersonaData = P) {
  const regular = p.funds.filter((f) => f.plan === 'regular')
  const lots = regular.flatMap((f) => f.lots)
  const value = sum(regular.map(fundValue))
  const older = lots.filter((l) => l.olderThanYear === true)
  return {
    value,
    dragPerYear: Math.round(value * p.rates.regularOverDirect),
    olderThanYear: { value: sum(older.map((l) => l.value)), gain: sum(older.map((l) => l.gain ?? 0)) },
    newer: { value: sum(lots.filter((l) => l.olderThanYear === false).map((l) => l.value)) },
  }
}

/** ESOP buyback maths. The remaining vested shares are shown, not counted in net worth. */
export function selectEsop(p: PersonaData = P) {
  const e = p.esop
  const gross = e.buybackUnits * e.buybackPrice
  const tax = Math.round(gross * e.perquisiteTaxRate)
  const remainingUnits = e.vested - e.buybackUnits
  return { gross, tax, net: gross - tax, remainingUnits, remainingValue: remainingUnits * e.buybackPrice }
}

/* ---------- Liabilities ---------- */

export function selectCardDues(p: PersonaData = P): number {
  return sum(p.cards.map((c) => c.statement))
}

export function selectLoans(p: PersonaData = P): number {
  return sum(p.loans.map((l) => l.outstanding))
}

/* ---------- Net worth ---------- */

/** Net worth = cash + investments minus loans minus card dues (SPEC: ₹31,86,000) */
export function selectNetWorth(p: PersonaData = P) {
  const cash = selectCash(p)
  const investments = selectInvestments(p).total
  const loans = selectLoans(p)
  const cardDues = selectCardDues(p)
  return { cash, investments, loans, cardDues, total: cash + investments - loans - cardDues }
}

/* ---------- Spending ---------- */

export function selectMonthlySpend(p: PersonaData = P): number {
  return sum(p.monthlySpend.map((c) => c.monthly))
}

export function selectSubscriptionsMonthly(p: PersonaData = P): number {
  return sum(p.subscriptions.map((s) => s.monthly))
}

/* ---------- Found this year (SPEC 6) ---------- */

/** Sums done cards only; skipped, cancelled or failed cards do not count. Family is shown separately. */
export function computeFound(actions: readonly ActionCard[]) {
  const done = actions.filter((a) => a.status === 'done' && a.found)
  const by = (scope: 'self' | 'family') =>
    sum(done.filter((a) => a.found?.scope === scope).map((a) => a.found?.amount ?? 0))
  return { self: by('self'), family: by('family') }
}

/* ---------- Rules ---------- */

/** "When [trigger], [action], up to [cap]. Runs via [rail]. Hold 10 min." */
export function ruleSentence(r: Rule): string {
  return `When ${r.trigger}, ${r.action}, up to ${fmtINR(r.capPerRun)}. Runs via ${r.rail}. Hold ${r.holdMinutes} min.`
}
