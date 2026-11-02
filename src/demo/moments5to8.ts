/*
  Moments 5 to 8 (SPEC 5.5 to 5.8; counter values in SPEC 6; commentary in SPEC 7).
  The runner (item 4) picks up `moments5to8` from this file; the contract is in ./kit.

    5  Fri 6 Nov, 9:20 am   Market fall. Equity funds and stocks move down 6% (effects on the
                            live persona), "I'm not moving anything", then the optional
                            tax-harvest card: Mirae Midcap into Kotak Emerging Equity Direct.
    6  Mon 9 Nov, 8:05 pm   Ask anything. Sunday's weekly brief goes into the thread first if it
                            has none. The car question, chipped or typed, gets the intent
                            matcher's car answer; a "Car fund" plan card rides along with it, and
                            the "Set up a Car fund" chip signs it in one tap.
    7  Wed 11 Nov, 7:30 pm  The household. "Invite Dad" flips to Suresh's phone (chat/bridge);
                            his consent brings "Dad's in" and the FD card, which he approves on
                            his own phone with his OTP. UPI Circle caps go live for him.
    8  Thu 12 Nov, 9:00 am  Trust. Two weeks summed up from the store, and a chip into Trust.

  run() plays each moment's script and waits for the presenter's taps. settle() is the default
  path the runner uses when it replays past a moment (Back, a link): the taps, done at once.

  Every number is computed from the live persona (store.persona, after effects) or the store's
  counters. The only literals are inputs the spec gives (the 6% fall, the exit-load rate, the
  UPI Circle caps, the moment clocks). Copy lives in src/copy/moments5to8.ts.
*/
import { useMunim } from '../store'
import * as P from '../data/persona'
import { fundGain, fundValue, selectLiquid, selectMonthlySpend, selectNetWorth, sum, type PersonaData } from '../data/derived'
import { toIST } from '../lib/actions'
import { answerScript, appendMessage, openInMunim, play, setChipHandler, type ScriptStep } from '../chat/engine'
import { consentKey, onConsentGiven, type ConsentEvent } from '../chat/bridge'
import { useChat } from '../chat/chatStore'
import { assumptions, roundTo } from '../chat/facts'
import { matchIntent, normalize, parseRupees } from '../chat/intents'
import { useUi } from '../screens/uiStore'
import { currentPlan, plans } from '../screens/screenData'
import { nextBriefAt } from '../screens/selectors'
import { chatHi, chips as chatChips } from '../copy/chat'
import { momentTitles } from '../copy/shell'
import * as C from '../copy/moments5to8'
import type { MomentContext, MomentDef } from './kit'
import type { ActionCard, ActionDraft, Effect, Member, Message, MutualFund, Rupees, Scope } from '../types'

/* ---------- Inputs (SPEC 5.5 to 5.8) ---------- */

/** Moment clocks (the runner sets the store's clock from these before run) */
const CLOCK = {
  5: { date: '2026-11-06', time: '09:20' },
  6: { date: '2026-11-09', time: '20:05' },
  7: { date: '2026-11-11', time: '19:30' },
  8: { date: '2026-11-12', time: '09:00' },
} as const

/** SPEC 5.5: markets fell 6% this week */
const MARKET_FALL = 0.06

/** SPEC 5.5: sell the fund below cost, buy a similar midcap fund the same day */
const HARVEST = {
  fromId: 'mirae-midcap',
  /** Short name the copy uses */
  fromShort: 'Mirae Midcap',
  to: { id: 'kotak-emerging-direct', name: 'Kotak Emerging Equity', display: 'Kotak Emerging Equity Direct' },
  /** Exit load on units held under a year */
  exitLoadRate: 0.01,
  /** Short-term capital gains rate the loss saves at */
  stcgRate: assumptions.tax.stcgRate,
  /**
   * Which loss the card quotes. SPEC 5.5 and 6 use the March units' loss as the snapshot has it
   * (₹38,000, so about ₹7,600 of tax and ₹82,400 found after moment 5). The live persona moves
   * known gains with prices, so after this week's fall the live loss is deeper; 'live' quotes
   * that instead (and the exit load on the live value). The units sold are always the live ones.
   */
  lossBasis: 'live' as 'snapshot' | 'live',
}

