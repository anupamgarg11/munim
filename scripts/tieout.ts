/*
  Tie-out: asserts the derived numbers in SPEC section 2, the formatting helpers,
  the persona dates, and a copy guard (no em or en dashes, no emoji in src). Prints PASS or FAIL per
  check and exits non-zero on any failure.
  Run: npm run tieout  (or npx tsx scripts/tieout.ts)
*/
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as P from '../src/data/persona'
import {
  computeFound,
  fundCost,
  fundGain,
  selectCardDues,
  selectCash,
  selectEsop,
  selectIdleAboveBuffer,
  selectInvestments,
  selectLoans,
  selectMonthlySpend,
  selectNetWorth,
  selectRegularPlans,
  selectSipsMonthly,
} from '../src/data/derived'
import { fmtAsOf, fmtDate, fmtINR, fmtLakh, fmtPct, fmtTime } from '../src/lib/format'
import * as A from '../src/lib/actions'
import { useMunim } from '../src/store'
import type { ActionCard, ActionDraft, LedgerEntry } from '../src/types'
// Item 4: the live persona and how balances move
import {
  LIQUID_FUND_ID,
  applyEffects,
  basePersona,
  fundValue,
  selectEsopSplit,
  selectLiquid,
  selectSweep,
} from '../src/data/derived'
import { diwaliBudget } from '../src/screens/screenData'
import type { Effect } from '../src/types'

let passed = 0
let failed = 0

function check(name: string, actual: unknown, expected: unknown) {
  const ok = Object.is(actual, expected)
  if (ok) passed++
  else failed++
  const show = (v: unknown) => (typeof v === 'string' ? JSON.stringify(v) : String(v))
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (expected ${show(expected)}, got ${show(actual)})`}`)
}

function section(title: string) {
  console.log(`\n${title}`)
}

const NBSP = ' '
const MINUS = '−'

/* ---------- SPEC 2: Derived ---------- */
section('SPEC 2 Derived')
const inv = selectInvestments()
const nw = selectNetWorth()
const reg = selectRegularPlans()
check('Cash in banks = 6,26,700', selectCash(), 626_700)
check('Idle above buffer in HDFC = 4,18,400', selectIdleAboveBuffer(), 418_400)
check('Mutual funds = 19,64,000', inv.mutualFunds, 1_964_000)
check('Stocks = 4,32,000', inv.stocks, 432_000)
check('NPS = 3,12,000', inv.nps, 312_000)
check('EPF = 6,24,000', inv.epf, 624_000)
check('Investments total = 33,32,000', inv.total, 3_332_000)
check('Loan outstanding = 6,80,000', selectLoans(), 680_000)
check('Card dues = 92,700', selectCardDues(), 92_700)
check('Net worth = 31,86,000', nw.total, 3_186_000)
check('Net worth parts add up', nw.cash + nw.investments - nw.loans - nw.cardDues, nw.total)
check('Regular plans = 11,00,000', reg.value, 1_100_000)
check('Regular-plan drag = 8,800 a year', reg.dragPerYear, 8_800)
check('Found this year starts at 0 (store)', useMunim.getState().foundThisYear, 0)

/* ---------- SPEC 2 parts used by later cards ---------- */
section('SPEC 2 parts')
const esop = selectEsop()
const mirae = P.funds.find((f) => f.id === 'mirae-midcap')!
check('ESOP buyback net = 6,40,000', esop.net, 640_000)
check('ESOP remaining vested shown = 4,00,000', esop.remainingValue, 400_000)
check('Mirae Midcap cost = 1,86,000', fundCost(mirae), 186_000)
check('Mirae Midcap loss = 38,000', -fundGain(mirae), 38_000)
check('Regular units older than a year = 7,40,000', reg.olderThanYear.value, 740_000)
check('Gains on those units = 61,000', reg.olderThanYear.gain, 61_000)
check('Regular units newer than a year = 3,60,000', reg.newer.value, 360_000)
check('SIPs = 45,000 a month', selectSipsMonthly(), 45_000)
check('Monthly spend = 75,000', selectMonthlySpend(), 75_000)

/* ---------- Found this year selector ---------- */
section('Found this year selector')
const card = (id: string, status: ActionCard['status'], found?: ActionCard['found']): ActionCard => ({
  id,
  type: 'info',
  title: id,
  why: '',
  impact: { amount: 0, per: 'none' },
  rail: 'MF Central',
  approval: 'tap',
  holdMinutes: 10,
  status,
  createdAt: P.AS_OF,
  timeline: [],
  receipts: [],
  earned: 0,
  found,
})
const fixture = [
  card('a', 'done', { amount: 11_400, scope: 'self' }),
  card('b', 'done', { amount: 8_800, scope: 'self' }),
  card('c', 'cancelled', { amount: 4_760, scope: 'self' }),
  card('d', 'held', { amount: 18_400, scope: 'self' }),
  card('e', 'done', { amount: 7_200, scope: 'family' }),
  card('f', 'done'),
]
check('Counts done cards only', computeFound(fixture).self, 20_200)
check('Family counted separately', computeFound(fixture).family, 7_200)
useMunim.getState().setActions(fixture)
check('Store recomputes on setActions', useMunim.getState().foundThisYear, 20_200)
useMunim.getState().reset()
check('Reset returns the counter to 0', useMunim.getState().foundThisYear, 0)

