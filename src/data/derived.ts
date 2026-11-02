/*
  Derived values (SPEC 2 "Derived"). Every total is computed here from the parts in
  persona.ts; no total is typed anywhere. Selectors take the persona as an argument
  (defaulting to the real one) so the tie-out can test them.

  Item 4: the store keeps a live copy of the persona (store.persona) that moves with the
  story; applyEffects below is the one place balances change. The sweep (SPEC 5.3) and the
  buyback split (SPEC 5.4) are computed here from whichever persona they are given.
*/
import * as P from './persona'
import type { ActionCard, Effect, FundLot, ISODateTime, MutualFund, Rule } from '../types'
import { fmtINR, fmtPct, istParts } from '../lib/format'
import { fundNotes } from '../copy/moments'

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

/* ---------- Item 4: the live persona and how balances move (SPEC 9.3) ---------- */

/** The liquid fund the sweeps go to; created by the first positive 'liquid' effect */
export const LIQUID_FUND_ID = 'icici-liquid'

/** A fresh copy of the snapshot: the store starts from this and reset() returns to it */
export const basePersona = (): PersonaData => ({ ...P })

/** Value of the liquid fund (0 until the first sweep) */
export function selectLiquid(p: PersonaData = P): number {
  return sum(p.funds.filter((f) => f.kind === 'liquid').map(fundValue))
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (at: ISODateTime) => {
  const d = istParts(at)
  return `${MONTHS[d.month]} ${d.year}`
}
const latest = (a: ISODateTime, b: ISODateTime) => (new Date(a).getTime() >= new Date(b).getTime() ? a : b)

/** Split `delta` pro rata to `weights`; the rounding remainder goes to the largest weight. */
export function prorate(weights: readonly number[], delta: number): number[] {
  const total = sum(weights)
  if (weights.length === 0) return []
  if (total <= 0) return weights.map((_, i) => (i === 0 ? delta : 0))
  const parts = weights.map((w) => Math.round((delta * w) / total))
  const rest = delta - sum(parts)
  if (rest !== 0) parts[weights.indexOf(Math.max(...weights))] += rest
  return parts
}

/** A purchase: a new lot at cost */
const boughtLot = (value: number, at: ISODateTime): FundLot => ({ value, gain: 0, olderThanYear: false, bought: monthLabel(at) })

function applyFund(p: PersonaData, id: string, e: Effect, at: ISODateTime, liquid: boolean): PersonaData {
  const f = p.funds.find((x) => x.id === id)
  if (!f) {
    if (e.delta <= 0) return p
    const created: MutualFund = liquid
      ? {
          id,
          name: p.rates.liquidFund.name,
          plan: 'direct',
          heldVia: fundNotes.via,
          kind: 'liquid',
          note: fundNotes.liquid(fmtPct(p.rates.liquidFund.yield)),
          lots: [boughtLot(e.delta, at)],
          sourceId: 'aa-cams',
          asOf: at,
        }
      : { id, name: e.name ?? id, plan: 'direct', heldVia: fundNotes.via, lots: [boughtLot(e.delta, at)], sourceId: 'aa-cams', asOf: at }
    return { ...p, funds: [...p.funds, created] }
  }
  const value = fundValue(f)
  // A sale of the whole holding (or a liquid fund drawn to zero) removes it.
  if (value + e.delta <= 0) return { ...p, funds: p.funds.filter((x) => x.id !== id) }
  let lots: FundLot[]
  if (liquid) {
    // One lot: liquid funds carry no gain worth tracking.
    lots = [{ ...f.lots[0], value: value + e.delta }]
  } else if (e.delta > 0) {
    lots = [...f.lots, boughtLot(e.delta, at)]
  } else {
    // A price move: every lot falls pro rata, and a known gain falls with it.
    const parts = prorate(
      f.lots.map((l) => l.value),
      e.delta,
    )
    lots = f.lots.map((l, i) => ({ ...l, value: l.value + parts[i], ...(l.gain !== undefined ? { gain: l.gain + parts[i] } : {}) }))
  }
  return { ...p, funds: p.funds.map((x) => (x.id === id ? { ...x, lots, asOf: at } : x)) }
}

function applyOne(p: PersonaData, e: Effect, at: ISODateTime): PersonaData {
  if (!e.delta) return p
  switch (e.target) {
    case 'account':
      if (!p.banks.some((b) => b.id === e.id)) return p
      return { ...p, banks: p.banks.map((b) => (b.id === e.id ? { ...b, balance: b.balance + e.delta, asOf: at } : b)) }
    case 'card':
      if (!p.cards.some((c) => c.id === e.id)) return p
      return { ...p, cards: p.cards.map((c) => (c.id === e.id ? { ...c, statement: c.statement + e.delta, asOf: at } : c)) }
    case 'loan':
      if (!p.loans.some((l) => l.id === e.id)) return p
      return {
        ...p,
        loans: p.loans.map((l) => {
          if (l.id !== e.id) return l
          const outstanding = l.outstanding + e.delta
          // The EMI stays; the tenure shortens in proportion.
          const monthsLeft = l.outstanding > 0 ? Math.max(0, Math.ceil((l.monthsLeft * outstanding) / l.outstanding)) : 0
          return { ...l, outstanding, monthsLeft, asOf: at }
        }),
      }
    case 'stocks': {
      const hs = p.stocks.holdings
      const parts = prorate(
        hs.map((h) => h.value),
        e.delta,
      )
      return { ...p, stocks: { ...p.stocks, asOf: at, holdings: hs.map((h, i) => ({ ...h, value: h.value + parts[i] })) } }
    }
    case 'liquid':
      return applyFund(p, e.id ?? LIQUID_FUND_ID, e, at, true)
    case 'fund':
      return e.id ? applyFund(p, e.id, e, at, false) : p
    case 'switch': {
      const f = p.funds.find((x) => x.id === e.id)
      if (!f || e.delta <= 0) return p
      const moving = sum(f.lots.filter((l) => l.olderThanYear === true).map((l) => l.value))
      if (moving <= 0) return p
      const keep = f.lots.filter((l) => l.olderThanYear !== true)
      const directId = `${f.id}-direct`
      const existing = p.funds.find((x) => x.id === directId)
      const direct: MutualFund = existing
        ? { ...existing, lots: [...existing.lots, boughtLot(moving, at)], asOf: at }
        : { id: directId, name: e.name ?? f.name, plan: 'direct', heldVia: fundNotes.via, lots: [boughtLot(moving, at)], sourceId: f.sourceId, asOf: at }
      // The direct plan sits right after the regular one it came from.
      const funds = p.funds
        .filter((x) => x.id !== directId)
        .flatMap((x) => (x.id === f.id ? [...(keep.length ? [{ ...x, lots: keep, asOf: at }] : []), direct] : [x]))
      return { ...p, funds }
    }
    case 'sip': {
      if (!e.id) return p
      const cur = p.sips.find((x) => x.fundId === e.id)
      if (!cur) {
        if (e.delta <= 0) return p
        return { ...p, sips: [...p.sips, { fundId: e.id, amount: e.delta, dayOfMonth: p.sips[0]?.dayOfMonth ?? 5 }] }
      }
      const amount = cur.amount + e.delta
      return { ...p, sips: amount > 0 ? p.sips.map((x) => (x === cur ? { ...x, amount } : x)) : p.sips.filter((x) => x !== cur) }
    }
    case 'member': {
      const s = p.suresh
      if (e.id === s.fd.id) return { ...p, suresh: { ...s, fd: { ...s.fd, principal: s.fd.principal + e.delta } } }
      if (e.id === s.savings.id) return { ...p, suresh: { ...s, savings: { ...s.savings, balance: s.savings.balance + e.delta } } }
      return p
    }
  }
}

/**
 * The persona after some effects (see the Effect doc in types.ts). Pure: returns a new
 * object, or the same one when nothing matched. AS_OF moves to `at` when anything changed.
 */
export function applyEffects(p: PersonaData, effects: readonly Effect[], at: ISODateTime): PersonaData {
  let next = p
  for (const e of effects) next = applyOne(next, e, at)
  return next === p ? p : { ...next, AS_OF: latest(at, p.AS_OF) }
}

/* ---------- Item 4: the salary sweep (SPEC 5.3) ---------- */

/** Rounds the sweep down to this (SPEC 5.3: the nearest ₹10,000) */
export const SWEEP_STEP = 10_000

/**
 * spare = salary account minus the buffer minus what is due before the next salary
 * (rent + EMI + SIPs + card bills + Diwali + living). The sweep is spare rounded down to
 * ₹10,000; zero means it skips. Diwali comes from the screens' budget (an input).
 */
export function selectSweep(p: PersonaData, extra: { diwali: number }) {
  const balance = p.banks.find((b) => b.id === p.buffer.accountId)?.balance ?? 0
  const rent = p.monthlySpend.find((c) => c.id === 'rent')?.monthly ?? 0
  const commitments = {
    rent,
    emi: sum(p.loans.filter((l) => l.outstanding > 0).map((l) => l.emi)),
    sips: selectSipsMonthly(p),
    cards: selectCardDues(p),
    diwali: extra.diwali,
    living: selectMonthlySpend(p) - rent,
  }
  const committed = sum(Object.values(commitments))
  const spare = balance - p.buffer.amount - committed
  const amount = Math.max(0, Math.floor(spare / SWEEP_STEP) * SWEEP_STEP)
  return { balance, buffer: p.buffer.amount, commitments, committed, spare, amount }
}

/* ---------- Item 4: the buyback split (SPEC 5.4) ---------- */

export interface SplitInputs {
  /** Prepayment the plan proposes (a spec input), capped at what is owed */
  prepay: number
  loanId: string
  /** Emergency fund target in months of spending (SPEC 2: six) */
  emergencyMonths: number
  /** Equal tranches for the rest */
  tranches: number
  /** Share of each tranche per direct fund (50/35/15) */
  split: readonly { fundId: string; share: number }[]
  /**
   * Most of the windfall the liquid top-up may take (e.g. 0.4), so a path where the
   * emergency fund is far from target still invests a sane share. Default: no cap.
   */
  topUpMaxShare?: number
}

/**
 * The buyback money in three lines: prepay the loan, top the liquid fund up to the
 * emergency target (at most topUpMaxShare of the windfall), and the rest into the direct
 * funds in equal tranches.
 */
export function selectEsopSplit(p: PersonaData, x: SplitInputs) {
  const net = selectEsop(p).net
  const loan = p.loans.find((l) => l.id === x.loanId)
  const prepay = Math.max(0, Math.min(x.prepay, loan?.outstanding ?? 0, net))
  const target = x.emergencyMonths * selectMonthlySpend(p)
  const liquidNow = selectLiquid(p)
  const capShare = x.topUpMaxShare ?? 1
  // Rounded down to ₹10,000 when the cap binds, so the line reads as a plan, not a remainder.
  const cap = capShare < 1 ? Math.floor((net * capShare) / 10_000) * 10_000 : net
  const topUp = Math.min(Math.max(0, target - liquidNow), net - prepay, cap)
  const rest = net - prepay - topUp
  // Tranches rounded down to ₹100; the last takes the remainder.
  const each = Math.floor(rest / x.tranches / 100) * 100
  const tranches = Array.from({ length: x.tranches }, (_, i) => (i === x.tranches - 1 ? rest - each * (x.tranches - 1) : each))
  /** One tranche across the funds; the rounding remainder goes to the largest share */
  const byFund = (amount: number) => {
    const parts = prorate(
      x.split.map((s) => s.share),
      amount,
    )
    return x.split.map((s, i) => ({ fundId: s.fundId, amount: parts[i] }))
  }
  return {
    net,
    prepay,
    loan,
    interestSaved: Math.round(prepay * (loan?.rate ?? 0)),
    target,
    liquidNow,
    topUp,
    rest,
    tranches,
    byFund,
  }
}