/** SPEC 5.7: UPI Circle lets Nikhil pay for Dad within these caps */
const UPI_CIRCLE = { monthlyCap: 15_000 as Rupees, perPaymentCap: 5_000 as Rupees }

const SURESH = P.people.suresh.id
const SURESH_SCOPES: Scope[] = ['see', 'suggest', 'act-with-otp']

/** Card and message ids, for other items that need to point at them */
export const IDS5to8 = {
  harvest: 'm5-harvest-mirae',
  carFund: 'm6-car-fund',
  fd: 'm7-dad-fd',
  brief: (day: string) => `brief-${day}`,
}
const HARVEST_ID = IDS5to8.harvest
const CAR_FUND_ID = IDS5to8.carFund
const FD_ID = IDS5to8.fd

/* ---------- Store helpers ---------- */

const st = () => useMunim.getState()
const live = (): PersonaData => st().persona
const findCard = (id: string): ActionCard | undefined => st().actions.find((a) => a.id === id)
/** A card can be (re)proposed when it does not exist yet or was skipped */
const open = (id: string) => {
  const c = findCard(id)
  return !c || c.status === 'cancelled'
}
const ms = (at: string) => new Date(at.length === 10 ? `${at}T12:00:00+05:30` : at).getTime()

/** Resolves after every script queued so far has played */
const flush = () => play([], { instant: true })

/** Default path only: finish a card now instead of after its 1.5 s run */
function finishNow(id: string) {
  const c = findCard(id)
  if (c && (c.status === 'running' || c.status === 'held' || (c.status === 'approved' && !c.scheduledFor))) st().completeAction(id)
}

/* ---------- Module state (cleared when the store is reset) ---------- */

/** True while settle() builds the default path: watchers play at once and add no chips */
let building = false
/** The ₹ the market fall took off, for Sunday's brief */
let lastFall: Rupees | null = null
/** The price in the last car question, for the plan card */
let lastCarPrice: Rupees = assumptions.car.defaultPrice

/* ---------- Live figures ---------- */

/** Every fund but the liquid fund (item 4 marks it kind 'liquid') is equity */
const isEquityFund = (f: MutualFund) => f.kind !== 'liquid'

/** Six months of spending (SPEC 2: ₹4,50,000) */
const emergencyTarget = (p: PersonaData) => 6 * selectMonthlySpend(p)

/** SPEC 5.5: stocks and every equity fund down 6%, each move rounded to ₹100 */
function marketMove(p: PersonaData, fall: number) {
  const funds: Effect[] = p.funds
    .filter((f) => isEquityFund(f) && fundValue(f) > 0)
    .map((f) => ({ target: 'fund', id: f.id, delta: -roundTo(fundValue(f) * fall, 100), label: C.marketFall.fundLabel(f.name, fall) }))
  const stockTotal = sum(p.stocks.holdings.map((h) => h.value))
  const stocks: Effect[] = stockTotal > 0 ? [{ target: 'stocks', delta: -roundTo(stockTotal * fall, 100), label: C.marketFall.stocksLabel(fall) }] : []
  const effects = [...funds, ...stocks]
  return { effects, down: -sum(effects.map((e) => e.delta)) }
}