/* ---------- Item 3: action transitions (SPEC 4, 9.2) ---------- */
section('Action transitions (SPEC 4, 9.2)')
const T0 = '2026-10-30T00:14:00+05:30'
const NOW = Date.UTC(2026, 9, 29, 18, 44) // any fixed real-clock ms
function draft(id: string, over: Partial<ActionDraft> = {}): ActionDraft {
  return {
    id,
    type: 'sweep',
    title: id,
    why: 'why',
    impact: { amount: 0, per: 'none' },
    rail: 'MF Central',
    approval: 'tap',
    ...over,
  }
}
{
  const p = A.propose(draft('t-pin', { approval: 'pin' }), T0)
  check('propose: status proposed', p.status, 'proposed')
  check('propose: one timeline entry', p.timeline.length, 1)
  check('propose: earned 0', p.earned, 0)
  check('propose: tap or PIN card has no hold (runs after 1.5 s)', p.holdMinutes, 0)
  check('propose: Autopilot card holds 10 min', A.propose(draft('t-auto', { approval: 'none' }), T0).holdMinutes, 10)
  check('approveByTap cannot sign a PIN card (no-op)', A.approveByTap(p, T0), p)
  check('approveByMember cannot sign a PIN card (no-op)', A.approveByMember(p, 'Suresh', T0), p)
  check('complete cannot skip approval (no-op)', A.complete(p, T0).card, p)
  const ap = A.approveByPin(p, T0)
  check('approveByPin: approved', ap.status, 'approved')
  check('approveByPin: approver Nikhil', ap.approvedBy, 'Nikhil')
  check('approveByPin: appends a timeline entry', ap.timeline.length, 2)
  const h = A.hold({ ...ap, holdMinutes: 10 }, NOW, T0)
  check('hold: held', h.status, 'held')
  check('hold: holdEndsAt = now + 10 min', h.holdEndsAt, NOW + 600_000)
  check('hold: appends a timeline entry', h.timeline.length, 3)
  check('hold: run is stamped at the end of the hold', A.runStamp(h, T0), '2026-10-30T00:24:00+05:30')
  check('countdown at the start reads 10:00', A.fmtCountdown(A.holdRemainingMs(h, NOW)), '10:00')
  check('countdown 19 s in reads 09:41', A.fmtCountdown(A.holdRemainingMs(h, NOW + 19_000)), '09:41')
  check('countdown at the end reads 00:00', A.fmtCountdown(A.holdRemainingMs(h, NOW + 600_000)), '00:00')

  // Cancel during the hold never completes
  const c = A.cancel(h, T0)
  check('cancel during hold: cancelled', c.status, 'cancelled')
  check('cancel during hold: appends a timeline entry', c.timeline.length, 4)
  check('cancelled card cannot run', A.run(c, T0), c)
  const cc = A.complete(c, T0)
  check('cancelled card cannot complete', cc.card, c)
  check('cancelled card writes no ledger entry', cc.ledger, null)
  check('cancelled card cannot fail', A.fail(c, 'x', T0, T0), c)

  // Held -> running -> done
  const r = A.run(h, A.runStamp(h, T0))
  check('run: running', r.status, 'running')
  check('running card cannot be cancelled', A.cancel(r, T0), r)
  const d = A.complete(r, r.timeline[r.timeline.length - 1].at)
  check('complete: done', d.card.status, 'done')
  check('complete: one receipt', d.card.receipts.length, 1)
  check('complete: receipt rail', d.card.receipts[0].rail, 'MF Central')
  check('complete: timeline ends Done', d.card.timeline[d.card.timeline.length - 1].text, 'Done')
  check('complete: every transition left an entry', d.card.timeline.length, 5)
  check('complete: ledger earned 0', d.ledger?.earned, 0)
  check('complete: ledger approver Nikhil', d.ledger?.approver, 'Nikhil')
  check('complete: ledger links the card', d.ledger?.actionId, 't-pin')
  check('complete: reference is stable', A.complete(r, T0).card.receipts[0].reference, d.card.receipts[0].reference)
  check('done card cannot be cancelled', A.cancel(d.card, T0), d.card)

  // Failed: reason, retry time; does not count until a retry completes
  const f = A.fail(A.run(A.approveByTap(A.propose(draft('t-fail', { impact: { amount: 5_000, per: 'year' } }), T0), T0), T0), 'Bank declined at 02:10', '2026-10-30T10:00:00+05:30', T0)
  check('fail: failed', f.status, 'failed')
  check('fail: retry time kept', f.failure?.retryAt, '2026-10-30T10:00:00+05:30')
  check('fail: spec copy', f.timeline[f.timeline.length - 1].text, 'Bank declined at 02:10; retrying at 10:00 am. Nothing else affected.')
  check('failed card does not count', A.selectFound([f]).self, 0)
  const fr = A.complete(A.retry(f, T0), T0).card
  check('retry then complete: done and counts', A.selectFound([fr]).self, 5_000)
  check('a card that never states found counts its positive impact', fr.found?.amount, 5_000)
}

