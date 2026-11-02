/*
  Moments 5 to 8 go in ./moments5to8.ts: `export const moments5to8: MomentDef[]`, types and helpers from './kit'.
  It is picked up by import.meta.glob below, so the build passes with or without that file.

  The story, moments 1 to 4 (SPEC 5.1 to 5.4, 6, 7). The runner sets the clock and the
  moment; each run plays its WhatsApp script through the chat engine and creates its cards
  with effects. Every number is computed from the live persona at the moment it is shown.
*/
import { useMunim } from '../store'
import {
  SWEEP_STEP,
  selectCardDues,
  selectEsop,
  selectEsopSplit,
  selectIdleAboveBuffer,
  selectRegularPlans,
  selectSipsMonthly,
  selectSweep,
  sum,
  type PersonaData,
} from '../data/derived'
import { termShouldBe } from '../screens/selectors'
import { diwaliBudget } from '../screens/screenData'
import { assumptions } from '../chat/facts'
import type { ScriptStep } from '../chat/engine'
import { HOLD_MINUTES, addMinutes, fmtCountdown } from '../lib/actions'
import { fmtTime } from '../lib/format'
import { insertMessage } from '../chat/engine'
import { momentTitles } from '../copy/shell'
import { commentary, fundShort, m1, m2, m3, m4 } from '../copy/moments'
import { RULE_IDS } from './rules'
import {
  addDays,
  addWorkingDays,
  advancingChips,
  autoChips,
  nextDayOfMonth,
  nextSalaryDay,
  stamp,
  unitsBy,
  whenDone,
  type MomentContext,
  type MomentDef,
} from './kit'
import type { ActionCard, ActionDraft, CreditCard, Effect, ISODateTime, Message, Moment } from '../types'

export type { Commentary, MomentContext, MomentDef } from './kit'

/** Card and message ids, for other items that need to point at them */
export const IDS = {
  cardA: 'm2-idle-cash',
  cardB: 'm2-regular-to-direct',
  cardC: 'm2-term-cover',
  subs: 'm2-subscriptions',
  bill: (cardId: string) => `m3-bill-${cardId}`,
  sweep: 'm3-sweep',
  split: 'm4-buyback-split',
  tranche: (n: number) => `m4-tranche-${n}`,
}

/** Spec inputs the cards quote (proposals and quotes, not totals) */
const INPUTS = {
  /** SPEC 5.2 card A: the sweep is rounded down to this */
  sweepStepA: 100_000,
  /** SPEC 5.2 card B: what switching everything today would cost in exit load and tax */
  switchAllTodayCost: 3_100,
  /** SPEC 5.2 card B: a switch completes in this many working days */
  switchDays: 3,
  /** SPEC 5.4: the prepayment the split proposes */
  esopPrepay: 200_000,
  loanId: 'sbi-edu',
  /** SPEC 2: emergency fund = six months of spending */
  emergencyMonths: 6,
  /** UPI's per-payment limit, why big money uses the bank mandate (SPEC 5.4) */
  upiLimit: 100_000,
  /** A lost deduction costs tax at the 30% slab plus 4% cess */
  marginalTax: 0.312,
  /** SPEC 5.4: tranches go two weeks apart (Tue 3 Nov, Tue 17 Nov, Tue 1 Dec) */
  trancheGapDays: 14,
  /** SPEC 5.4: SBI's prepayment reference */
  prepayRef: '8821',
  /** Tranches run at this time on their day */
  runTime: '09:00',
  /** Card bills run early on the due date, so a same-day moment already shows them paid */
  billTime: '06:00',
  /** SPEC 5.4: the next advance-tax instalment */
  advanceTaxDue: '2026-12-15',
  /** SPEC 9.5: one card bill fails at the bank on its due date and goes through on retry */
  failingBill: { cardId: 'magnus', failsAt: '02:10', retryAt: '10:00' },
  /** The liquid top-up takes at most this share of the buyback, so off-path splits stay sane */
  topUpMaxShare: 0.4,
}

const st = () => useMunim.getState()
const persona = (): PersonaData => st().persona
const salaryAccount = (p: PersonaData) => p.banks.find((b) => b.id === p.profile.salaryAccountId) ?? p.banks[0]
const splitNames = () => assumptions.invest.split.map((s) => ({ name: fundShort[s.fundId] ?? s.fundId, share: s.share }))
const fundName = (p: PersonaData, id: string) => p.funds.find((f) => f.id === id)?.name ?? fundShort[id] ?? id