/** SPEC 5.5: what is sold (live), the loss, the tax it saves, and the exit load on units under a year old */
function harvestFigures(p: PersonaData) {
  const from = p.funds.find((f) => f.id === HARVEST.fromId)
  if (!from) return null
  const basis = HARVEST.lossBasis === 'live' ? from : (P.funds.find((f) => f.id === HARVEST.fromId) ?? from)
  const value = fundValue(from)
  const loss = Math.max(0, -fundGain(basis))
  if (value <= 0 || loss <= 0) return null
  const newer = sum(basis.lots.filter((l) => l.olderThanYear !== true).map((l) => l.value))
  return {
    from,
    value,
    loss,
    saving: Math.round(loss * HARVEST.stcgRate),
    exitLoad: roundTo(newer * HARVEST.exitLoadRate, 100),
  }
}

function fdFigures() {
  const s = live().suresh
  return {
    bank: s.fd.bank,
    principal: s.fd.principal,
    maturesOn: s.fd.maturesOn,
    rate: s.fd.rate,
    senior: s.seniorFdRate,
    extra: Math.round(s.fd.principal * (s.seniorFdRate - s.fd.rate)),
    medical: assumptions.sureshMedicalReserve,
  }
}

/* ---------- Cards ---------- */

function harvestDraft(p: PersonaData): ActionDraft | null {
  const h = harvestFigures(p)
  if (!h) return null
  const to = HARVEST.to.display
  return {
    id: HARVEST_ID,
    type: 'harvest',
    title: C.harvest.title,
    why: C.harvest.why(h.loss),
    lines: [
      { label: C.harvest.sellLine(h.from.name), amount: h.value, note: C.harvest.sellNote({ loss: h.loss, saving: h.saving, rate: HARVEST.stcgRate }) },
      { label: C.harvest.buyLine(to), amount: h.value, note: C.harvest.buyNote },
    ],
    impact: { amount: h.saving, per: 'now', label: C.harvest.impact(h.saving) },
    rail: 'MF Central',
    approval: 'tap',
    amount: h.value,
    when: C.harvest.when,
    alsoConsidered: C.harvest.alsoConsidered(h.exitLoad),
    found: { amount: h.saving, scope: 'self' },
    // The whole holding is sold (the fund leaves the persona) and the same ₹ buys the new fund.
    effects: [
      { target: 'fund', id: h.from.id, delta: -h.value, label: C.harvest.effectSell(h.from.name) },
      { target: 'fund', id: HARVEST.to.id, name: HARVEST.to.name, delta: h.value, label: C.harvest.effectBuy(to) },
    ],
    receiptPlan: {
      what: C.harvest.receiptWhat(HARVEST.fromShort, to),
      timeline: [C.harvest.timelineSold(h.from.name, h.value, h.loss), C.harvest.timelineBought(to, h.value)],
    },
  }
}

function carFundDraft(price: Rupees): ActionDraft {
  const a = assumptions.car
  const p = live()
  return {
    id: CAR_FUND_ID,
    type: 'plan',
    title: C.carFund.title,
    why: C.carFund.why({ setAside: a.setAside, fromMonth: a.setAsideFromMonth }),
    impact: { amount: 0, per: 'none', label: C.carFund.impact },
    rail: 'bank e-mandate',
    railDetail: C.carFund.railDetail,
    approval: 'tap',
    when: C.carFund.when(a.setAsideFromMonth),
    alsoConsidered: C.carFund.alsoConsidered({
      loan: price > a.downLater,
      downNow: a.downNow,
      liquid: selectLiquid(p),
      target: emergencyTarget(p),
    }),
    found: { amount: 0, scope: 'self' },
    // A plan: nothing moves now, so no effects
    receiptPlan: {
      what: C.carFund.receiptWhat(a.setAside, a.setAsideFromMonth),
      timeline: [C.carFund.timeline(a.setAside, a.setAsideFromMonth)],
    },
  }
}