/* ---------- Item 3: Found this year from the SPEC 5 cards (SPEC 6) ---------- */
section('Found this year, running totals (SPEC 5.2 to 5.7, SPEC 6)')
{
  const hdfc = P.banks.find((b) => b.id === 'hdfc')!
  const rent = P.monthlySpend.find((c) => c.id === 'rent')!.monthly
  const monthly = selectMonthlySpend()
  const cardDues = selectCardDues()
  const liquidYield = P.rates.liquidFund.yield
  // Spec inputs (typed in the spec as proposals, not totals)
  const CARD_A_MOVE = 300_000
  const DIWALI = 25_000
  const ESOP_PREPAY = 200_000

  // Card A: ₹3,00,000 to the liquid fund, earning 6.8% instead of 3%
  const foundA = Math.round(CARD_A_MOVE * (liquidYield - P.rates.savings))
  // Card B: regular-plan drag
  const foundB = reg.dragPerYear
  // Subscriptions: the unused ones, a year
  const subsMonthly = P.subscriptions.filter((s) => s.unusedFor).reduce((a, s) => a + s.monthly, 0)
  const foundSubs = subsMonthly * 12
  // Sweep (SPEC 5.3): spare after commitments, rounded down to ₹10,000
  const hdfcAfterSalary = hdfc.balance - CARD_A_MOVE + P.profile.monthlyNetCredit
  const commitments = rent + P.loans[0].emi + selectSipsMonthly() + cardDues + DIWALI + (monthly - rent)
  const spare = hdfcAfterSalary - P.buffer.amount - commitments
  const sweep = Math.floor(spare / 10_000) * 10_000
  const foundSweep = Math.round(sweep * liquidYield)
  // ESOP (SPEC 5.4): prepay saves the loan's interest; liquid top-up and the rest are computed
  const foundEsop = Math.round(ESOP_PREPAY * P.loans[0].rate)
  const liquidNow = CARD_A_MOVE + sweep
  const liquidTopUp = Math.max(0, 6 * monthly - liquidNow)
  const esopRest = esop.net - ESOP_PREPAY - liquidTopUp
  // Harvest (SPEC 5.5): 20% short-term rate on the Mirae loss
  const foundHarvest = Math.round(-fundGain(mirae) * 0.2)
  // Dad's FD (SPEC 5.7): senior-citizen rate over the auto-renew rate
  const foundDad = Math.round(P.suresh.fd.principal * (P.suresh.seniorFdRate - P.suresh.fd.rate))

  check('Subscriptions unused = 2,450 a month', subsMonthly, 2_450)
  check('HDFC after salary (card A done) = 4,56,400', hdfcAfterSalary, 456_400)
  check('Commitments to next salary = 2,54,100', commitments, 254_100)
  check('Spare = 1,02,300', spare, 102_300)
  check('Sweep rounds down to 1,00,000', sweep, 100_000)
  check('Liquid after card A and the sweep = 4,00,000', liquidNow, 400_000)
  check('ESOP liquid top-up = 50,000', liquidTopUp, 50_000)
  check('ESOP rest into direct funds = 3,90,000', esopRest, 390_000)

  const ledger: LedgerEntry[] = []
  let deck: ActionCard[] = []
  const put = (card: ActionCard) => {
    deck = [...deck.filter((x) => x.id !== card.id), card]
  }
  /** Approve, hold if Autopilot, run, complete; collects the ledger entry */
  const sign = (d: ActionDraft, how: 'tap' | 'pin' | 'rule' | 'member', at: string) => {
    let card = A.propose(d, at)
    card =
      how === 'tap'
        ? A.approveByTap(card, at)
        : how === 'pin'
          ? A.approveByPin(card, at)
          : how === 'rule'
            ? A.approveByRule(card, 'Salary sweep', at)
            : A.approveByMember(card, 'Suresh', at)
    if (card.holdMinutes > 0) card = A.hold(card, NOW, at)
    card = A.run(card, A.runStamp(card, at))
    const out = A.complete(card, card.timeline[card.timeline.length - 1].at)
    if (out.ledger) ledger.push(out.ledger)
    put(out.card)
    return out.card
  }
  const self = () => A.selectFound(deck).self
  const family = () => A.selectFound(deck).family

  check('Moment 1: counter starts at 0', self(), 0)
  const M2 = '2026-10-29T09:30:00+05:30'
  sign(draft('a-idle', { type: 'sweep', approval: 'pin', amount: CARD_A_MOVE, impact: { amount: foundA, per: 'year' }, rail: 'bank e-mandate' }), 'pin', M2)
  sign(draft('b-regular', { type: 'switch', impact: { amount: foundB, per: 'year' } }), 'tap', M2)
  sign(draft('c-term', { type: 'insure', impact: { amount: 0, per: 'none', label: 'Protection, no ₹ a year' }, rail: 'insurer direct' }), 'tap', M2)
  sign(draft('d-subs', { type: 'pay', impact: { amount: foundSubs, per: 'year' } }), 'tap', M2)
  check('After moment 2 (A, B, C, subscriptions) = 49,600', self(), 49_600)

  const skippedDeck = deck.map((x) => (x.id === 'd-subs' ? { ...x, status: 'cancelled' as const } : x))
  check('A skipped card does not count (subscriptions skipped = 20,200)', A.selectFound(skippedDeck).self, 20_200)

  const sweepCard = sign(
    draft('sweep-oct', { type: 'sweep', approval: 'none', ruleId: 'salary-sweep', amount: sweep, impact: { amount: foundSweep, per: 'year' } }),
    'rule',
    T0,
  )
  check('After moment 3 sweep = 56,400', self(), 56_400)
  check('Sweep held 10 min, then ran at 00:24', sweepCard.receipts[0].at, '2026-10-30T00:24:00+05:30')

  sign(
    draft('esop-split', {
      type: 'prepay',
      approval: 'pin',
      rail: 'bank e-mandate',
      amount: esop.net,
      impact: { amount: foundEsop, per: 'year' },
      lines: [
        { label: 'Prepay the education loan', amount: ESOP_PREPAY },
        { label: 'Liquid top-up', amount: liquidTopUp },
        { label: 'Direct funds, three tranches', amount: esopRest },
      ],
    }),
    'pin',
    '2026-11-03T10:00:00+05:30',
  )
  check('After moment 4 = 74,800', self(), 74_800)

  sign(draft('harvest-mirae', { type: 'harvest', impact: { amount: foundHarvest, per: 'now' } }), 'tap', '2026-11-06T10:00:00+05:30')
  check('After moment 5 harvest = 82,400', self(), 82_400)

  // A failed card in the deck changes nothing
  put(A.fail(A.run(A.approveByTap(A.propose(draft('bill-fail', { impact: { amount: 9_999, per: 'year' } }), T0), T0), T0), 'Bank declined at 02:10', '2026-10-30T10:00:00+05:30', T0))
  check('A failed card does not count', self(), 82_400)

  sign(
    draft('dad-fd', { type: 'invest', approval: 'member-consent', approverMemberId: 'suresh', amount: P.suresh.fd.principal, impact: { amount: foundDad, per: 'year' } }),
    'member',
    '2026-11-11T11:00:00+05:30',
  )
  check('After moment 7: self stays 82,400', self(), 82_400)
  check('After moment 7: family = 7,200, kept separate', family(), 7_200)
  check('Display line', `${fmtINR(self())} found this year`, '₹82,400 found this year')

  check('Every done card has a ledger entry', ledger.length, deck.filter((x) => x.status === 'done').length)
  check('Every ledger entry earned 0', ledger.every((l) => l.earned === 0), true)
  check('Ledger approver for card A: Nikhil', ledger.find((l) => l.actionId === 'a-idle')?.approver, 'Nikhil')
  check('Ledger approver for the sweep: the rule', ledger.find((l) => l.actionId === 'sweep-oct')?.approver, 'Salary sweep')
  check("Ledger approver for Dad's FD: Suresh", ledger.find((l) => l.actionId === 'dad-fd')?.approver, 'Suresh')
  check('Ledger amount for card A = 3,00,000', ledger.find((l) => l.actionId === 'a-idle')?.amount, 300_000)
}