/** Propose a card and, for Autopilot and pre-signed cards, approve it at once */
function put(draft: ActionDraft, approveVia?: 'rule' | 'pin') {
  st().proposeAction(draft)
  if (approveVia) st().approveAction(draft.id, approveVia)
}

/** The app's onboarding is done: mark it, unless a replay or a skipped step already has */
async function ensureConnected(ctx: MomentContext) {
  if (st().connected) return
  st().setConnected(true)
  await ctx.play(revealSteps())
}

/* ---------- Moment 1: Connect and reveal (SPEC 5.1) ---------- */

export const REVEAL_IDS = { text: 'm1-reveal', chips: 'm1-chips' }

// Guided mode taps "Show me" for an idle viewer; it plays moment 2, so Next never taps it.
autoChips.add(REVEAL_IDS.chips)
advancingChips.add(REVEAL_IDS.chips)

/** "Here's all your money in one picture, and three things I found." with the Show me chip */
export function revealSteps(): ScriptStep[] {
  return [
    { message: { id: REVEAL_IDS.text, kind: 'text', from: 'munim', text: m1.reveal } },
    { message: { id: REVEAL_IDS.chips, kind: 'chips', from: 'munim', chips: [m1.showMe] }, typing: false, delay: 150 },
  ]
}

const moment1: MomentDef = {
  n: 1,
  date: '2026-10-29',
  time: '09:14',
  title: momentTitles[1],
  commentary: commentary[1],
  run: async (ctx) => {
    if (ctx.instant) {
      await ensureConnected(ctx)
      return
    }
    // Live: the onboarding in the app drives it; the runner plays the reveal when it ends.
    if (!st().connected) ctx.store().setSurface('app')
  },
}

/* ---------- Moment 2: Money found (SPEC 5.2) ---------- */

function cardA(p: PersonaData, at: ISODateTime): ActionDraft | null {
  const hdfc = salaryAccount(p)
  const idle = selectIdleAboveBuffer(p)
  const dues = selectCardDues(p)
  // Leave the card bills due before the next salary on top of the buffer; round down to a lakh.
  const amount = Math.max(0, Math.floor((idle - dues) / INPUTS.sweepStepA) * INPUTS.sweepStepA)
  if (amount <= 0) return null
  const fund = p.rates.liquidFund
  const savings = hdfc.interestRate ?? p.rates.savings
  const gain = Math.round(amount * (fund.yield - savings))
  const by = unitsBy(at)
  const label = m2.cardA.receipt(amount, fund.name)
  return {
    id: IDS.cardA,
    type: 'sweep',
    title: m2.cardA.title(amount, fund.name, fund.yield),
    why: m2.cardA.why(idle, p.buffer.amount, savings),
    impact: { amount: gain, per: 'year', label: m2.cardA.impact(gain) },
    rail: 'bank e-mandate',
    railDetail: m2.cardA.railDetail,
    approval: 'pin',
    approvalDetail: m2.cardA.approvalDetail,
    amount,
    when: m2.cardA.when(by),
    alsoConsidered: m2.cardA.also(dues, idle - amount, assumptions.liquidInstantPerDay),
    receiptPlan: { what: label, timeline: m2.cardA.timeline(by) },
    effects: [
      { target: 'account', id: hdfc.id, delta: -amount, label },
      { target: 'liquid', delta: amount, label },
    ],
  }
}