function fdDraft(): ActionDraft {
  const f = fdFigures()
  const fdId = live().suresh.fd.id
  return {
    id: FD_ID,
    type: 'invest',
    title: C.dadFd.title,
    why: C.dadFd.why(f),
    impact: { amount: f.extra, per: 'year' },
    rail: 'bank e-mandate',
    railDetail: C.dadFd.railDetail(f.bank),
    approval: 'member-consent',
    approverMemberId: SURESH,
    approvalDetail: C.dadFd.approvalDetail,
    amount: f.principal,
    when: C.dadFd.when(f.maturesOn),
    alsoConsidered: C.dadFd.alsoConsidered(f.medical),
    found: { amount: f.extra, scope: 'family' },
    // The FD moves to the new one: closed and reopened for the same amount, no net change.
    effects: [
      { target: 'member', id: fdId, delta: -f.principal, label: C.dadFd.effectClose(f.rate) },
      { target: 'member', id: fdId, delta: f.principal, label: C.dadFd.effectOpen(f.senior) },
    ],
    receiptPlan: {
      what: C.dadFd.receiptWhat(f.bank, f.senior),
      timeline: C.dadFd.timeline(f),
    },
  }
}

/** A card's compact message, proposing the card first unless it is already live */
function cardSteps(id: string, build: () => ActionDraft | null): ScriptStep[] {
  return [
    {
      run: () => {
        if (open(id)) {
          const draft = build()
          if (!draft) return
          st().proposeAction(draft)
        }
        return [{ message: { id: `msg-${id}`, kind: 'action', from: 'munim', actionId: id } }]
      },
    },
  ]
}

/* ---------- Moment 5: Market fall ---------- */

async function runMarketFall(ctx: MomentContext) {
  const move = marketMove(live(), MARKET_FALL)
  st().applyEffects(move.effects, C.marketFall.note(MARKET_FALL))
  lastFall = move.down
  await ctx.play([
    { message: { id: 'm5-fall', kind: 'text', from: 'munim', text: C.marketFall.message({ fall: MARKET_FALL, down: move.down }) } },
    ...(harvestFigures(live()) || findCard(HARVEST_ID)
      ? [{ message: { id: 'm5-harvest-lead', kind: 'text', from: 'munim', text: C.marketFall.harvestLead } } as ScriptStep, ...cardSteps(HARVEST_ID, () => harvestDraft(live()))]
      : []),
  ])
}

/** Default path (SPEC 6): the harvest is accepted with a tap */
async function settleMarketFall() {
  building = true
  try {
    if (findCard(HARVEST_ID)?.status === 'proposed') st().approveAction(HARVEST_ID, 'tap')
    finishNow(HARVEST_ID)
    await flush()
  } finally {
    building = false
  }
}

/* ---------- Weekly brief, Sunday 6 pm (before moment 6) ---------- */

