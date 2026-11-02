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
import { useMunim } from '../src/store'
import type { ActionCard } from '../src/types'

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

/* ---------- Persona dates ---------- */
/*
  Weekdays are computed, never typed. The spec's weekday labels ("Thu 30 Oct", "Sun 9 Nov")
  follow the 2025 calendar; the spec's year is 2026, so these assert the real 2026 weekdays.
  Only "Diwali, Sun 8 Nov" in the spec is right for 2026. If the story dates move, update here.
*/
section('Persona dates (2026 calendar)')
const due = (id: string) => P.cards.find((c) => c.id === id)!.due
check('Snapshot', fmtDate(P.AS_OF), 'Fri 30 Oct')
check('HDFC Regalia due', fmtDate(due('regalia')), 'Mon 9 Nov')
check('Axis Magnus due', fmtDate(due('magnus')), 'Thu 12 Nov')
check('Amex due', fmtDate(due('amex')), 'Sun 15 Nov')
check('ESOP lands', fmtDate(P.esop.landsOn), 'Wed 4 Nov')
check('Floater premium due', fmtDate(P.policies.find((p) => p.id === 'family-floater')!.premiumDue!), 'Fri 13 Nov')
check("Dad's FD matures", fmtDate(P.suresh.fd.maturesOn), 'Sat 14 Nov')
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
check('with year', fmtDate(P.AS_OF, { year: true }), 'Fri 30 Oct 2026')
check('9:14 am', fmtTime(P.AS_OF), '9:14 am')
check('just after midnight, 12h', fmtTime('2026-10-31T00:14:00+05:30'), '12:14 am')
check('just after midnight, 24h', fmtTime('2026-10-31T00:14:00+05:30', { clock: '24h' }), '00:14')
check('3:00 pm', fmtTime('2026-11-05T15:00:00+05:30'), '3:00 pm')
check('12:05 pm', fmtTime('2026-11-05T12:05:00+05:30'), '12:05 pm')
check('status bar clock', fmtTime(P.AS_OF, { ampm: false }), '9:14')
check('as of line', fmtAsOf(P.AS_OF), 'as of Fri 30 Oct, 9:14 am')

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

console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILURES'}: ${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
