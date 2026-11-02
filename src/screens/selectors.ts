/*
  Computed values for the app screens. Everything here is derived from persona.ts,
  derived.ts, screenData.ts and the store; nothing is typed as a total.
  Item 4: functions that read balances take the persona as their last argument (default:
  the snapshot). Screens pass the live one from usePersona(), so numbers move with the story.
*/
import * as P from '../data/persona'
import { useMunim } from '../store'
import {
  fundCost,
  fundGain,
  fundValue,
  selectEsop,
  selectIdleAboveBuffer,
  selectInvestments,
  selectMonthlySpend,
  selectSubscriptionsMonthly,
  selectSweep,
  sum,
  type PersonaData,
} from '../data/derived'
import { toIST } from '../lib/actions'
import { fmtDate, fmtINR, fmtLakh, fmtPct, istParts, type DateInput } from '../lib/format'
import { common, moneyCopy, sourceVia } from '../copy/screens'
import type { ActionCard, ActionStatus, ActionType, DataSource, ISODate, ISODateTime, Message, Rupees } from '../types'
import {
  caps,
  consentMonths,
  diwaliBudget,
  recentSpends,
  spendCategoryBudget,
  spendEarlierThisMonth,
  termCoverIncomeMultiple,
  type BudgetId,
  type SpendCategoryId,
  type SpendTxn,
} from './screenData'
import type { HoldingKind, HoldingRef } from './uiStore'

const DAY_MS = 86_400_000
const CRORE = 10_000_000

/* ---------- Dates ---------- */

/** Whole IST calendar days from one date to another (positive when `to` is later). */
export function daysBetween(from: DateInput, to: DateInput): number {
  const a = istParts(from)
  const b = istParts(to)
  return Math.round((Date.UTC(b.year, b.month, b.day) - Date.UTC(a.year, a.month, a.day)) / DAY_MS)
}

/** The same IST calendar day, `months` later, as "2027-10-29". */
export function addMonths(from: DateInput, months: number): ISODate {
  const p = istParts(from)
  const d = new Date(Date.UTC(p.year, p.month + months, p.day))
  return d.toISOString().slice(0, 10)
}