/** Sunday's brief (SPEC 1.7), put in the thread at its own time if the thread has none for that day */
function ensureBrief() {
  const at = toIST(ms(nextBriefAt(`${CLOCK[5].date}T${CLOCK[5].time}:00+05:30`)))
  const day = at.slice(0, 10)
  const s = st()
  if (s.messages.some((m) => m.thread === 'nikhil' && m.kind === 'brief' && m.at.slice(0, 10) === day)) return

  const p = live()
  const end = ms(at)
  const weekStart = end - 7 * 86_400_000
  const horizon = end + 7 * 86_400_000
  const inWeekAhead = (d: string) => ms(d) > end && ms(d) <= horizon

  // Cards done since last Sunday's brief
  const doneAt = (a: ActionCard) => [...a.timeline].reverse().find((t) => t.status === 'done')?.at
  const doneThisWeek = s.actions.filter((a) => {
    const t = a.status === 'done' ? doneAt(a) : undefined
    return t !== undefined && ms(t) > weekStart && ms(t) <= end
  }).length

  // Coming up: card bills (as they stood on Sunday, paid or not since) and premiums
  const bills = s.actions.filter((a) => a.type === 'pay' && a.scheduledFor && a.status !== 'cancelled' && inWeekAhead(a.scheduledFor))
  const billItems = bills.flatMap((a) => {
    const cardId = a.effects?.find((e) => e.target === 'card')?.id
    const card = p.cards.find((c) => c.id === cardId)
    return card ? [{ id: card.id, name: card.name, amount: a.amount ?? card.statement, due: a.scheduledFor ?? card.due }] : []
  })
  const unbilled = p.cards
    .filter((c) => c.statement > 0 && inWeekAhead(c.due) && !billItems.some((b) => b.id === c.id))
    .map((c) => ({ id: c.id, name: c.name, amount: c.statement, due: c.due }))
  const premiums = p.policies
    .filter((x) => x.premium && x.premiumDue && inWeekAhead(x.premiumDue))
    .map((x) => ({ id: x.id, name: C.brief.premium(x.name), amount: x.premium ?? 0, due: x.premiumDue ?? '' }))
  const coming = [...billItems, ...unbilled, ...premiums].sort((a, b) => ms(a.due) - ms(b.due))

  const lines = [
    C.brief.netWorth(selectNetWorth(p).total, at),
    ...(lastFall ? [C.brief.market(lastFall)] : []),
    ...(doneThisWeek > 0 ? [C.brief.done(doneThisWeek)] : []),
    C.brief.found(s.foundThisYear),
    ...(coming.length ? [C.brief.coming(coming, billItems.length > 0)] : []),
    C.brief.nothing,
  ]
  const msg: Message = { id: IDS5to8.brief(day), thread: 'nikhil', kind: 'brief', from: 'munim', at, title: C.brief.title(at), lines }
  // In time order: anything already stamped after Sunday 6 pm stays after it
  const all = s.messages
  const i = all.findIndex((m) => ms(m.at) > end)
  s.setMessages(i < 0 ? [...all, msg] : [...all.slice(0, i), msg, ...all.slice(i)])
}

/* ---------- Moment 6: Ask anything ---------- */

const carQuestion = () => C.askAnything.question(assumptions.car.defaultPrice)

/** Price in a car question, read as the intent matcher reads it */
function priceIn(text: string): Rupees {
  const parsed = parseRupees(normalize(text))
  return parsed && parsed >= 100_000 && parsed <= 50_000_000 ? roundTo(parsed, 10_000) : assumptions.car.defaultPrice
}

/**
 * A car question (chipped or typed) puts the Car fund plan card in before the intent matcher
 * answers, so the answer carries the card; the "Set up a Car fund" chip follows the answer.
 */
function onCarQuestion(text: string) {
  lastCarPrice = priceIn(text)
  const card = findCard(CAR_FUND_ID)
  if (card && card.status !== 'proposed' && card.status !== 'cancelled') return
  st().proposeAction(carFundDraft(lastCarPrice))
  if (building) return
  // After this tick the matcher's answer is queued, so the chip lands after it.
  setTimeout(() => {
    if (findCard(CAR_FUND_ID)?.status !== 'proposed') return
    void play([{ message: { id: 'm6-setup-chip', kind: 'chips', from: 'munim', chips: [C.askAnything.setUpChip] }, typing: false, delay: 150 }])
  }, 0)
}

/** "Set up a Car fund": signs the plan card (the one tap) and confirms */
function setUpCarFund(): ScriptStep[] {
  const a = assumptions.car
  if (open(CAR_FUND_ID)) st().proposeAction(carFundDraft(lastCarPrice))
  if (findCard(CAR_FUND_ID)?.status === 'proposed') st().approveAction(CAR_FUND_ID, 'tap')
  return [{ message: { id: 'm6-car-fund-done', kind: 'text', from: 'munim', text: C.carFund.done(a.setAside, a.setAsideFromMonth) } }]
}

async function runAskAnything(ctx: MomentContext) {
  ensureBrief()
  await ctx.play([{ message: { id: 'm6-chips', kind: 'chips', from: 'munim', chips: [carQuestion()] }, typing: false, delay: 300 }])
}