/* ---------- Persona dates ---------- */
/*
  Weekdays are computed, never typed. The spec's weekday labels ("Thu 30 Oct", "Sun 9 Nov")
  are the 2026 calendar (spec section 0). If the story dates move, update here.
*/
section('Persona dates (2026 calendar)')
const due = (id: string) => P.cards.find((c) => c.id === id)!.due
check('Snapshot', fmtDate(P.AS_OF), 'Thu 29 Oct')
check('HDFC Regalia due', fmtDate(due('regalia')), 'Mon 9 Nov')
check('Axis Magnus due', fmtDate(due('magnus')), 'Thu 12 Nov')
check('Amex due', fmtDate(due('amex')), 'Mon 16 Nov')
check('ESOP lands', fmtDate(P.esop.landsOn), 'Tue 3 Nov')
check('Floater premium due', fmtDate(P.policies.find((p) => p.id === 'family-floater')!.premiumDue!), 'Fri 13 Nov')
check("Dad's FD matures", fmtDate(P.suresh.fd.maturesOn), 'Fri 13 Nov')
check('Subscriptions category is computed', P.monthlySpend.find((c) => c.id === 'subscriptions')!.monthly, 3_218)
check('Monthly spend still totals 75,000', P.monthlySpend.reduce((t, c) => t + c.monthly, 0), 75_000)
check('Diwali', fmtDate('2026-11-08'), 'Sun 8 Nov')

/* ---------- Formatting helpers ---------- */
section('fmtINR')
check('0', fmtINR(0), '₹0')
check('999', fmtINR(999), '₹999')
check('1,000', fmtINR(1_000), '₹1,000')
check('1,23,456', fmtINR(123_456), '₹1,23,456')
check('6,26,700', fmtINR(626_700), '₹6,26,700')
check('33,32,000', fmtINR(3_332_000), '₹33,32,000')
check('31,86,000 (net worth)', fmtINR(nw.total), '₹31,86,000')
check('1,23,45,678', fmtINR(12_345_678), '₹1,23,45,678')
check('rounds paise', fmtINR(8_800.4), '₹8,800')
check('negative uses the minus sign', fmtINR(-38_000), `${MINUS}₹38,000`)
check('signed positive', fmtINR(18_400, { signed: true }), '+₹18,400')
check('no minus on -0.2', fmtINR(-0.2), '₹0')

section('fmtLakh')
check('4,20,000', fmtLakh(420_000), `₹4.2${NBSP}L`)
check('4,18,400', fmtLakh(418_400), `₹4.18${NBSP}L`)
check('4,18,400 at 1 digit', fmtLakh(418_400, 1), `₹4.2${NBSP}L`)
check('1,00,000', fmtLakh(100_000), `₹1${NBSP}L`)
check('1,25,000', fmtLakh(125_000), `₹1.25${NBSP}L`)
check('50,000', fmtLakh(50_000), `₹0.5${NBSP}L`)
check('11,00,000', fmtLakh(1_100_000), `₹11${NBSP}L`)
check('1,20,00,000', fmtLakh(12_000_000), `₹1.2${NBSP}Cr`)
check('1,00,00,000', fmtLakh(10_000_000), `₹1${NBSP}Cr`)
check('4,00,00,000', fmtLakh(40_000_000), `₹4${NBSP}Cr`)
check('99,99,999 rolls to crore', fmtLakh(9_999_999), `₹1${NBSP}Cr`)
check('negative', fmtLakh(-680_000), `${MINUS}₹6.8${NBSP}L`)

section('fmtPct')
check('6.8%', fmtPct(0.068), '6.8%')
check('3%', fmtPct(0.03), '3%')
check('9.2%', fmtPct(0.092), '9.2%')