function cardB(p: PersonaData, at: ISODateTime): ActionDraft | null {
  const reg = selectRegularPlans(p)
  if (reg.value <= 0) return null
  const doneBy = addWorkingDays(at, INPUTS.switchDays)
  return {
    id: IDS.cardB,
    type: 'switch',
    title: m2.cardB.title,
    why: m2.cardB.why(reg.value, reg.dragPerYear),
    lines: [
      { label: m2.cardB.now, amount: reg.olderThanYear.value, note: m2.cardB.nowNote(reg.olderThanYear.gain, assumptions.tax.ltcgExemption) },
      { label: m2.cardB.later, amount: reg.newer.value, note: m2.cardB.laterNote },
    ],
    impact: { amount: reg.dragPerYear, per: 'year' },
    rail: 'MF Central',
    railDetail: m2.cardB.railDetail,
    approval: 'tap',
    approvalDetail: m2.cardB.approvalDetail,
    amount: reg.olderThanYear.value,
    when: m2.cardB.when(doneBy, INPUTS.switchDays),
    alsoConsidered: m2.cardB.also(INPUTS.switchAllTodayCost),
    // A switch keeps the value invested: the older units change plan (net worth unchanged).
    effects: p.funds
      .filter((f) => f.plan === 'regular' && f.lots.some((l) => l.olderThanYear === true))
      .map((f) => ({
        target: 'switch',
        id: f.id,
        name: f.name,
        delta: sum(f.lots.filter((l) => l.olderThanYear === true).map((l) => l.value)),
        label: m2.cardB.effect(f.name),
      })),
    receiptPlan: { what: m2.cardB.receipt(reg.olderThanYear.value), timeline: m2.cardB.timeline(doneBy) },
  }
}

function cardC(p: PersonaData): ActionDraft | null {
  const term = p.policies.find((x) => x.kind === 'term')
  if (!term) return null
  const shouldBe = termShouldBe(p)
  const topUp = shouldBe - term.cover
  if (topUp <= 0) return null
  return {
    id: IDS.cardC,
    type: 'insure',
    title: m2.cardC.title(topUp),
    why: m2.cardC.why(term.cover, p.termSizedAtSalary, p.profile.ctc, shouldBe),
    lines: [{ label: m2.cardC.line(topUp), note: m2.cardC.lineNote(assumptions.term.topUpMonthlyQuote, p.profile.age) }],
    impact: { amount: 0, per: 'none', label: m2.cardC.impact },
    found: { amount: 0, scope: 'self' },
    rail: 'insurer direct',
    approval: 'tap',
    approvalDetail: m2.cardC.approvalDetail,
    when: m2.cardC.when,
    alsoConsidered: m2.cardC.also,
    receiptPlan: { what: m2.cardC.receipt(topUp), timeline: m2.cardC.timeline },
  }
}

function subsCard(p: PersonaData): ActionDraft | null {
  const unused = p.subscriptions.filter((s) => s.unusedFor)
  if (unused.length === 0) return null
  const monthly = sum(unused.map((s) => s.monthly))
  const names = unused.map((s) => s.name)
  return {
    id: IDS.subs,
    type: 'pay',
    title: m2.subs.title(names),
    why: m2.subs.why(
      unused.map((s) => ({ name: s.name, unusedFor: s.unusedFor ?? '' })),
      monthly,
    ),
    impact: { amount: monthly * 12, per: 'year', label: m2.subs.impact(monthly * 12) },
    rail: 'bank e-mandate',
    railDetail: m2.subs.railDetail,
    approval: 'tap',
    approvalDetail: m2.subs.approvalDetail,
    when: m2.subs.when,
    alsoConsidered: m2.subs.also(p.subscriptions.filter((s) => !s.unusedFor).map((s) => s.name)),
    receiptPlan: { what: m2.subs.receipt(names), reference: m2.subs.reference, timeline: m2.subs.timeline },
  }
}

/** One card: create it from the live persona, then its compact WhatsApp message */
function cardSteps(id: string, build: () => ActionDraft | null): ScriptStep[] {
  return [
    {
      run: () => {
        const draft = build()
        if (!draft) return
        put(draft)
        return [{ message: { id: `msg-${id}`, kind: 'action', from: 'munim', actionId: id } }]
      },
    },
  ]
}

const moment2: MomentDef = {
  n: 2,
  date: '2026-10-29',
  time: '09:16',
  title: momentTitles[2],
  commentary: { ...commentary[2], edge: commentary[2].edge(assumptions.tax.ltcgExemption) },
  run: async (ctx) => {
    await ensureConnected(ctx)
    if (!ctx.instant) ctx.store().setSurface('whatsapp')
    const thread = st().messages.filter((m) => m.thread === 'nikhil')
    // Pressing Next instead of the chip: say "Show me" for him, so the thread reads right.
    const untapped = thread[thread.length - 1]?.id === REVEAL_IDS.chips
    await ctx.play([
      ...(untapped ? [{ message: { id: 'm2-show-me', kind: 'text', from: 'nikhil', text: m1.showMe, ticks: 'read' } } as ScriptStep] : []),
      { message: { id: 'm2-intro', kind: 'text', from: 'munim', text: m2.intro } },
      ...cardSteps(IDS.cardA, () => cardA(persona(), ctx.at)),
      ...cardSteps(IDS.cardB, () => cardB(persona(), ctx.at)),
      ...cardSteps(IDS.cardC, () => cardC(persona())),
      { message: { id: 'm2-small', kind: 'text', from: 'munim', text: m2.smallOne } },
      ...cardSteps(IDS.subs, () => subsCard(persona())),
    ])
  },
}