/** Default path: the question, the answer with the plan card, and the one tap */
async function settleAskAnything(ctx: MomentContext) {
  if (findCard(CAR_FUND_ID)?.status === 'done') return
  building = true
  try {
    if (findCard(CAR_FUND_ID)?.status !== 'proposed') {
      const q = carQuestion()
      appendMessage({ id: 'm6-ask', kind: 'text', from: 'nikhil', text: q, ticks: 'read' })
      await ctx.play(answerScript(matchIntent(q)))
    }
    appendMessage({ id: 'm6-setup', kind: 'text', from: 'nikhil', text: C.askAnything.setUpChip, ticks: 'read' })
    await ctx.play(setUpCarFund())
    finishNow(CAR_FUND_ID)
    await flush()
  } finally {
    building = false
  }
}

/* ---------- Moment 7: The household ---------- */

const dadIn = () => st().members.some((m) => m.id === SURESH && m.consent === 'consented')

/** Dad is a consented member with UPI Circle caps (SPEC 5.7) */
function markDadIn() {
  const s = st()
  const base = s.members.find((m) => m.id === SURESH)
  const next: Member = {
    id: SURESH,
    name: P.people.suresh.name,
    relation: 'father',
    language: 'hi',
    scopes: SURESH_SCOPES,
    accountsLinked: [P.suresh.savings.id, P.suresh.fd.id],
    ...base,
    consent: 'consented',
    upiCircle: { status: 'active', monthlyCap: UPI_CIRCLE.monthlyCap, perPaymentCap: UPI_CIRCLE.perPaymentCap },
  }
  s.setMembers(base ? s.members.map((m) => (m.id === SURESH ? next : m)) : [...s.members, next])
}

/** "Dad's in. One thing right away:" and the FD card (stable ids, so it never lands twice) */
const dadJoinedSteps = (): ScriptStep[] => [
  { message: { id: 'm7-dads-in', kind: 'text', from: 'munim', text: C.household.dadsIn } },
  ...cardSteps(FD_ID, fdDraft),
]

/** Live path: Suresh's consent to the invite (his OTP on the AA page, chat/bridge giveConsent) */
function onConsent(e: ConsentEvent) {
  if (e.memberId !== SURESH || e.actionId || building) return
  markDadIn()
  if (open(FD_ID)) void play(dadJoinedSteps())
}

/** Default path: a consent request in both threads, approved by Dad */
function consentGivenNow(actionId?: string) {
  const key = consentKey({ actionId, memberId: SURESH })
  const text = actionId ? chatHi.fdText(fdFigures()) : chatHi.inviteText
  for (const thread of ['nikhil', 'suresh'] as const) {
    const has = st().messages.some((m) => m.thread === thread && m.kind === 'consent' && consentKey(m) === key)
    if (!has) appendMessage({ kind: 'consent', from: 'munim', memberId: SURESH, text, scopes: SURESH_SCOPES, actionId }, thread)
  }
  useChat.getState().markConsent(key)
}

async function runHousehold(ctx: MomentContext) {
  if (dadIn()) {
    // Already linked (free explore): straight to the FD
    await ctx.play(dadJoinedSteps())
    return
  }
  await ctx.play([
    { message: { id: 'm7-invite', kind: 'text', from: 'munim', text: C.household.invite } },
    { message: { id: 'm7-chips', kind: 'chips', from: 'munim', chips: chatChips.family }, typing: false, delay: 150 },
  ])
}

/** Default path: Dad consents, the FD card goes to him, and he approves it with his OTP */
async function settleHousehold(ctx: MomentContext) {
  building = true
  try {
    if (!dadIn()) {
      appendMessage({ id: 'm7-invite-dad', kind: 'text', from: 'nikhil', text: chatChips.family[0], ticks: 'read' })
      consentGivenNow()
      markDadIn()
    }
    if (open(FD_ID)) await ctx.play(dadJoinedSteps())
    if (findCard(FD_ID)?.status === 'proposed') {
      consentGivenNow(FD_ID)
      st().approveAction(FD_ID, 'member')
    }
    finishNow(FD_ID)
    await flush()
  } finally {
    building = false
  }
}