section('fmtDate and fmtTime (IST)')
check('Thu 5 Nov', fmtDate('2026-11-05T10:00:00+05:30'), 'Thu 5 Nov')
check('UTC evening is next day in IST', fmtDate('2026-11-04T20:00:00Z'), 'Thu 5 Nov')
check('bare date is that IST day', fmtDate('2026-11-06'), 'Fri 6 Nov')
check('with year', fmtDate(P.AS_OF, { year: true }), 'Thu 29 Oct 2026')
check('9:14 am', fmtTime(P.AS_OF), '9:14 am')
check('just after midnight, 12h', fmtTime('2026-10-31T00:14:00+05:30'), '12:14 am')
check('just after midnight, 24h', fmtTime('2026-10-31T00:14:00+05:30', { clock: '24h' }), '00:14')
check('3:00 pm', fmtTime('2026-11-05T15:00:00+05:30'), '3:00 pm')
check('12:05 pm', fmtTime('2026-11-05T12:05:00+05:30'), '12:05 pm')
check('status bar clock', fmtTime(P.AS_OF, { ampm: false }), '9:14')
check('as of line', fmtAsOf(P.AS_OF), 'as of Thu 29 Oct, 9:14 am')

/* ---------- Copy guard: no em or en dashes, no emoji in src ---------- */
section('Copy guard (src)')
const srcDir = fileURLToPath(new URL('../src', import.meta.url))
const files: string[] = []
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(ts|tsx|css|html)$/.test(name)) files.push(p)
  }
}
walk(srcDir)
const dashHits: string[] = []
const emojiHits: string[] = []
for (const f of files) {
  readFileSync(f, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const where = `${relative(srcDir, f)}:${i + 1}`
      if (/[\u2012-\u2015]/.test(line)) dashHits.push(where)
      if (/\p{Extended_Pictographic}/u.test(line)) emojiHits.push(where)
    })
}
check(`No em or en dashes in ${files.length} files${dashHits.length ? ` [${dashHits.join(', ')}]` : ''}`, dashHits.length, 0)
check(`No emoji${emojiHits.length ? ` [${emojiHits.join(', ')}]` : ''}`, emojiHits.length, 0)
const bannedHits: string[] = []
for (const f of files) {
  // Comments may name the rule itself ("no agentic"); strip them (keeping line numbers) and check code and copy.
  readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n')
    .forEach((line, i) => {
      const code = line.replace(/(^|[^:])\/\/.*$/, '$1')
      if (/\b(agentic|orchestrator)\b/i.test(code)) bannedHits.push(`${relative(srcDir, f)}:${i + 1}`)
    })
}
check(`No "agentic" or "orchestrator"${bannedHits.length ? ` [${bannedHits.join(', ')}]` : ''}`, bannedHits.length, 0)

/* ---------- Item 3: the store drives the same transitions with real timers ---------- */
section('Store: approve, hold, cancel, skip wait, run, done (real timers)')
{
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const st = () => useMunim.getState()
  const get = (id: string) => st().actions.find((x) => x.id === id)!
  st().reset()
  st().setClock(T0)
  st().setRules([
    { id: 'salary-sweep', name: 'Salary sweep', trigger: 'salary lands', action: 'move spare cash to the liquid fund', capPerRun: 200_000, capPerMonth: 200_000, rail: 'bank e-mandate', holdMinutes: 10, enabled: true },
  ])
  const auto = (id: string): ActionDraft =>
    draft(id, { approval: 'none', ruleId: 'salary-sweep', amount: 100_000, impact: { amount: 6_800, per: 'year' }, cancelNote: "Kept in HDFC. I'll ask next month." })

  // Cancel during the hold: never completes, even after Skip wait and the ticker
  st().proposeAction(auto('s-cancel'))
  st().approveAction('s-cancel', 'tap')
  check('Autopilot card approved by its rule, then held', get('s-cancel').status, 'held')
  check('Approver is the rule', get('s-cancel').approvedBy, 'Salary sweep')
  const left = (get('s-cancel').holdEndsAt ?? 0) - Date.now()
  check('Hold is 10 minutes of real time', left > 599_000 && left <= 600_000, true)
  st().cancelAction('s-cancel')
  st().skipWait('s-cancel')
  check('Cancelled during hold stays cancelled after Skip wait', get('s-cancel').status, 'cancelled')
  check('Cancel note on the timeline', get('s-cancel').timeline.at(-1)?.text, "Kept in HDFC. I'll ask next month.")

  // Held -> Skip wait -> running -> done after 1.5 s
  st().proposeAction(auto('s-run'))
  st().approveAction('s-run', 'rule')
  st().skipWait()
  check('Skip wait: running', get('s-run').status, 'running')

  // PIN card: a tap opens the PIN sheet instead of approving
  st().proposeAction(draft('pin-card', { approval: 'pin', amount: 300_000, impact: { amount: 11_400, per: 'year' } }))
  st().approveAction('pin-card', 'tap')
  check('Tap on a PIN card does not approve', get('pin-card').status, 'proposed')
  check('Tap on a PIN card opens the PIN sheet', st().pinSheetActionId, 'pin-card')
  st().approveAction('pin-card', 'pin')
  check('PIN approval runs at once (no hold on a signed card)', get('pin-card').status, 'running')

  // Scripted failure (SPEC 9.5)
  st().proposeAction(draft('fail-card', { impact: { amount: 1_000, per: 'year' }, scriptedFailure: { reason: 'Bank declined at 02:10', retryAt: '2026-10-30T10:00:00+05:30' } }))
  st().approveAction('fail-card', 'tap')

  // Member card: a tap asks the member instead
  st().proposeAction(draft('member-card', { approval: 'member-consent', approverMemberId: 'suresh', impact: { amount: 7_200, per: 'year' } }))
  st().approveAction('member-card', 'tap')
  check('Tap on a member card sends the request', st().memberRequest?.actionId, 'member-card')
  st().approveAction('member-card', 'member')
  check('Member approval names the member', get('member-card').approvedBy, 'Suresh')

  st().setHighlightedActionId('s-run')
  check('Highlight set', st().highlightedActionId, 's-run')
  st().showToast('Hello')
  check('Toast shown', st().toasts.length, 1)

  await sleep(A.RUN_MS + 300)
  check('After 1.5 s: done', get('s-run').status, 'done')
  check('Done is stamped at the end of the hold (00:24)', get('s-run').receipts[0]?.at, '2026-10-30T00:24:00+05:30')
  check('PIN card done', get('pin-card').status, 'done')
  check('Scripted failure: failed', get('fail-card').status, 'failed')
  check('Member card done', get('member-card').status, 'done')
  check('Highlight clears after 1.2 s', st().highlightedActionId, null)
  check('Counter: sweep + card A = 18,200 (failed card excluded)', st().foundThisYear, 18_200)
  check('Counter: family = 7,200', st().foundFamily, 7_200)
  check('Ledger: three entries, none for the cancelled or failed card', st().ledger.map((l) => l.actionId).join(','), 's-run,pin-card,member-card')
  check('Ledger: rule as approver', st().ledger[0]?.approver, 'Salary sweep')

  st().retryAction('fail-card')
  check('Retry: running', get('fail-card').status, 'running')
  await sleep(A.RUN_MS + 300)
  check('Retry: done after 1.5 s', get('fail-card').status, 'done')
  check('Retry: now counts', st().foundThisYear, 19_200)

  // Kill switch cancels held actions and blocks new Autopilot approvals
  st().proposeAction(auto('s-kill'))
  st().approveAction('s-kill', 'rule')
  st().setKillSwitch(true)
  check('Kill switch cancels a held action', get('s-kill').status, 'cancelled')
  st().proposeAction(auto('s-blocked'))
  st().approveAction('s-blocked', 'rule')
  check('Kill switch blocks Autopilot approval', get('s-blocked').status, 'proposed')

  st().reset()
  check('Reset clears actions, ledger and counter', `${st().actions.length},${st().ledger.length},${st().foundThisYear}`, '0,0,0')
  check('Reset clears toasts', st().toasts.length, 0)
  st().stopHoldTicker()
}

