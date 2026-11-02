/*
  Numbers the chat answers quote (SPEC 9.4). Every figure is computed from persona.ts and
  derived.ts; the only literals are market assumptions and quotes the spec gives as inputs
  (car loan rate, home loan rate, term quote, plan prices), each labelled below.
*/
import * as P from '../data/persona'
import {
  fundGain,
  selectEsop,
  selectCardDues,
  selectCash,
  selectIdleAboveBuffer,
  selectInvestments,
  selectMonthlySpend,
  selectNetWorth,
  selectRegularPlans,
  selectSipsMonthly,
} from '../data/derived'

/* ---------- Assumptions (inputs, not totals) ---------- */

export const assumptions = {
  /** SPEC 5.6: car loan at 9% for 5 years; ₹3 L down now (option A) or ₹6 L in September (B) */
  car: {
    defaultPrice: 1_400_000,
    rate: 0.09,
    years: 5,
    downNow: 300_000,
    downLater: 600_000,
    waitUntil: 'September',
    goalYear: 2029,
    goalDelayMonthsAtDefault: 4,
    /** "Car fund" set-aside: ₹50,000 a month from December (month index 11) */
    setAside: 50_000,
    setAsideFromMonth: 11,
    /** Above this share of take-home, a car EMI is a stretch */
    emiShareCap: 0.2,
  },
  /** SPEC 5.4: a lump sum goes in three tranches over six weeks, 50/35/15 across the direct funds */
  invest: { tranches: 3, weeks: 6, split: [{ fundId: 'ppfas', share: 0.5 }, { fundId: 'uti-nifty', share: 0.35 }, { fundId: 'mirae-midcap', share: 0.15 }] },
  /** Home loan rule of thumb: EMI within 30% of take-home, 8.5% over 20 years, 20% down, about 7% stamp duty and registration */
  house: { emiShare: 0.3, rate: 0.085, years: 20, downShare: 0.2, stampShare: 0.07, goalYear: 2029 },
  /** Long-run return and inflation for the retirement projection */
  retire: { returnRate: 0.1, inflation: 0.06, atAge: 60, stepUp: 0.1 },
  /** Term cover: about 10x income (SPEC 5.2 card C says about ₹4 Cr at ₹42 L); quote about ₹2,300 a month at 33 */
  term: { incomeMultiple: 10, topUpMonthlyQuote: 2_300 },
  /** Tax rules used in answers */
  tax: { ltcgExemption: 125_000, stcgRate: 0.2 },
  /** Liquid fund instant redemption limit a day */
  liquidInstantPerDay: 50_000,
  /** What-if scenarios */
  whatIf: { marketFall: 0.2, rateRise: 0.01 },
  /** SPEC 5.8 plans */
  plans: { plus: 1_999, family: 2_999, familyMembers: 6, managedFrom: 2_500_000, managedFee: 0.005 },
  /** SPEC 5.7: keep this much of Dad's money liquid for medical needs */
  sureshMedicalReserve: 200_000,
}

/* ---------- Money maths ---------- */

/** Monthly EMI on a loan */
export function emi(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12
  const n = years * 12
  const f = (1 + r) ** n
  return (principal * r * f) / (f - 1)
}

/** Loan a monthly EMI supports */
export function loanForEmi(monthly: number, annualRate: number, years: number): number {
  const r = annualRate / 12
  const n = years * 12
  const f = (1 + r) ** n
  return (monthly * (f - 1)) / (r * f)
}

export const roundTo = (n: number, step: number) => Math.round(n / step) * step
export const floorTo = (n: number, step: number) => Math.floor(n / step) * step

/** Future value of a lump sum and a monthly SIP that steps up once a year */
export function futureValue(lump: number, monthly: number, annualRate: number, years: number, stepUp = 0): number {
  const r = annualRate / 12
  let value = lump
  let sip = monthly
  for (let y = 0; y < years; y++) {
    for (let m = 0; m < 12; m++) value = value * (1 + r) + sip
    sip *= 1 + stepUp
  }
  return value
}

/* ---------- Snapshot facts ---------- */

const inv = selectInvestments()
const nw = selectNetWorth()
const reg = selectRegularPlans()
const spend = selectMonthlySpend()
const rent = P.monthlySpend.find((c) => c.id === 'rent')?.monthly ?? 0
const loan = P.loans[0]
const mirae = P.funds.find((f) => f.id === 'mirae-midcap')
const cardDues = selectCardDues()
const idle = selectIdleAboveBuffer()
const term = P.policies.find((p) => p.kind === 'term')
const floater = P.policies.find((p) => p.id === 'family-floater')
const corpHealth = P.policies.find((p) => p.id === 'corp-health')

/** Card A: the idle-cash sweep leaves the card bills on top of the buffer, rounded down to a lakh */
const sweepA = floorTo(idle - cardDues, 100_000)

export const facts = {
  asOf: P.AS_OF,
  firstName: P.profile.firstName,
  age: P.profile.age,
  ctc: P.profile.ctc,
  takeHome: P.profile.monthlyNetCredit,
  cash: selectCash(),
  investments: inv,
  netWorth: nw,
  cardDues,
  idle,
  buffer: P.buffer.amount,
  savingsRate: P.rates.savings,
  liquid: P.rates.liquidFund,
  sweepA,
  /** Extra a year from card A: the swept amount at the liquid yield instead of the savings rate */
  sweepAGain: Math.round(sweepA * (P.rates.liquidFund.yield - P.rates.savings)),
  regular: reg,
  spend,
  rent,
  living: spend - rent,
  categories: P.monthlySpend,
  emergencyTarget: 6 * spend,
  sipsMonthly: selectSipsMonthly(),
  sips: P.sips.map((s) => ({ ...s, name: P.funds.find((f) => f.id === s.fundId)?.name ?? s.fundId })),
  loan,
  /** Market-linked: mutual funds and stocks */
  marketLinked: inv.mutualFunds + inv.stocks,
  retirementPots: inv.epf + inv.nps,
  mirae: { name: mirae?.name ?? 'Mirae Asset Midcap', loss: mirae ? -fundGain(mirae) : 0 },
  term: { cover: term?.cover ?? 0, sizedAt: P.termSizedAtSalary },
  floater: { cover: floater?.cover ?? 0, premium: floater?.premium ?? 0, due: floater?.premiumDue },
  corpHealth: { cover: corpHealth?.cover ?? 0, provider: P.profile.employer },
  subscriptionsUnused: P.subscriptions.filter((s) => s.unusedFor),
  suresh: P.suresh,
  sureshId: P.people.suresh.id,
  salaryBank: P.banks.find((b) => b.id === P.profile.salaryAccountId)?.bank ?? 'your bank',
  stocks: P.stocks,
  esop: { ...P.esop, ...selectEsop() },
  fundName: (id: string) => P.funds.find((f) => f.id === id)?.name ?? id,
}

export type Facts = typeof facts