/* ---------- Moment 3: Salary and Autopilot (SPEC 5.3) ---------- */

function billCard(p: PersonaData, card: CreditCard): ActionDraft {
  const rule = st().rules.find((r) => r.id === RULE_IDS.payCards)
  const hdfc = salaryAccount(p)
  const label = m3.bill.receipt(card.statement, card.name)
  // SPEC 9.5: this bill's run is declined by the bank; it is held so the run lands at failsAt.
  const failing = card.id === INPUTS.failingBill.cardId
  const failsAt = stamp(card.due, INPUTS.failingBill.failsAt)
  const scheduledFor = failing ? addMinutes(failsAt, -(rule?.holdMinutes ?? HOLD_MINUTES)) : stamp(card.due, INPUTS.billTime)
  return {
    id: IDS.bill(card.id),
    type: 'pay',
    title: m3.bill.title(card.name),
    why: m3.bill.why(card.statement, card.due),
    impact: { amount: 0, per: 'none', label: m3.bill.impact },
    found: { amount: 0, scope: 'self' },
    rail: 'BBPS',
    railDetail: m3.bill.railDetail,
    approval: 'none',
    approvalDetail: m3.bill.approvalDetail(rule?.name ?? ''),
    ruleId: RULE_IDS.payCards,
    amount: card.statement,
    scheduledFor,
    ...(failing
      ? {
          scriptedFailure: {
            reason: m3.bill.declined(fmtTime(failsAt, { clock: '24h' })),
            retryAt: stamp(card.due, INPUTS.failingBill.retryAt),
          },
        }
      : {}),
    alsoConsidered: m3.bill.also(p.buffer.amount),
    receiptPlan: { what: label },
    effects: [
      { target: 'card', id: card.id, delta: -card.statement, label },
      { target: 'account', id: hdfc.id, delta: -card.statement, label },
    ],
  }
}

/** The sweep, computed from the live persona after the salary (SPEC 5.3 formula) */
function sweepCard(p: PersonaData) {
  const plan = selectSweep(p, { diwali: diwaliBudget.amount })
  const rule = st().rules.find((r) => r.id === RULE_IDS.sweep)
  const amount = Math.min(plan.amount, rule?.capPerRun ?? plan.amount)
  if (amount <= 0) return { plan, draft: null }
  const fund = p.rates.liquidFund
  const found = Math.round(amount * fund.yield)
  const hdfc = salaryAccount(p)
  const label = m3.sweep.receipt(amount, fund.name)
  const draft: ActionDraft = {
    id: IDS.sweep,
    type: 'sweep',
    title: m3.sweep.title(amount, fund.name),
    why: m3.sweep.why(plan.spare),
    lines: [
      { label: m3.sweep.balance, amount: plan.balance },
      { label: m3.sweep.buffer, amount: -plan.buffer },
      { label: m3.sweep.due, amount: -plan.committed, note: m3.sweep.dueNote(plan.commitments) },
      { label: m3.sweep.spare, amount: plan.spare, note: m3.sweep.spareNote(SWEEP_STEP, amount) },
    ],
    // SPEC 6: the sweep counts at the fund's yield (₹1,00,000 at 6.8% = ₹6,800)
    impact: { amount: found, per: 'year' },
    found: { amount: found, scope: 'self' },
    rail: 'bank e-mandate',
    railDetail: m3.sweep.railDetail,
    approval: 'none',
    approvalDetail: m3.sweep.approvalDetail(rule?.name ?? ''),
    ruleId: RULE_IDS.sweep,
    amount,
    alsoConsidered: m3.sweep.also,
    cancelNote: m3.sweep.cancelNote,
    receiptPlan: { what: label },
    effects: [
      { target: 'account', id: hdfc.id, delta: -amount, label },
      { target: 'liquid', delta: amount, label },
    ],
  }
  return { plan, draft }
}