/* ---------- Item 4: balances move with the story (SPEC 9.3, 5.2 to 5.4) ---------- */
section('Live persona: effects (SPEC 9.3)')
{
  const T = '2026-10-29T09:16:00+05:30'
  const hdfcOf = (p: typeof P) => p.banks.find((b) => b.id === 'hdfc')!.balance
  const base = basePersona()
  const CARD_A = 300_000
  const cardA: Effect[] = [
    { target: 'account', id: 'hdfc', delta: -CARD_A },
    { target: 'liquid', delta: CARD_A },
  ]
  const afterA = applyEffects(base, cardA, T)
  const liquid = afterA.funds.find((f) => f.id === LIQUID_FUND_ID)
  check('Card A: HDFC = 2,18,400', hdfcOf(afterA), 218_400)
  check('Card A: liquid fund created at 3,00,000', liquid ? fundValue(liquid) : 0, 300_000)
  check('Card A: liquid fund is ICICI Liquid Direct, direct plan', `${liquid?.name}, ${liquid?.plan}`, 'ICICI Liquid Direct, direct')
  check('Card A: net worth unchanged (a transfer) = 31,86,000', selectNetWorth(afterA).total, 3_186_000)
  check('Card A: idle above buffer = 1,18,400', selectIdleAboveBuffer(afterA), 118_400)
  check('Card A: AS_OF moves to the change', afterA.AS_OF, T)
  check('Snapshot untouched (pure)', hdfcOf(P), 518_400)

  const salaryAt = '2026-10-30T00:14:00+05:30'
  const afterSalary = applyEffects(afterA, [{ target: 'account', id: 'hdfc', delta: P.profile.monthlyNetCredit }], salaryAt)
  check('Salary credit raises HDFC by 2,38,000', hdfcOf(afterSalary) - hdfcOf(afterA), 238_000)
  check('Salary credit raises net worth by 2,38,000', selectNetWorth(afterSalary).total - selectNetWorth(afterA).total, 238_000)

  const sweep = selectSweep(afterSalary, { diwali: diwaliBudget.amount })
  check('Sweep from the live persona: HDFC after salary = 4,56,400', sweep.balance, 456_400)
  check('Sweep: commitments = 2,54,100', sweep.committed, 254_100)
  check('Sweep: spare = 1,02,300', sweep.spare, 102_300)
  check('Sweep: moves 1,00,000', sweep.amount, 100_000)
  const skippedA = selectSweep(applyEffects(base, [{ target: 'account', id: 'hdfc', delta: P.profile.monthlyNetCredit }], salaryAt), { diwali: diwaliBudget.amount })
  check('Sweep with card A skipped is simply larger (4,00,000)', skippedA.amount, 400_000)
  const afterSweep = applyEffects(afterSalary, [{ target: 'account', id: 'hdfc', delta: -sweep.amount }, { target: 'liquid', delta: sweep.amount }], salaryAt)
  check('After the sweep: liquid = 4,00,000', selectLiquid(afterSweep), 400_000)

  const esopAt = '2026-11-03T10:40:00+05:30'
  const afterEsop = applyEffects(afterSweep, [{ target: 'account', id: 'hdfc', delta: esop.net }], esopAt)
  const split = selectEsopSplit(afterEsop, {
    prepay: 200_000,
    loanId: 'sbi-edu',
    emergencyMonths: 6,
    tranches: 3,
    split: [
      { fundId: 'ppfas', share: 0.5 },
      { fundId: 'uti-nifty', share: 0.35 },
      { fundId: 'mirae-midcap', share: 0.15 },
    ],
  })
  check('Split: prepay 2,00,000', split.prepay, 200_000)
  check('Split: liquid top-up = 50,000', split.topUp, 50_000)
  check('Split: rest = 3,90,000', split.rest, 390_000)
  check('Split: three tranches of 1,30,000', split.tranches.join(','), '130000,130000,130000')
  check('Split: tranche 1 by fund 65,000 / 45,500 / 19,500', split.byFund(130_000).map((f) => f.amount).join(','), '65000,45500,19500')
  check('Split: interest saved = 18,400', split.interestSaved, 18_400)
  const t1 = split.byFund(split.tranches[0])
  const afterSplit = applyEffects(
    afterEsop,
    [
      { target: 'loan', id: 'sbi-edu', delta: -split.prepay },
      { target: 'account', id: 'hdfc', delta: -(split.prepay + split.topUp + split.tranches[0]) },
      { target: 'liquid', delta: split.topUp },
      ...t1.map((f) => ({ target: 'fund', id: f.fundId, delta: f.amount }) as Effect),
    ],
    esopAt,
  )
  check('After moment 4: loan = 4,80,000', selectLoans(afterSplit), 480_000)
  check('After moment 4: months left shorten in proportion (34)', afterSplit.loans[0].monthsLeft, 34)
  check('After moment 4: liquid = 4,50,000 (six months of spending)', selectLiquid(afterSplit), 450_000)
  check('After moment 4: HDFC = 6,16,400 (tranches 2 and 3 wait there)', hdfcOf(afterSplit), 616_400)
  check('After moment 4: net worth = 40,64,000', selectNetWorth(afterSplit).total, 4_064_000)
  check('After moment 4: Mirae still 38,000 below cost', -fundGain(afterSplit.funds.find((f) => f.id === 'mirae-midcap')!), 38_000)

  const fall = applyEffects(base, [{ target: 'stocks', delta: -Math.round(selectInvestments(base).stocks * 0.06) }], esopAt)
  check('Stocks move pro rata and still sum (4,06,080)', selectInvestments(fall).stocks, 406_080)
  const sold = applyEffects(base, [{ target: 'fund', id: 'mirae-midcap', delta: -148_000 }], esopAt)
  check('Selling a whole fund removes it', sold.funds.some((f) => f.id === 'mirae-midcap'), false)
  const bought = applyEffects(base, [{ target: 'fund', id: 'new-midcap', delta: 148_000, name: 'New Midcap Direct' }], esopAt)
  check('A purchase into a new id creates a direct fund', bought.funds.find((f) => f.id === 'new-midcap')?.name, 'New Midcap Direct')
  check('Unknown ids change nothing', applyEffects(base, [{ target: 'account', id: 'nope', delta: 1 }], esopAt), base)
}

