/*
  Free-typing intent matcher (SPEC 9.4). Keywords route a message to a scripted answer of
  2 to 4 lines built from the persona's computed numbers (facts.ts), plus an existing card
  where one still needs the person, plus quick-reply chips where useful. Unknown input gets
  the fallback with chips. First match wins, so specific intents sit above general ones.

  Answers read the live store for a few facts that change as cards complete (switch done,
  harvest done, loan prepaid, Dad consented), so a question asked later gets a true answer.
*/
import { useMunim } from '../store'
import { answers, chips as chipSets } from '../copy/chat'
import { istParts } from '../lib/format'
import { assumptions as A, emi, facts as F, floorTo, futureValue, loanForEmi, roundTo } from './facts'
import { storyNow } from './chatStore'
import type { ActionCard } from '../types'

export type IntentId =
  | 'do-nothing'
  | 'fees'
  | 'what-if-job'
  | 'what-if-market'
  | 'what-if-rates'
  | 'market'
  | 'car'
  | 'house'
  | 'retire'
  | 'tax'
  | 'fd'
  | 'insurance'
  | 'emergency'
  | 'sip'
  | 'loan'
  | 'salary'
  | 'invest'
  | 'gold-crypto'
  | 'stocks'
  | 'esop'
  | 'family'
  | 'net-worth'
  | 'spending'
  | 'safety'
  | 'regulated'
  | 'goal'
  | 'what-if'
  | 'greeting'
  | 'help'
  | 'thanks'
  | 'yes'
  | 'no'
  | 'fallback'

export interface IntentAnswer {
  id: IntentId
  /** Munim's bubbles, in order */
  lines: string[]
  /** An existing card to show after the text (only one that still needs the person) */
  actionId?: string
  /** Quick replies offered after the answer */
  chips?: string[]
}

/* ---------- Text helpers ---------- */