/**
 * Money at risk is worth a ping (SPEC 1.7): when a card fails, the chat says so at the time it
 * failed, with the card (and its Retry) right under it.
 */
function pingFailure(card: ActionCard) {
  if (!card.failure) return
  const at = card.timeline[card.timeline.length - 1]?.at ?? st().clock
  const text: Message = {
    id: `msg-fail-${card.id}-${card.timeline.length}`,
    thread: 'nikhil',
    kind: 'text',
    from: 'munim',
    at,
    text: m3.bill.failedPing(card.receiptPlan?.what ?? card.title, card.failure.reason, card.failure.retryAt),
  }
  insertMessage(text)
  insertMessage({ id: `${text.id}-card`, thread: 'nikhil', kind: 'action', from: 'munim', at, actionId: card.id })
}

useMunim.subscribe((s, prev) => {
  if (s.actions === prev.actions) return
  for (const a of s.actions) {
    if (a.status === 'failed' && prev.actions.find((x) => x.id === a.id)?.status !== 'failed') pingFailure(a)
  }
})

/** Both rules fired on the salary credit: stamp their last run and when they next expect to */
function stampRules(at: ISODateTime) {
  const s = st()
  const firstBill = s.actions
    .filter((a) => a.ruleId === RULE_IDS.payCards && a.status === 'approved' && a.scheduledFor)
    .map((a) => a.scheduledFor!)
    .sort()[0]
  s.setRules(
    s.rules.map((r) => {
      if (r.id === RULE_IDS.payCards) return { ...r, lastRun: at, nextExpected: firstBill ?? r.nextExpected }
      if (r.id === RULE_IDS.sweep) return { ...r, lastRun: at, nextExpected: nextSalaryDay(at) }
      return r
    }),
  )
}

const moment3: MomentDef = {
  n: 3,
  date: '2026-10-30',
  time: '00:14',
  title: momentTitles[3],
  commentary: { ...commentary[3], principle: commentary[3].principle(HOLD_MINUTES) },
  run: async (ctx) => {
    await ensureConnected(ctx)
    if (!ctx.instant) ctx.store().setSurface('whatsapp')
    const p0 = persona()
    const salary = p0.profile.monthlyNetCredit
    const hdfc = salaryAccount(p0)
    const sipsOn = nextDayOfMonth(ctx.at, p0.sips[0]?.dayOfMonth ?? 5)
    await ctx.play([
      {
        run: () => {
          const note = m3.creditNote(p0.profile.employer)
          st().applyEffects([{ target: 'account', id: hdfc.id, delta: salary, label: note }], note)
        },
      },
      { message: { id: 'm3-landed', kind: 'text', from: 'munim', text: m3.landed(salary) } },
      {
        // 1. Card bills, paid in full on their due dates under the rule
        run: () => {
          const p = persona()
          const bills = [...p.cards].filter((c) => c.statement > 0).sort((a, b) => a.due.localeCompare(b.due))
          for (const c of bills) put(billCard(p, c), 'rule')
          stampRules(ctx.at)
          return bills.map((c) => ({ message: { id: `msg-${IDS.bill(c.id)}`, kind: 'action', from: 'munim', actionId: IDS.bill(c.id) } }) as ScriptStep)
        },
      },
      // 2. SIPs and 3. Diwali: facts, nothing to approve
      { message: { id: 'm3-sips', kind: 'text', from: 'munim', text: m3.sips(selectSipsMonthly(p0), sipsOn) } },
      { message: { id: 'm3-diwali', kind: 'text', from: 'munim', text: m3.diwali(diwaliBudget.amount, diwaliBudget.date) } },
      {
        // 4. The sweep: computed, never typed; held 10 minutes with Cancel
        run: () => {
          const p = persona()
          const { plan, draft } = sweepCard(p)
          if (!draft) return [{ message: { id: 'm3-sweep-skip', kind: 'text', from: 'munim', text: m3.sweepSkip(p.buffer.amount) } }]
          put(draft, 'rule')
          const minutes = st().actions.find((a) => a.id === IDS.sweep)?.holdMinutes ?? HOLD_MINUTES
          return [
            { message: { id: 'm3-sweep-lead', kind: 'text', from: 'munim', text: m3.sweepLead(plan.spare, draft.amount ?? 0, fmtCountdown(minutes * 60_000)) } },
            { message: { id: `msg-${IDS.sweep}`, kind: 'action', from: 'munim', actionId: IDS.sweep } },
          ]
        },
      },
    ])
  },
}