/** The weekly brief goes out on Sunday at 6 pm IST (SPEC 1.7): the first one on or after `from`. */
export function nextBriefAt(from: DateInput): ISODateTime {
  const p = istParts(from)
  const ahead = (7 - p.weekday) % 7
  // 6 pm IST is 12:30 UTC
  return new Date(Date.UTC(p.year, p.month, p.day + ahead, 12, 30)).toISOString()
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const monthName = (d: DateInput) => MONTH_NAMES[istParts(d).month]

/** "9:42" from milliseconds left */
export function clock(msLeft: number): string {
  const s = Math.max(0, Math.ceil(msLeft / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/* ---------- Freshness (SPEC 1.8) ---------- */

const IST_OFFSET_MS = 330 * 60 * 1000
const msOf = (at: DateInput) => new Date(typeof at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(at) ? `${at}T12:00:00+05:30` : at).getTime()

/** Sources refresh daily at the snapshot's time of day (9:14 am): the last refresh at or before `clock` */
export function lastRefresh(clock: ISODateTime): ISODateTime {
  const snap = istParts(P.AS_OF)
  const c = istParts(clock)
  let t = Date.UTC(c.year, c.month, c.day, snap.hour, snap.minute) - IST_OFFSET_MS
  if (t > msOf(clock)) t -= DAY_MS
  return toIST(Math.max(t, msOf(P.AS_OF)))
}

/** What an "as of" line shows: the record's own time or the day's refresh, whichever is later, never after now */
export function freshAsOf(asOf: ISODateTime, clock: ISODateTime): ISODateTime {
  const t = Math.max(msOf(asOf), msOf(lastRefresh(clock)))
  return toIST(Math.min(t, Math.max(msOf(clock), msOf(asOf))))
}

/* ---------- Live persona (item 4) ---------- */

/** The live persona from the store: balances after every completed card and story event */
export const usePersona = (): PersonaData => useMunim((s) => s.persona)
export type { PersonaData }

/* ---------- Sources ---------- */

export const sourceById = (id: string): DataSource | undefined => P.dataSources.find((s) => s.id === id)

export function sourceLabel(src: DataSource): string {
  return sourceVia[src.via](src.name)
}

/* ---------- Cash ---------- */

export function idleCallout(p: PersonaData = P) {
  const hdfc = p.banks.find((b) => b.id === p.buffer.accountId)
  return moneyCopy.idleCallout(fmtLakh(selectIdleAboveBuffer(p)), fmtLakh(p.buffer.amount), fmtPct(hdfc?.interestRate ?? p.rates.savings))
}

/**
 * After the salary (SPEC 5.3): what is spare in the salary account once the month's
 * commitments and the buffer are kept, less money already on its way out (held, scheduled or
 * retrying cards; card bills are already in the commitments).
 */
export function spareAfterCommitments(p: PersonaData, actions: readonly ActionCard[]): Rupees {
  const plan = selectSweep(p, { diwali: diwaliBudget.amount })
  const leaving = actions
    .filter((a) => ['approved', 'held', 'running', 'failed'].includes(a.status) && !a.effects?.some((e) => e.target === 'card'))
    .flatMap((a) => a.effects ?? [])
    .filter((e) => e.target === 'account' && e.id === p.buffer.accountId && e.delta < 0)
  return plan.spare - sum(leaving.map((e) => -e.delta))
}

/* ---------- Funds ---------- */

/** What a regular plan costs over its direct plan, a year (sums to the SPEC's ₹8,800) */
export const regularCostPerYear = (fundId: string, p: PersonaData = P): Rupees => {
  const f = p.funds.find((x) => x.id === fundId)
  return f && f.plan === 'regular' ? Math.round(fundValue(f) * p.rates.regularOverDirect) : 0
}

export const sipFor = (fundId: string, p: PersonaData = P) => p.sips.find((s) => s.fundId === fundId)

/* ---------- Protection ---------- */

/** Term cover the income supports, rounded to the nearest crore (SPEC: about ₹4 Cr) */
export function termShouldBe(p: PersonaData = P): Rupees {
  return Math.round((p.profile.ctc * termCoverIncomeMultiple) / CRORE) * CRORE
}

export function termLine(p: PersonaData = P): string {
  return moneyCopy.termShouldBe(fmtLakh(p.termSizedAtSalary), fmtLakh(p.profile.ctc), fmtLakh(termShouldBe(p)))
}

/* ---------- Spending ---------- */

/**
 * Budget by category. Subscriptions is the sum of the subscription list and Other is
 * the remainder, so the month still totals persona's monthly spend (SPEC 2).
 */
export function spendBudget(): { id: BudgetId; label: string; budget: Rupees }[] {
  const total = selectMonthlySpend()
  const label = (id: BudgetId) => P.monthlySpend.find((c) => c.id === id)?.label ?? id
  const fixed = P.monthlySpend
    .filter((c) => c.id !== 'subscriptions' && c.id !== 'other')
    .map((c) => ({ id: c.id as BudgetId, label: c.label, budget: c.monthly }))
  const subs = { id: 'subscriptions' as BudgetId, label: label('subscriptions'), budget: selectSubscriptionsMonthly() }
  const named = [...fixed, subs]
  const other = { id: 'other' as BudgetId, label: label('other'), budget: total - sum(named.map((c) => c.budget)) }
  return [...named, other]
}

export const txnCategory = (t: SpendTxn, overrides: Record<string, SpendCategoryId>): SpendCategoryId =>
  overrides[t.merchantId] ?? t.category

/** This month against budget. Recent transactions roll up through their (possibly corrected) category. */
export function spendThisMonth(overrides: Record<string, SpendCategoryId>) {
  return spendBudget().map((c) => {
    const listed = sum(recentSpends.filter((t) => spendCategoryBudget[txnCategory(t, overrides)] === c.id).map((t) => t.amount))
    // Rent is paid on the 1st and every subscription has billed: both are spent in full.
    const fullyPaid = c.id === 'rent' || c.id === 'subscriptions'
    const spent = fullyPaid ? c.budget : (spendEarlierThisMonth[c.id] ?? 0) + listed
    return { ...c, spent }
  })
}

export function diwaliSpent(): Rupees {
  return sum(recentSpends.filter((t) => t.diwali).map((t) => t.amount))
}

export { diwaliBudget }

/* ---------- Actions ---------- */

export type ActionGroup = 'needs' | 'held' | 'scheduled' | 'done'
export const GROUP_ORDER: ActionGroup[] = ['needs', 'held', 'scheduled', 'done']

const GROUP_OF: Record<ActionStatus, ActionGroup> = {
  proposed: 'needs',
  held: 'held',
  approved: 'scheduled',
  running: 'scheduled',
  // A failed run retries on its own (SPEC 9.5), so it sits with what is scheduled.
  failed: 'scheduled',
  done: 'done',
  cancelled: 'done',
}

export const groupOf = (a: ActionCard): ActionGroup => GROUP_OF[a.status]

/** Held and scheduled actions, soonest first: Home's "Up next" */
export function upNext(actions: readonly ActionCard[]): ActionCard[] {
  return actions
    .filter((a) => groupOf(a) === 'held' || groupOf(a) === 'scheduled')
    .sort((a, b) => (a.holdEndsAt ?? Infinity) - (b.holdEndsAt ?? Infinity))
}

export function actionText(a: ActionCard): string {
  return `${a.title} ${a.why} ${a.railDetail ?? ''}`.toLowerCase()
}

/** One holding's tie to actions: an action matches if its type is listed (or none are) and its text has one of the words (or none are). */
interface Matcher {
  types?: ActionType[]
  words?: string[]
}

export function relatedActions(actions: readonly ActionCard[], matchers: Matcher[]): ActionCard[] {
  return actions.filter((a) =>
    matchers.some((m) => {
      const typeOk = !m.types || m.types.includes(a.type)
      const text = actionText(a)
      const wordOk = !m.words || m.words.some((w) => text.includes(w.toLowerCase()))
      return typeOk && wordOk
    }),
  )
}

/* ---------- Home ---------- */

/** Same IST calendar day */
export const sameDay = (a: DateInput, b: DateInput) => daysBetween(a, b) === 0

/** The latest day's Munim messages in Nikhil's thread, last three (chips skipped). */
export function latestMunim(messages: readonly Message[]): Message[] {
  const mine = messages.filter((m) => m.thread === 'nikhil' && m.from === 'munim' && m.kind !== 'chips')
  const last = mine[mine.length - 1]
  if (!last) return []
  return mine.filter((m) => sameDay(m.at, last.at)).slice(-3)
}

/* ---------- Money: holding detail ---------- */

export type Tone = 'warning' | 'negative' | 'positive'

export interface HoldingDetail {
  title: string
  subtitle?: string
  amount: Rupees
  /** Display override for the amount, e.g. a cover in crores */
  amountText?: string
  /** e.g. "a month", or "Not in net worth" */
  amountNote?: string
  /** Show the amount as owed (red) */
  owed?: boolean
  facts: { label: string; value: string; tone?: Tone }[]
  source?: DataSource
  asOf: ISODateTime
  matchers: Matcher[]
}

const F = moneyCopy.fact
const V = moneyCopy.value

export function holdingDetail(ref: HoldingRef, p: PersonaData = P): HoldingDetail | null {
  const build = DETAIL[ref.kind]
  return build(ref.id, p)
}

const DETAIL: Record<HoldingKind, (id: string, p: PersonaData) => HoldingDetail | null> = {
  bank: (id, p) => {
    const b = p.banks.find((x) => x.id === id)
    if (!b) return null
    const isBuffer = b.id === p.buffer.accountId
    const facts: HoldingDetail['facts'] = []
    if (isBuffer) {
      facts.push({ label: F.buffer, value: fmtINR(p.buffer.amount) })
      facts.push({ label: F.aboveBuffer, value: fmtINR(selectIdleAboveBuffer(p)), tone: 'warning' })
    }
    if (b.interestRate !== undefined) facts.push({ label: F.earns, value: V.perYear(fmtPct(b.interestRate)) })
    if (b.note) facts.push({ label: F.note, value: b.note })
    return {
      title: b.bank,
      subtitle: `${moneyCopy.accountKind[b.kind]} ${common.mask(b.mask)}`,
      amount: b.balance,
      facts,
      source: sourceById(b.sourceId),
      asOf: b.asOf,
      matchers: isBuffer
        ? [{ types: ['sweep'] }, { words: [common.mask(b.mask), `${b.short} salary`] }]
        : [{ words: [common.mask(b.mask), `${b.short} savings`] }],
    }
  },

  card: (id, p) => {
    const c = p.cards.find((x) => x.id === id)
    if (!c) return null
    return {
      title: c.name,
      subtitle: common.mask(c.mask),
      amount: c.statement,
      owed: true,
      // Paid: no Due row; when it was paid instead.
      facts: [
        { label: F.statement, value: fmtINR(c.statement) },
        c.statement <= 0 ? { label: F.paidOn, value: fmtDate(c.asOf), tone: 'positive' as Tone } : { label: F.due, value: fmtDate(c.due) },
      ],
      source: sourceById(c.sourceId),
      asOf: c.asOf,
      matchers: [{ types: ['pay'], words: [c.name, c.mask, 'card bill'] }],
    }
  },

  fund: (id, p) => {
    const f = p.funds.find((x) => x.id === id)
    if (!f) return null
    const facts: HoldingDetail['facts'] = [
      { label: F.plan, value: V.plan[f.plan] },
      { label: F.heldVia, value: f.heldVia },
    ]
    if (f.plan === 'regular') {
      facts.push({ label: F.extraCost, value: V.perYear(fmtINR(regularCostPerYear(f.id, p))), tone: 'warning' })
      const older = f.lots.filter((l) => l.olderThanYear === true)
      const newer = f.lots.filter((l) => l.olderThanYear === false)
      if (older.length) {
        facts.push({
          label: F.olderLots,
          value: V.withGain(fmtINR(sum(older.map((l) => l.value))), fmtINR(sum(older.map((l) => l.gain ?? 0)))),
        })
      }
      if (newer.length) facts.push({ label: F.newerLots, value: fmtINR(sum(newer.map((l) => l.value))) })
    } else if (fundGain(f) < 0) {
      facts.push({ label: F.cost, value: fmtINR(fundCost(f)) })
      facts.push({ label: F.belowCost, value: fmtINR(fundGain(f)), tone: 'negative' })
      const bought = f.lots.find((l) => l.bought)?.bought
      if (bought) facts.push({ label: F.bought, value: bought })
    }
    const sip = sipFor(f.id, p)
    if (sip) facts.push({ label: F.sip, value: V.sip(fmtINR(sip.amount), common.ordinal(sip.dayOfMonth)) })
    if (f.note) facts.push({ label: F.note, value: f.note })
    const name = f.name.split(' ').slice(0, 2).join(' ')
    const matchers: Matcher[] = [{ types: ['invest', 'harvest', 'switch'], words: [name] }]
    if (f.plan === 'regular') matchers.push({ types: ['switch'] })
    if (fundGain(f) < 0) matchers.push({ types: ['harvest'] })
    // The liquid fund (item 4) is where the sweeps and the buyback top-up land.
    if (f.kind === 'liquid') matchers.push({ types: ['sweep'] }, { words: [f.name] })
    return {
      title: f.name,
      subtitle: common.dot(V.plan[f.plan], f.heldVia),
      amount: fundValue(f),
      facts,
      source: sourceById(f.sourceId),
      asOf: f.asOf,
      matchers,
    }
  },

  stock: (id, p) => {
    const h = p.stocks.holdings.find((x) => x.id === id)
    if (!h) return null
    const total = selectInvestments(p).stocks
    return {
      title: h.name,
      subtitle: p.stocks.broker,
      amount: h.value,
      facts: [
        { label: F.broker, value: p.stocks.broker },
        { label: F.shareOfStocks, value: V.share(fmtPct(h.value / total, 0)) },
      ],
      source: sourceById(p.stocks.sourceId),
      asOf: p.stocks.asOf,
      matchers: [{ words: [h.name, p.stocks.broker] }],
    }
  },

  nps: (_id, p) => ({
    title: moneyCopy.nps(p.nps.tier),
    amount: p.nps.value,
    facts: [{ label: F.tier, value: String(p.nps.tier) }],
    source: sourceById(p.nps.sourceId),
    asOf: p.nps.asOf,
    matchers: [{ words: ['NPS'] }],
  }),

  epf: (_id, p) => ({
    title: moneyCopy.epf,
    amount: p.epf.value,
    facts: [{ label: F.employer, value: p.profile.employer }],
    source: sourceById(p.epf.sourceId),
    asOf: p.epf.asOf,
    matchers: [{ words: ['EPF'] }],
  }),

  esop: (_id, p) => {
    const e = selectEsop(p)
    const x = p.esop
    return {
      title: moneyCopy.esop(x.company),
      subtitle: moneyCopy.esopVested(e.remainingUnits.toLocaleString('en-IN')),
      amount: e.remainingValue,
      amountNote: moneyCopy.esopNotCounted,
      facts: [
        { label: F.vested, value: V.units(x.vested.toLocaleString('en-IN')) },
        { label: F.inBuyback, value: V.unitsAt(x.buybackUnits.toLocaleString('en-IN'), fmtINR(x.buybackPrice)) },
        { label: F.buybackNet, value: V.afterTax(fmtINR(e.net), fmtPct(x.perquisiteTaxRate)) },
        { label: F.lands, value: fmtDate(x.landsOn) },
        { label: F.remaining, value: V.remaining(e.remainingUnits.toLocaleString('en-IN'), fmtINR(e.remainingValue)) },
        { label: F.netWorth, value: V.notCounted },
      ],
      source: sourceById(x.sourceId),
      asOf: x.asOf,
      matchers: [{ words: ['ESOP', 'buyback', x.company] }],
    }
  },

  loan: (id, p) => {
    const l = p.loans.find((x) => x.id === id)
    if (!l) return null
    return {
      title: `${l.lender} ${l.kind.charAt(0).toLowerCase()}${l.kind.slice(1)}`,
      amount: l.outstanding,
      owed: true,
      facts: [
        { label: F.rate, value: V.rate(fmtPct(l.rate), V.rateType[l.rateType]) },
        { label: F.emi, value: fmtINR(l.emi) },
        { label: F.monthsLeft, value: String(l.monthsLeft) },
        { label: F.interestThisYear, value: V.deductible(fmtINR(l.interestThisYear), l.taxSection) },
        ...(l.rateType === 'floating' ? [{ label: F.prepayment, value: V.noPenalty }] : []),
      ],
      source: sourceById(l.sourceId),
      asOf: l.asOf,
      matchers: [{ types: ['prepay'] }, { words: [`${l.lender} loan`, 'education loan'] }],
    }
  },

  policy: (id, p) => {
    const pol = p.policies.find((x) => x.id === id)
    if (!pol) return null
    const facts: HoldingDetail['facts'] = [
      { label: F.cover, value: fmtLakh(pol.cover) },
      { label: F.covers, value: pol.covers },
    ]
    if (pol.provider) facts.push({ label: F.provider, value: pol.provider })
    if (pol.premium) facts.push({ label: F.premium, value: V.perYear(fmtINR(pol.premium)) })
    if (pol.premiumDue) facts.push({ label: F.premiumDue, value: fmtDate(pol.premiumDue) })
    if (pol.kind === 'term') facts.push({ label: F.shouldBe, value: V.aboutCover(fmtLakh(termShouldBe(p))), tone: 'warning' })
    if (pol.note) facts.push({ label: F.note, value: pol.note })
    return {
      title: pol.name,
      subtitle: moneyCopy.coverFor(pol.covers),
      amount: pol.cover,
      amountText: fmtLakh(pol.cover),
      facts,
      source: sourceById(pol.sourceId),
      asOf: pol.asOf,
      matchers: pol.kind === 'term' ? [{ types: ['insure'] }, { words: ['term'] }] : [{ words: [pol.name, 'floater', 'health cover'] }],
    }
  },

  wallet: (id, p) => {
    const w = p.wallets.find((x) => x.id === id)
    if (!w) return null
    const src = sourceById(w.sourceId)
    return {
      title: w.name,
      amount: w.balance,
      facts: [{ label: F.topUps, value: V.reservePay(fmtINR(caps.reservePayMonthly)) }],
      source: src,
      asOf: src?.freshness ?? p.AS_OF,
      matchers: [{ words: [w.name, 'wallet'] }],
    }
  },

  subscription: (id, p) => {
    const s = p.subscriptions.find((x) => x.id === id)
    if (!s) return null
    const src = sourceById(s.sourceId)
    return {
      title: s.name,
      amount: s.monthly,
      amountNote: moneyCopy.aMonth,
      facts: [
        { label: F.monthly, value: V.monthly(fmtINR(s.monthly)) },
        { label: F.yearly, value: fmtINR(s.monthly * 12) },
        { label: F.lastUsed, value: s.unusedFor ? V.unused(s.unusedFor) : V.inUse, tone: s.unusedFor ? 'warning' : undefined },
      ],
      source: src,
      asOf: src?.freshness ?? p.AS_OF,
      matchers: [{ words: [s.name, 'subscription'] }],
    }
  },
}

/* ---------- Consent ---------- */

/** A renewed consent runs consentMonths from today (the demo clock) */
export function consentRenewal(clock: ISODateTime): ISODate {
  return addMonths(clock, consentMonths)
}