/** Lower case, plain spaces and apostrophes, single spaces */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ /g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** "₹14 L", "14 lakh", "1.5 cr", "₹14,00,000", "1400000", "20k" -> rupees */
export function parseRupees(t: string): number | undefined {
  const unit = t.match(/(\d+(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|lac|l|k)\b/)
  if (unit) {
    const n = parseFloat(unit[1])
    const u = unit[2]
    if (u.startsWith('c')) return n * 1e7
    if (u.startsWith('l')) return n * 1e5
    return n * 1e3
  }
  const plain = t.match(/(?:₹|rs\.?|inr)\s*([\d,]+)/) ?? t.match(/\b(\d{1,3}(?:,\d{2})*,\d{3}|\d{5,})\b/)
  return plain ? parseFloat(plain[1].replace(/,/g, '')) : undefined
}

const words = (t: string) => t.split(' ').filter(Boolean).length
const HYPOTHETICAL = /\bwhat if\b|\bwhat happens if\b|\bwhat would happen\b|\bsuppose\b|\bscenario\b|\bif i\b|\bif we\b|\bif the\b|\bif markets?\b|\bif rates?\b/

/* ---------- Store helpers ---------- */

const actions = (): ActionCard[] => useMunim.getState().actions
const acted = (a: ActionCard) => !['proposed', 'cancelled', 'failed'].includes(a.status)
const anyDone = (pred: (a: ActionCard) => boolean) => actions().some((a) => pred(a) && a.status === 'done')
const anyActed = (pred: (a: ActionCard) => boolean) => actions().some((a) => pred(a) && acted(a))
/** A card that still needs the person, to show with the answer */
const pending = (pred: (a: ActionCard) => boolean) => actions().find((a) => pred(a) && a.status === 'proposed')?.id
const dadConsented = () => useMunim.getState().members.some((m) => m.id === F.sureshId && m.consent === 'consented')

/* ---------- Answers ---------- */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function car(t: string): IntentAnswer {
  const a = A.car
  const parsed = parseRupees(t)
  const price = parsed && parsed >= 100_000 && parsed <= 50_000_000 ? roundTo(parsed, 10_000) : a.defaultPrice
  const actionId = pending((c) => c.type === 'plan' && /\bcar\b/i.test(c.title))
  if (price <= a.downLater) {
    const months = Math.ceil(price / a.setAside)
    return {
      id: 'car',
      lines: answers.carCash({ price, setAside: a.setAside, from: MONTHS[a.setAsideFromMonth], readyBy: MONTHS[(a.setAsideFromMonth + months - 1) % 12] }),
      actionId,
    }
  }
  const loanNow = price - a.downNow
  const emiNow = roundTo(emi(loanNow, a.rate, a.years), 100)
  const emiLater = roundTo(emi(price - a.downLater, a.rate, a.years), 100)
  // Anchored to the spec's default (₹11 L borrowed moves the 2029 goal 4 months), scaled by what is borrowed
  const goalDelayMonths = Math.max(1, Math.round((a.goalDelayMonthsAtDefault * loanNow) / (a.defaultPrice - a.downNow)))
  const share = emiNow / F.takeHome
  if (share > a.emiShareCap) {
    const maxPrice = floorTo(loanForEmi(F.takeHome * a.emiShareCap, a.rate, a.years) + a.downLater, 100_000)
    return {
      id: 'car',
      lines: answers.carStretch({
        price,
        downNow: a.downNow,
        loanNow,
        rate: a.rate,
        years: a.years,
        emiNow,
        share,
        waitUntil: a.waitUntil,
        downLater: a.downLater,
        emiLater,
        goalYear: a.goalYear,
        goalDelayMonths,
        emiShareCap: a.emiShareCap,
        maxPrice,
      }),
      actionId,
    }
  }
  return {
    id: 'car',
    lines: answers.car({
      downNow: a.downNow,
      loanNow,
      rate: a.rate,
      years: a.years,
      emiNow,
      goalYear: a.goalYear,
      goalDelayMonths,
      waitUntil: a.waitUntil,
      downLater: a.downLater,
      emiLater,
    }),
    actionId,
  }
}

function house(t: string): IntentAnswer {
  const h = A.house
  const emiCap = roundTo(F.takeHome * h.emiShare, 100)
  const loanCap = roundTo(loanForEmi(emiCap, h.rate, h.years), 100_000)
  const affordable = roundTo(loanCap / (1 - h.downShare), 100_000)
  const parsed = parseRupees(t)
  if (parsed && parsed >= 2_000_000 && parsed <= 200_000_000) {
    const price = roundTo(parsed, 100_000)
    const down = roundTo(price * h.downShare, 10_000)
    const loan = price - down
    const monthly = roundTo(emi(loan, h.rate, h.years), 100)
    return {
      id: 'house',
      lines: answers.housePriced({
        price,
        down,
        stamp: roundTo(price * h.stampShare, 10_000),
        loan,
        rate: h.rate,
        years: h.years,
        emi: monthly,
        share: monthly / F.takeHome,
        emiShare: h.emiShare,
        emiCap,
        affordable,
        goalYear: h.goalYear,
      }),
    }
  }
  return {
    id: 'house',
    lines: answers.houseAfford({
      emiShare: h.emiShare,
      emiCap,
      loan: loanCap,
      rate: h.rate,
      years: h.years,
      price: affordable,
      down: roundTo(affordable * h.downShare, 10_000),
      stamp: roundTo(affordable * h.stampShare, 10_000),
      goalYear: h.goalYear,
    }),
  }
}

function retire(): IntentAnswer {
  const r = A.retire
  const years = r.atAge - F.age
  const nominal = futureValue(F.investments.total, F.sipsMonthly, r.returnRate, years)
  const real = nominal / (1 + r.inflation) ** years
  return {
    id: 'retire',
    lines: answers.retire({
      invested: F.investments.total,
      pots: F.retirementPots,
      sips: F.sipsMonthly,
      rate: r.returnRate,
      atAge: r.atAge,
      nominal: roundTo(nominal, 1_000_000),
      real: roundTo(real, 1_000_000),
      yearsOfSpend: Math.floor(real / (F.spend * 12)),
      spend: F.spend,
      stepUp: r.stepUp,
      nominalStepUp: roundTo(futureValue(F.investments.total, F.sipsMonthly, r.returnRate, years, r.stepUp), 1_000_000),
    }),
  }
}

function tax(): IntentAnswer {
  const loss = F.mirae.loss
  return {
    id: 'tax',
    lines: answers.tax({
      interest: F.loan.interestThisYear,
      gains: F.regular.olderThanYear.gain,
      exemption: A.tax.ltcgExemption,
      switchDone: anyDone((a) => a.type === 'switch'),
      loss,
      saving: Math.round(loss * A.tax.stcgRate),
      harvestDone: anyDone((a) => a.type === 'harvest'),
    }),
    actionId: pending((a) => a.type === 'harvest') ?? pending((a) => a.type === 'switch'),
  }
}

function fd(): IntentAnswer {
  const s = F.suresh
  if (dadConsented()) {
    return {
      id: 'fd',
      lines: answers.fdDad({
        principal: s.fd.principal,
        maturesOn: s.fd.maturesOn,
        rate: s.fd.rate,
        senior: s.seniorFdRate,
        extra: Math.round(s.fd.principal * (s.seniorFdRate - s.fd.rate)),
      }),
      actionId: pending((a) => a.approval === 'member-consent' || /\bFD\b/.test(a.title)),
    }
  }
  return {
    id: 'fd',
    lines: answers.fdSelf({
      liquidName: F.liquid.name,
      liquidYield: F.liquid.yield,
      savingsRate: F.savingsRate,
      instant: A.liquidInstantPerDay,
      senior: s.seniorFdRate,
    }),
  }
}

function insurance(): IntentAnswer {
  const shouldBe = roundTo(F.ctc * A.term.incomeMultiple, 10_000_000)
  return {
    id: 'insurance',
    lines: answers.insurance({
      corp: F.corpHealth.cover,
      employer: F.corpHealth.provider,
      floater: F.floater.cover,
      premium: F.floater.premium,
      due: F.floater.due,
      term: F.term.cover,
      sizedAt: F.term.sizedAt,
      ctc: F.ctc,
      shouldBe,
      topUp: Math.max(0, shouldBe - F.term.cover),
      quote: A.term.topUpMonthlyQuote,
    }),
    actionId: pending((a) => a.type === 'insure'),
  }
}

/** Next SIP date on or after the story clock */
function nextSipDate(day: number): string {
  const p = istParts(storyNow())
  const monthIndex = p.day <= day ? p.month : p.month + 1
  const y = p.year + Math.floor(monthIndex / 12)
  const m = (monthIndex % 12) + 1
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function sip(): IntentAnswer {
  const day = F.sips[0]?.dayOfMonth ?? 5
  return {
    id: 'sip',
    lines: answers.sip({
      total: F.sipsMonthly,
      day,
      list: F.sips.map((s) => ({ name: s.name, amount: s.amount })),
      next: nextSipDate(day),
      stepUp: A.retire.stepUp,
      stepUpAmount: Math.round(F.sipsMonthly * A.retire.stepUp),
    }),
  }
}

function loan(): IntentAnswer {
  const l = F.loan
  // Prepaid so far: receipts of done prepay cards (or impact / rate when a receipt has no amount)
  const prepaid = actions()
    .filter((a) => a.type === 'prepay' && a.status === 'done')
    .reduce((sum, a) => sum + (a.receipts.find((r) => r.amount)?.amount ?? Math.round(a.impact.amount / l.rate)), 0)
  const outstanding = Math.max(0, l.outstanding - prepaid)
  const r = l.rate / 12
  // Months left with the same EMI after a prepayment
  const months = prepaid > 0 ? Math.ceil(-Math.log(1 - (r * outstanding) / l.emi) / Math.log(1 + r)) : l.monthsLeft
  return {
    id: 'loan',
    lines: answers.loan({
      lender: l.lender,
      outstanding,
      prepaid,
      rate: l.rate,
      emi: l.emi,
      months,
      interest: l.interestThisYear,
      section: l.taxSection,
      perLakh: Math.round(100_000 * l.rate),
    }),
    actionId: pending((a) => a.type === 'prepay'),
  }
}

function doNothing(): IntentAnswer {
  const costs: { text: string; amount: number }[] = []
  if (!anyActed((a) => a.type === 'sweep')) costs.push({ text: answers.costIdle(F.sweepA, F.sweepAGain), amount: F.sweepAGain })
  if (!anyActed((a) => a.type === 'switch')) costs.push({ text: answers.costRegular(F.regular.dragPerYear), amount: F.regular.dragPerYear })
  return {
    id: 'do-nothing',
    lines: answers.doNothing({ costs, total: costs.reduce((s, c) => s + c.amount, 0), sips: F.sipsMonthly }),
  }
}

function whatIfJob(): IntentAnswer {
  const need = F.spend + F.loan.emi
  const runwayCash = F.cash - F.cardDues
  return {
    id: 'what-if-job',
    lines: answers.whatIfJob({
      need,
      spend: F.spend,
      emi: F.loan.emi,
      sips: F.sipsMonthly,
      runwayCash,
      months: (Math.floor((runwayCash / need) * 10) / 10).toFixed(1),
      corp: F.corpHealth.cover,
      employer: F.corpHealth.provider,
      floater: F.floater.cover,
    }),
  }
}

function spending(): IntentAnswer {
  const unused = F.subscriptionsUnused
  return {
    id: 'spending',
    lines: answers.spending({
      total: F.spend,
      categories: F.categories,
      unused,
      unusedMonthly: unused.reduce((s, x) => s + x.monthly, 0),
    }),
    actionId: pending((a) => /subscri|cult|notion/i.test(a.title)),
  }
}

/* ---------- Routing table (first match wins) ---------- */

interface Route {
  id: IntentId
  test: (t: string) => boolean
  answer: (t: string) => IntentAnswer
}

const re = (r: RegExp) => (t: string) => r.test(t)

const JOB = /\bjobs?\b|laid off|\blayoffs?\b|\bfired\b|\bquit\b|unemploy|sabbatical|salary (stops|stopped|doesn'?t come)|lose (my )?(salary|income)|no (salary|income)/
const MARKET = /\bmarkets?\b|\bcrash|\bsensex\b|\bnifty\b|\bcorrection\b|\brecession\b|\bbear\b/
const MARKET_UP = /\b(up|rise|rises|rose|rally|rallies|boom|booms|high|highs|double|doubles)\b/
const MARKET_DOWN = /\b(down|fall|falls|fell|drop|drops|crash|crashes|tank|tanks|correction|bear)\b/
const RATES = /\brates?\b|\binterest\b|\brepo\b|\brbi\b/
const RATE_MOVE = /\b(go|goes|going|went|rise|rises|rising|rose|up|hike|hikes|hiked|increase|increases|jump|jumps)\b/

const ROUTES: Route[] = [
  {
    id: 'do-nothing',
    test: re(/\bdo nothing\b|\bdoing nothing\b|\bnot do anything\b|\bdon'?t do anything\b|\bignore (it|this|them|everything)\b/),
    answer: doNothing,
  },
  {
    id: 'fees',
    test: re(
      /\bfees?\b|how (do|does|will|would) (you|munim|this|it|u) (earn|make money|make any money|get paid|charge)|\bcommissions?\b|\bpricing\b|how much (do you|does munim|does this|does it|is munim|is it) (cost|charge)|what do (you|u) (earn|charge)|what'?s in it for (you|munim)|\bbusiness model\b|\b(plus|family|managed|free) plan\b|\bplans?\b.*\b(cost|price)\b/,
    ),
    answer: () => {
      const p = A.plans
      return { id: 'fees', lines: answers.fees({ plus: p.plus, family: p.family, members: p.familyMembers, managedFrom: p.managedFrom, managedFee: p.managedFee }) }
    },
  },
  {
    id: 'what-if-job',
    test: (t) => (HYPOTHETICAL.test(t) && JOB.test(t)) || /lose my job|lost my job|laid off|\blayoff|get fired|quit my job|between jobs/.test(t),
    answer: whatIfJob,
  },
  {
    id: 'what-if-market',
    test: (t) => HYPOTHETICAL.test(t) && MARKET.test(t),
    answer: (t) => {
      if (MARKET_UP.test(t) && !MARKET_DOWN.test(t)) {
        const gain = Math.round(F.marketLinked * A.whatIf.marketFall)
        return { id: 'what-if-market', lines: answers.whatIfMarketUp({ rise: A.whatIf.marketFall, exposed: F.marketLinked, gain }) }
      }
      const loss = Math.round(F.marketLinked * A.whatIf.marketFall)
      return { id: 'what-if-market', lines: answers.whatIfMarket({ fall: A.whatIf.marketFall, exposed: F.marketLinked, loss }) }
    },
  },
  {
    id: 'market',
    test: re(/markets? (crash|crashed|fall|fell|drop|dropped|tank|tanked|are down|is down)|\bcrash\b|\bbear market\b|\brecession\b|\bsell (my )?(funds|stocks|shares|mutual funds|investments|everything)\b/),
    answer: () => ({ id: 'market', lines: answers.marketSteady, chips: chipSets.marketFall }),
  },
  {
    id: 'what-if-rates',
    test: (t) => HYPOTHETICAL.test(t) && RATES.test(t) && RATE_MOVE.test(t) && !/\bcar\b|\bhouse\b|\bhome\b/.test(t),
    answer: () => ({
      id: 'what-if-rates',
      lines: answers.whatIfRates({ rise: A.whatIf.rateRise, lender: F.loan.lender, extra: Math.round(F.loan.outstanding * A.whatIf.rateRise), emi: F.loan.emi }),
    }),
  },
  { id: 'car', test: re(/\bcars?\b|\bvehicle\b|\bsuv\b|\bsedan\b|\bhatchback\b|\btesla\b|\bev\b/), answer: car },
  {
    id: 'house',
    test: re(/\bhouse\b|\bhome\b|\bflat\b|\bapartment\b|\bproperty\b|real estate|down ?payment|\bmortgage\b|\b(2|3|4) ?bhk\b/),
    answer: house,
  },
  { id: 'retire', test: re(/retir|\bpension\b|\bfire\b|financial(ly)? (independen|free)|stop working|\bcorpus\b|old age/), answer: retire },
  {
    id: 'tax',
    test: re(/\btax(es|ed|ing)?\b|\b80c\b|\b80d\b|\b80e\b|\bitr\b|\btds\b|\bharvest|capital gains?|\bltcg\b|\bstcg\b|\bform 16\b|\b15h\b/),
    answer: tax,
  },
  { id: 'fd', test: re(/\bf\.?d\.?s?\b|fixed deposits?|\bdeposits?\b|\brecurring deposit\b/), answer: fd },
  {
    id: 'insurance',
    test: re(/insur|\bterm (plan|cover|policy|life)\b|\bhealth cover\b|\blife cover\b|\bmediclaim\b|\bpolic(y|ies)\b|\bpremiums?\b|\bcovered\b|\bcover\b/),
    answer: insurance,
  },
  {
    id: 'emergency',
    test: re(/emergency|rainy day|\bliquid fund\b|\bsafety net\b/),
    answer: () => ({ id: 'emergency', lines: answers.emergency({ target: F.emergencyTarget, spend: F.spend, instant: A.liquidInstantPerDay }) }),
  },
  { id: 'sip', test: re(/\bsips?\b|systematic|step.?up|\bmutual funds?\b|\bmfs?\b/), answer: sip },
  { id: 'loan', test: re(/\bloans?\b|\bemis?\b|\bprepay|\bdebt\b|\bborrow|\bsbi\b/), answer: loan },
  {
    id: 'salary',
    test: re(/\bsalary\b|\bpay ?day\b|\bpaycheck\b|\bpay cheque\b/),
    answer: () => ({ id: 'salary', lines: answers.salary({ amount: F.takeHome, bank: F.salaryBank }) }),
  },
  {
    id: 'esop',
    test: re(/\besops?\b|\bbuy ?back\b|\bvested\b|\bstock options\b|\borbit labs\b/),
    answer: () => {
      const e = F.esop
      return {
        id: 'esop',
        lines: answers.esop({
          company: e.company,
          units: e.buybackUnits,
          vested: e.vested,
          price: e.buybackPrice,
          taxRate: e.perquisiteTaxRate,
          net: e.net,
          landsOn: e.landsOn,
          remainingUnits: e.remainingUnits,
          remainingValue: e.remainingValue,
        }),
      }
    },
  },
  {
    id: 'gold-crypto',
    test: re(/\bgold\b|\bsilver\b|\bcrypto|\bbitcoin\b|\bbtc\b|\bethereum\b|\bdoge/),
    answer: (t) => {
      const gold = /\bgold\b|\bsilver\b/.test(t)
      const crypto = /\bcrypto|\bbitcoin\b|\bbtc\b|\bethereum\b|\bdoge/.test(t)
      return { id: 'gold-crypto', lines: [...(gold ? [answers.gold] : []), ...(crypto || !gold ? [answers.crypto] : [])] }
    },
  },
  {
    id: 'invest',
    test: re(/\binvest|\bbonus\b|\bwindfall\b|lump ?sum|extra (money|cash)|spare (money|cash)|where should i put|what should i do with/),
    answer: (t) => {
      const amount = parseRupees(t)
      return {
        id: 'invest',
        lines: answers.invest({
          amount: amount && amount >= 10_000 ? roundTo(amount, 1_000) : undefined,
          target: F.emergencyTarget,
          loanRate: F.loan.rate,
          tranches: A.invest.tranches,
          weeks: A.invest.weeks,
          split: A.invest.split.map((x) => ({ name: F.fundName(x.fundId), share: x.share })),
        }),
      }
    },
  },
  {
    id: 'stocks',
    test: re(/\bstocks?\b|\bshares\b|\bzerodha\b|\breliance\b|\btata elxsi\b|\bdixon\b/),
    answer: () => {
      const list = F.stocks.holdings.map((h) => ({ name: h.name, value: h.value }))
      return {
        id: 'stocks',
        lines: answers.stocks({ broker: F.stocks.broker, list, total: F.investments.stocks, share: F.investments.stocks / F.investments.total }),
      }
    },
  },
  {
    id: 'family',
    test: re(/\bdad\b|\bfather\b|\bpapa\b|\bparents?\b|\bmom\b|\bmother\b|\bmum\b|\bsuresh\b|\bfamily\b|\bhousehold\b/),
    answer: () => (dadConsented() ? { ...fd(), id: 'family' } : { id: 'family', lines: [answers.family], chips: chipSets.family }),
  },
  {
    id: 'net-worth',
    test: re(/net ?worth|how much (money )?(do i have|am i worth|have i got)|\bmy money\b|\bportfolio\b|where is my money|\bbalances?\b|\bwealth\b/),
    answer: () => ({
      id: 'net-worth',
      lines: answers.netWorth({
        total: F.netWorth.total,
        cash: F.netWorth.cash,
        invested: F.netWorth.investments,
        loans: F.netWorth.loans,
        cardDues: F.netWorth.cardDues,
        asOf: F.asOf,
      }),
    }),
  },
  {
    id: 'spending',
    test: re(/\bspend|\bspent\b|\bexpens|\bbudget|\bsubscriptions?\b|\bnetflix\b|\bspotify\b|\bcult\b|\bnotion\b|\bswiggy\b|\bzomato\b|\bblinkit\b|credit cards?|card bills?/),
    answer: spending,
  },
  {
    id: 'goal',
    test: re(/\beducation\b|\bwedding\b|\bmarriage\b|\bchild(ren)?\b|\bkids?\b|\bdaughter\b|\bson\b|\btravel\b|\bvacation\b|\bholiday\b|\bgoals?\b|\bplan for\b|\bsave for\b/),
    answer: () => ({ id: 'goal', lines: answers.goal({ goalYear: A.house.goalYear }) }),
  },
  {
    id: 'regulated',
    test: re(/\bregulat|\bsebi\b|\bria\b|\blicen[cs]ed?\b|\bregistered\b|\blegit\b/),
    answer: () => ({ id: 'regulated', lines: [answers.regulated] }),
  },
  {
    id: 'safety',
    test: re(/\bsafe\b|\bsafety\b|\bsecur|\bpin\b|\botp\b|\bprivacy\b|\bprivate\b|\bmy data\b|\bhack|\bfraud|\bscam|\btrust\b|\bconsent\b|\brevoke\b/),
    answer: () => ({ id: 'safety', lines: answers.safety }),
  },
  {
    id: 'market',
    test: re(/\bmarkets?\b|\bsensex\b|\bnifty\b/),
    answer: () => ({ id: 'market', lines: answers.marketSteady, chips: chipSets.marketFall }),
  },
  {
    id: 'what-if',
    test: re(/\bwhat if\b|\bwhat happens if\b|\bscenario\b|\bsuppose\b/),
    answer: () => ({ id: 'what-if', lines: [answers.whatIf], chips: chipSets.whatIf }),
  },
  {
    id: 'greeting',
    test: (t) => /^(hi+|hello|hey|hola|namaste|namaskar|good (morning|afternoon|evening)|yo)\b/.test(t) && words(t) <= 5,
    answer: () => ({ id: 'greeting', lines: [answers.greeting(F.firstName)], chips: chipSets.starter }),
  },
  {
    id: 'help',
    test: (t) => (/^help\b/.test(t) && words(t) <= 3) || /what can you do|who are you|what are you|what is munim|what do you do|how does (this|it|munim) work|\bfeatures?\b/.test(t),
    answer: () => ({ id: 'help', lines: [answers.help], chips: chipSets.starter }),
  },
  {
    id: 'thanks',
    test: (t) => /\b(thanks|thank you|thx|ty|great|awesome|cool|nice|perfect|got it|shukriya|dhanyavad)\b/.test(t) && words(t) <= 5,
    answer: () => ({ id: 'thanks', lines: [answers.thanks] }),
  },
  {
    id: 'yes',
    test: (t) => /^(yes|yeah|yep|yup|sure|ok|okay|k|go ahead|do it|approve|approved|confirm|haan|ha)\b/.test(t) && words(t) <= 5,
    answer: () => ({ id: 'yes', lines: [answers.yes] }),
  },
  {
    id: 'no',
    test: (t) => /^(no|nope|nah|not now|later|skip|cancel|stop|pause)\b/.test(t) && words(t) <= 5,
    answer: () => ({ id: 'no', lines: [answers.no] }),
  },
]

/** Route a message to its answer. Never throws; unknown input gets the fallback. */
export function matchIntent(text: string): IntentAnswer {
  const t = normalize(text)
  if (t) {
    for (const r of ROUTES) {
      try {
        if (r.test(t)) return r.answer(t)
      } catch {
        // A broken answer must never break the chat; fall through to the fallback.
        break
      }
    }
  }
  return { id: 'fallback', lines: [answers.fallback], chips: chipSets.starter }
}

/** Ids in routing order, for QA */
export const intentIds: IntentId[] = [...ROUTES.map((r) => r.id), 'fallback']