/* ---------- Moment 4: ESOP buyback (SPEC 5.4) ---------- */

function splitPlan(p: PersonaData, at: ISODateTime) {
  const s = selectEsopSplit(p, {
    prepay: INPUTS.esopPrepay,
    loanId: INPUTS.loanId,
    emergencyMonths: INPUTS.emergencyMonths,
    tranches: assumptions.invest.tranches,
    split: assumptions.invest.split,
    topUpMaxShare: INPUTS.topUpMaxShare,
  })
  const dates = s.tranches.map((_, i) => addDays(stamp(at.slice(0, 10), INPUTS.runTime), i * INPUTS.trancheGapDays))
  return { ...s, dates }
}

function splitCard(p: PersonaData, at: ISODateTime): ActionDraft | null {
  const s = splitPlan(p, at)
  const loan = s.loan
  if (!loan || s.net <= 0) return null
  const hdfc = salaryAccount(p)
  const fund = p.rates.liquidFund
  const first = s.byFund(s.tranches[0])
  const lostTax = Math.round((s.interestSaved * INPUTS.marginalTax) / 1_000) * 1_000
  const [, t2, t3] = s.dates
  const effects: Effect[] = [
    { target: 'loan', id: loan.id, delta: -s.prepay, label: m4.prepayEffect(s.prepay, loan.lender) },
    { target: 'account', id: hdfc.id, delta: -(s.prepay + s.topUp + s.tranches[0]), label: m4.receipt(s.net) },
    ...(s.topUp > 0 ? [{ target: 'liquid', delta: s.topUp, label: m4.liquidEffect(s.topUp, fund.name) } as Effect] : []),
    ...first.map((f) => ({ target: 'fund', id: f.fundId, delta: f.amount, label: m4.fundEffect(f.amount, fundName(p, f.fundId)) }) as Effect),
  ]
  return {
    id: IDS.split,
    type: 'prepay',
    title: m4.title(s.net),
    why: m4.why(s.net, loan.rate),
    lines: [
      {
        label: m4.prepay(loan.lender),
        amount: s.prepay,
        alsoConsidered: loan.rateType === 'floating' ? m4.prepayAlso(lostTax, s.interestSaved, loan.taxSection) : m4.prepayAlsoFixed(s.interestSaved),
      },
      { label: m4.liquid, amount: s.topUp, note: s.topUp > 0 ? m4.liquidNote(s.target, INPUTS.emergencyMonths) : m4.liquidFull(s.target) },
      {
        label: m4.rest,
        amount: s.rest,
        note: m4.restNote(s.tranches.length, assumptions.invest.weeks, splitNames(), s.dates),
        alsoConsidered: m4.restAlso,
      },
    ],
    // SPEC 6: found grows by the interest the prepayment saves (₹18,400)
    impact: { amount: s.interestSaved, per: 'year' },
    rail: 'bank e-mandate',
    railDetail: m4.railDetail(INPUTS.upiLimit),
    approval: 'pin',
    approvalDetail: m4.approvalDetail,
    amount: s.net,
    when: t2 && t3 ? m4.when(t2, t3) : undefined,
    alsoConsidered: m4.also(p.buffer.amount),
    receiptPlan: {
      what: m4.receipt(s.net),
      timeline: m4.timeline({
        lender: loan.lender,
        ref: INPUTS.prepayRef,
        liquidBy: unitsBy(at),
        trancheBy: unitsBy(at, 1),
        t2: t2 ?? at,
        t3: t3 ?? at,
        topUp: s.topUp,
      }),
    },
    effects,
  }
}