/* ---------- Moment 8: Trust centre and plans ---------- */

function openTrust() {
  useUi.getState().setTrustSection('ledger')
  openInMunim(undefined, 'trust')
}

async function runTrust(ctx: MomentContext) {
  const s = st()
  const plan = plans.find((x) => x.id === currentPlan)
  const done = s.actions.filter((a) => a.status === 'done').length
  await ctx.play([
    { message: { id: 'm8-summary', kind: 'text', from: 'munim', text: C.trustMoment.summary({ found: s.foundThisYear, family: s.foundFamily, done }) } },
    ...(plan?.pricePerYear ? [{ message: { id: 'm8-plan', kind: 'text', from: 'munim', text: C.trustMoment.plan(plan.pricePerYear) } } as ScriptStep] : []),
    { message: { id: 'm8-chips', kind: 'chips', from: 'munim', chips: [C.trustMoment.chip] }, typing: false, delay: 150 },
  ])
}

/* ---------- Receipts when these cards complete (their effects apply in the store) ---------- */

function onDone(card: ActionCard) {
  const receipt = card.receipts[card.receipts.length - 1]
  if (!receipt) return
  const steps: ScriptStep[] = []
  if (!st().messages.some((m) => m.kind === 'receipt' && m.actionId === card.id)) {
    steps.push({ message: { id: `receipt-${card.id}`, kind: 'receipt', from: 'munim', actionId: card.id, receipt } })
  }
  if (card.id === FD_ID) {
    steps.push({ message: { id: 'm7-fd-done-hi', kind: 'text', from: 'munim', thread: 'suresh', text: C.dadFd.doneHi(fdFigures()) }, typing: 600 })
  }
  if (steps.length) void play(steps, { instant: building })
}

/* ---------- Wiring (once, on import) ---------- */

setChipHandler(C.askAnything.setUpChip, () => setUpCarFund())
setChipHandler(C.trustMoment.chip, () => openTrust())
onConsentGiven(onConsent)

/** Cards that post a receipt in the chat when done (the plan card has nothing to receipt) */
const RECEIPTED = [HARVEST_ID, FD_ID]

useMunim.subscribe((s, prev) => {
  // A reset (no messages and no cards) clears this module's state.
  if (s.messages.length === 0 && s.actions.length === 0 && (prev.messages.length > 0 || prev.actions.length > 0)) {
    lastFall = null
    lastCarPrice = assumptions.car.defaultPrice
  }

  // Nikhil asks about a car: the plan card goes in before the matcher answers.
  if (s.messages !== prev.messages && s.messages.length > prev.messages.length) {
    const m = s.messages[s.messages.length - 1]
    if (m.thread === 'nikhil' && m.from === 'nikhil' && m.kind === 'text' && matchIntent(m.text).id === 'car') onCarQuestion(m.text)
  }

  if (s.actions !== prev.actions) {
    for (const id of RECEIPTED) {
      const now = s.actions.find((a) => a.id === id)
      if (now?.status === 'done' && prev.actions.find((a) => a.id === id)?.status !== 'done') onDone(now)
    }
  }
})

/* ---------- The moments ---------- */

export const moments5to8: MomentDef[] = [
  { n: 5, ...CLOCK[5], title: momentTitles[5], commentary: C.commentary5to8[5], run: runMarketFall, settle: settleMarketFall },
  { n: 6, ...CLOCK[6], title: momentTitles[6], commentary: C.commentary5to8[6], run: runAskAnything, settle: settleAskAnything },
  { n: 7, ...CLOCK[7], title: momentTitles[7], commentary: C.commentary5to8[7], run: runHousehold, settle: settleHousehold },
  { n: 8, ...CLOCK[8], title: momentTitles[8], commentary: C.commentary5to8[8], run: runTrust },
]