section('Store: the live persona moves with completed cards')
{
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const st = () => useMunim.getState()
  const hdfc = () => st().persona.banks.find((b) => b.id === 'hdfc')!.balance
  st().reset()
  check('Store starts at the snapshot (HDFC 5,18,400)', hdfc(), 518_400)
  check('Store starts with four Autopilot rules', st().rules.length, 4)
  st().setClock('2026-10-29T09:16:00+05:30')
  st().proposeAction(
    draft('live-a', {
      approval: 'pin',
      amount: 300_000,
      impact: { amount: 11_400, per: 'year' },
      effects: [
        { target: 'account', id: 'hdfc', delta: -300_000 },
        { target: 'liquid', delta: 300_000 },
      ],
    }),
  )
  st().approveAction('live-a', 'pin')
  check('Effects wait until the card is done', hdfc(), 518_400)
  await sleep(A.RUN_MS + 300)
  check('Card done: HDFC = 2,18,400', hdfc(), 218_400)
  check('Card done: liquid = 3,00,000', selectLiquid(st().persona), 300_000)
  check('Card done: logged once', st().balanceLog.length, 1)
  st().completeAction('live-a')
  check('Completing again changes nothing', hdfc(), 218_400)
  const after = st().applyEffects([{ target: 'account', id: 'hdfc', delta: 238_000 }], 'Salary')
  check('store.applyEffects returns and keeps the new persona', after.banks.find((b) => b.id === 'hdfc')!.balance, 456_400)

  // A card bill scheduled under its rule runs when the clock passes its date.
  st().setClock('2026-10-30T00:14:00+05:30')
  st().proposeAction(
    draft('live-bill', {
      type: 'pay',
      approval: 'none',
      ruleId: 'pay-cards',
      amount: 48_600,
      scheduledFor: '2026-11-09T09:00:00+05:30',
      effects: [
        { target: 'card', id: 'regalia', delta: -48_600 },
        { target: 'account', id: 'hdfc', delta: -48_600 },
      ],
    }),
  )
  st().approveAction('live-bill', 'rule')
  st().runDueActions()
  check('Bill waits for its date', st().actions.find((a) => a.id === 'live-bill')?.status, 'approved')
  st().setClock('2026-11-09T20:05:00+05:30')
  st().runDueActions()
  const bill = st().actions.find((a) => a.id === 'live-bill')!
  check('On its date the bill runs and completes', bill.status, 'done')
  check('It ran after its 10 minute hold (9:10 am)', bill.receipts[0]?.at, '2026-11-09T09:10:00+05:30')
  check('Card dues drop by the bill', selectCardDues(st().persona), 92_700 - 48_600)
  check('HDFC drops by the bill', hdfc(), 456_400 - 48_600)
  check("The rule's last run is the bill's run", st().rules.find((r) => r.id === 'pay-cards')?.lastRun, '2026-11-09T09:10:00+05:30')

  st().reset()
  check('Reset restores the snapshot persona', hdfc(), 518_400)
  check('Reset clears the balance log', st().balanceLog.length, 0)
  st().stopHoldTicker()
}