/** Tranches 2 and 3: signed with the split's PIN, scheduled on their dates */
function scheduleTranches(p: PersonaData, at: ISODateTime) {
  const s = splitPlan(p, at)
  const hdfc = salaryAccount(p)
  const total = s.tranches.length
  s.tranches.forEach((amount, i) => {
    if (i === 0 || amount <= 0) return
    const n = i + 1
    const parts = s.byFund(amount)
    const label = m4.tranche.receipt(n, amount)
    put(
      {
        id: IDS.tranche(n),
        type: 'invest',
        title: m4.tranche.title(n, amount),
        why: m4.tranche.why(n, total, splitNames()),
        lines: parts.map((f) => ({ label: fundName(p, f.fundId), amount: f.amount })),
        impact: { amount: 0, per: 'none', label: m4.tranche.impact },
        found: { amount: 0, scope: 'self' },
        rail: 'bank e-mandate',
        railDetail: m4.railDetail(INPUTS.upiLimit),
        approval: 'pin',
        approvalDetail: m4.tranche.approvalDetail,
        amount,
        scheduledFor: s.dates[i],
        alsoConsidered: m4.tranche.also,
        receiptPlan: { what: label },
        effects: [
          { target: 'account', id: hdfc.id, delta: -amount, label },
          ...parts.map((f) => ({ target: 'fund', id: f.fundId, delta: f.amount, label: m4.fundEffect(f.amount, fundName(p, f.fundId)) }) as Effect),
        ],
      },
      'pin',
    )
  })
}

const moment4: MomentDef = {
  n: 4,
  date: '2026-11-03',
  time: '10:40',
  title: momentTitles[4],
  commentary: { ...commentary[4], edge: commentary[4].edge(INPUTS.upiLimit) },
  run: async (ctx) => {
    await ensureConnected(ctx)
    if (!ctx.instant) ctx.store().setSurface('whatsapp')
    const p0 = persona()
    const esop = { ...p0.esop, ...selectEsop(p0) }
    const hdfc = salaryAccount(p0)
    await ctx.play([
      {
        run: () => {
          const note = m4.creditNote(esop.company)
          st().applyEffects([{ target: 'account', id: hdfc.id, delta: esop.net, label: note }], note)
        },
      },
      {
        message: {
          id: 'm4-landed',
          kind: 'text',
          from: 'munim',
          text: m4.landed(esop.net, esop.company, esop.buybackUnits, esop.buybackPrice, esop.perquisiteTaxRate),
        },
      },
      {
        run: () => {
          // Computed from the persona as it stands now: after the credit, with whatever earlier cards did.
          const p = persona()
          const draft = splitCard(p, ctx.at)
          if (!draft) return
          put(draft)
          // The tranche dates and amounts are fixed when the split is proposed.
          whenDone(IDS.split, () => scheduleTranches(p, ctx.at))
          return [{ message: { id: `msg-${IDS.split}`, kind: 'approval', from: 'munim', actionId: IDS.split } }]
        },
      },
      { message: { id: 'm4-advance-tax', kind: 'text', from: 'munim', text: m4.advanceTax(INPUTS.advanceTaxDue) } },
    ])
  },
}

/* ---------- Registry ---------- */

const core: MomentDef[] = [moment1, moment2, moment3, moment4]

const isMomentDef = (x: unknown): x is MomentDef =>
  typeof x === 'object' && x !== null && typeof (x as MomentDef).n === 'number' && typeof (x as MomentDef).run === 'function'

/** Any array of MomentDef that moments5to8.ts exports (named moments5to8 by contract) */
function extraMoments(): MomentDef[] {
  let mods: Record<string, Record<string, unknown>> = {}
  try {
    mods = import.meta.glob<Record<string, unknown>>('./moments5to8.{ts,tsx}', { eager: true })
  } catch {
    // Outside Vite (the tie-out under tsx) there is no glob: moments 1 to 4 only.
    mods = {}
  }
  const out: MomentDef[] = []
  for (const mod of Object.values(mods)) {
    for (const v of Object.values(mod)) if (Array.isArray(v)) out.push(...v.filter(isMomentDef))
  }
  return out
}

/** Every moment, in order; 1 to 4 always come from this file */
export const moments: MomentDef[] = [...core, ...extraMoments().filter((d) => !core.some((c) => c.n === d.n))]
  .filter((d, i, all) => all.findIndex((x) => x.n === d.n) === i)
  .sort((a, b) => a.n - b.n)

export const getMoment = (n: number): MomentDef | undefined => moments.find((d) => d.n === n)

/** The last moment that exists (4 until moments5to8.ts lands) */
export const lastMoment = (): Moment => (moments.length ? moments[moments.length - 1].n : 0)

/** SPEC 7 commentary for a moment (null at moment 0), for the panel and the phone "i" sheet */
export const commentaryFor = (n: number) => getMoment(n)?.commentary ?? null