/* ---------- Item 6: the demo clock runs held and failed cards; SIPs move; the top-up cap ---------- */
section('Demo clock: held cards, failed bills, retries (SPEC 9.2, 9.5)')
{
  const st = () => useMunim.getState()
  const get = (id: string) => st().actions.find((a) => a.id === id)!
  st().reset()
  st().setClock('2026-10-30T00:14:00+05:30')
  st().proposeAction(draft('clock-sweep', { approval: 'none', ruleId: 'sweep-spare', amount: 100_000, impact: { amount: 6_800, per: 'year' } }))
  st().approveAction('clock-sweep', 'rule')
  check('Sweep held in real time', get('clock-sweep').status, 'held')
  st().runDueActions()
  check('Still held while the demo clock has not passed the hold', get('clock-sweep').status, 'held')
  st().setClock('2026-11-03T10:40:00+05:30')
  st().runDueActions()
  check('A later moment runs it: done', get('clock-sweep').status, 'done')
  check('Done at the end of its hold (00:24), not at the new clock', get('clock-sweep').receipts[0]?.at, '2026-10-30T00:24:00+05:30')

  st().proposeAction(
    draft('clock-magnus', {
      type: 'pay',
      approval: 'none',
      ruleId: 'pay-cards',
      amount: 31_200,
      scheduledFor: '2026-11-12T02:00:00+05:30',
      scriptedFailure: { reason: 'Bank declined at 02:10', retryAt: '2026-11-12T10:00:00+05:30' },
    }),
  )
  st().approveAction('clock-magnus', 'rule')
  st().setClock('2026-11-12T09:00:00+05:30')
  st().runDueActions()
  check('Magnus bill fails on its date', get('clock-magnus').status, 'failed')
  check('Failure line', get('clock-magnus').timeline.at(-1)?.text, 'Bank declined at 02:10; retrying at 10:00 am. Nothing else affected.')
  check('Failed run stamped 02:10', get('clock-magnus').timeline.at(-1)?.at, '2026-11-12T02:10:00+05:30')
  st().runDueActions()
  check('Before 10:00 it stays failed', get('clock-magnus').status, 'failed')
  st().setClock('2026-11-12T10:30:00+05:30')
  st().runDueActions()
  check('The next clock move past 10:00 retries it: done', get('clock-magnus').status, 'done')
  check('Retried and done at 10:00', get('clock-magnus').receipts[0]?.at, '2026-11-12T10:00:00+05:30')

  st().reset()
  st().stopHoldTicker()
}

section('SIP effect and the top-up cap')
{
  const base = basePersona()
  const at = '2026-11-06T09:20:00+05:30'
  const moved = applyEffects(
    base,
    [
      { target: 'sip', id: 'mirae-midcap', delta: -10_000 },
      { target: 'sip', id: 'kotak-emerging-direct', delta: 10_000 },
    ],
    at,
  )
  check('SIP moved: Mirae stops', moved.sips.some((x) => x.fundId === 'mirae-midcap'), false)
  check('SIP moved: Kotak 10,000 on the 5th', moved.sips.find((x) => x.fundId === 'kotak-emerging-direct')?.dayOfMonth, 5)
  check('SIPs still 45,000 a month', selectSipsMonthly(moved), 45_000)

  // Card B: the older units of each regular fund switch to its direct plan
  const switched = applyEffects(
    base,
    [
      { target: 'switch', id: 'hdfc-flexi-reg', delta: 510_000, name: 'HDFC Flexi Cap' },
      { target: 'switch', id: 'axis-bluechip-reg', delta: 230_000, name: 'Axis Bluechip' },
    ],
    at,
  )
  check('Switch: regular plans left = 3,60,000', selectRegularPlans(switched).value, 360_000)
  check('Switch: drag falls to 2,880 a year until March', selectRegularPlans(switched).dragPerYear, 2_880)
  check('Switch: HDFC Flexi Cap direct = 5,10,000', fundValue(switched.funds.find((f) => f.id === 'hdfc-flexi-reg-direct')!), 510_000)
  check('Switch: net worth unchanged', selectNetWorth(switched).total, selectNetWorth(base).total)

  // Card A and the sweep skipped: the liquid fund is empty, the gap is the whole 4,50,000.
  const skipped = applyEffects(base, [{ target: 'account', id: 'hdfc', delta: esop.net }], at)
  const inputs = {
    prepay: 200_000,
    loanId: 'sbi-edu',
    emergencyMonths: 6,
    tranches: 3,
    split: [
      { fundId: 'ppfas', share: 0.5 },
      { fundId: 'uti-nifty', share: 0.35 },
      { fundId: 'mirae-midcap', share: 0.15 },
    ],
  }
  const capped = selectEsopSplit(skipped, { ...inputs, topUpMaxShare: 0.4 })
  check('Off path: top-up capped at 40% of the buyback, rounded down to 10,000 (2,50,000)', capped.topUp, 250_000)
  check('Off path: the rest still invests (1,90,000)', capped.rest, 190_000)
  check('Without the cap it would take 4,40,000', selectEsopSplit(skipped, inputs).topUp, 440_000)
}

console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'}: ${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
