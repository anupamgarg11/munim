/*
  Copy for moments 5 to 8 (SPEC 5.5 to 5.8, and the commentary in SPEC 7).
  Every number arrives as an argument computed in src/demo/moments5to8.ts from the live
  persona or the store; none is typed here.
  Rules: plain words, no em or en dashes, no emoji. Amounts through fmtINR or fmtLakh.
*/
import { fmtDate, fmtINR, fmtLakh, fmtPct } from '../lib/format'
import { fmtDateHi, fmtLakhHi } from './chat'

/* ---------- Commentary (SPEC 7, three lines per moment) ---------- */

export const commentary5to8 = {
  5: {
    principle: 'Doing nothing is advice.',
    edge: 'The harvest maths includes the exit load, and the loss carries forward if it is not used this year.',
    metric: 'Users who stayed invested through the drawdown; renewals after a bad quarter.',
  },
  6: {
    principle: 'Answers against your goals, then one tap.',
    edge: 'It recommends waiting.',
    metric: 'Questions per user per month.',
  },
  7: {
    principle: 'The household is the unit; consent per member, in their language.',
    edge: "Dad's money stays in Dad's name; Form 15H; UPI Circle caps.",
    metric: 'Second member added within 60 days.',
  },
  8: {
    principle: 'Fee-only, logged, capped, deletable.',
    edge: 'No OTP in chat; new payees wait out a cooling period.',
    metric: 'Plus conversion; churn.',
  },
} as const

/* ---------- Moment 5: Market fall (SPEC 5.5) ---------- */

export const marketFall = {
  /** Note passed with the market move's effects */
  note: (fall: number) => `Markets fell ${fmtPct(fall, 0)} this week`,
  fundLabel: (name: string, fall: number) => `${name} down ${fmtPct(fall, 0)} with the market`,
  stocksLabel: (fall: number) => `Stocks down ${fmtPct(fall, 0)} with the market`,
  message: (v: { fall: number; down: number }) =>
    `Markets fell ${fmtPct(v.fall, 0)} this week. Your investments are down ${fmtINR(v.down)}. Your plan doesn't change, and here's why: your SIPs buy more units at these prices, your emergency fund isn't in the market, and your goals are 5 to 15 years out. I'm not moving anything.`,
  harvestLead: 'One optional thing the fall makes worth doing:',
}

export const harvest = {
  title: 'Book the Mirae Midcap loss',
  why: (loss: number) =>
    `Mirae Midcap is ${fmtINR(loss)} below cost. Sell, book the loss, and buy a similar midcap fund the same day.`,
  sellLine: (name: string) => `Sell ${name}`,
  sellNote: (v: { loss: number; saving: number; rate: number }) =>
    `Books the ${fmtINR(v.loss)} loss. It offsets gains and saves about ${fmtINR(v.saving)} of tax (${fmtPct(v.rate, 0)} short-term rate).`,
  buyLine: (name: string) => `Buy ${name}, same day`,
  buyNote: 'A similar midcap fund, so you stay invested through the fall.',
  impact: (saving: number) => `About ${fmtINR(saving)} less tax`,
  when: "Today, before the 3 pm cut-off, so both legs get today's price",
  alsoConsidered: (exitLoad: number) =>
    `Exit load on the newer units is about ${fmtINR(exitLoad)}, so it's still worth it. The loss carries forward 8 years if you don't use it this year.`,
  receiptWhat: (from: string, to: string) => `Tax harvest: ${from} to ${to}`,
  timelineSold: (name: string, value: number, loss: number) => `Sold ${name} · ${fmtINR(value)} · ${fmtINR(loss)} loss booked`,
  timelineBought: (name: string, value: number) => `Bought ${name} · ${fmtINR(value)}, same day`,
  effectSell: (name: string) => `Sold ${name} to book the loss`,
  effectBuy: (name: string) => `Bought ${name}, same day`,
}

/* ---------- Moment 6: Ask anything (SPEC 5.6) ---------- */

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const askAnything = {
  question: (price: number) => `Can we buy a ${fmtLakh(price, 0)} car in March?`,
  setUpChip: 'Set up a Car fund',
}

export const carFund = {
  title: 'Set up a Car fund',
  why: (v: { setAside: number; fromMonth: number }) =>
    `${fmtINR(v.setAside)} a month from ${MONTH_LONG[v.fromMonth]} into a direct fund for the car, so the down payment never comes out of your emergency fund.`,
  impact: 'Your other goals stay on track',
  railDetail: 'HDFC e-mandate → MF Central',
  when: (fromMonth: number) => `Every month from ${MONTH_LONG[fromMonth]}, after salary lands`,
  /** Option A's down payment against the live liquid fund (the emergency fund lives there) */
  alsoConsidered: (v: { loan: boolean; downNow: number; liquid: number; target: number }) =>
    !v.loan
      ? 'No loan at this price, so the liquid fund and your emergency fund stay untouched.'
      : v.liquid - v.downNow >= v.target
        ? `Buying in March puts ${fmtLakh(v.downNow)} down from the liquid fund. It holds ${fmtLakh(v.liquid)}, so your ${fmtLakh(v.target)} emergency fund stays whole either way.`
        : v.liquid > 0
          ? `Buying in March puts ${fmtLakh(v.downNow)} down from the liquid fund, which holds ${fmtLakh(v.liquid)} and is your emergency fund. Waiting keeps it untouched.`
          : `Buying in March needs ${fmtLakh(v.downNow)} down, and there is no liquid fund yet to hold your emergency fund. Waiting keeps your savings untouched.`,
  timeline: (setAside: number, fromMonth: number) => `${fmtINR(setAside)} a month set aside from ${MONTH_SHORT[fromMonth]}`,
  receiptWhat: (setAside: number, fromMonth: number) => `Car fund: ${fmtINR(setAside)} a month from ${MONTH_SHORT[fromMonth]}`,
  done: (setAside: number, fromMonth: number) =>
    `Done. ${fmtINR(setAside)} a month goes into the Car fund from ${MONTH_LONG[fromMonth]}, and your other goals stay as they are.`,
}

/* ---------- Weekly brief, Sunday 6 pm (SPEC 1.7), sent before moment 6 ---------- */

export const brief = {
  title: (at: string) => `Your week to ${fmtDate(at)}`,
  netWorth: (total: number, at: string) => `Net worth ${fmtLakh(total)}, as of ${fmtDate(at)}.`,
  market: (down: number) => `Markets fell this week and your investments are down ${fmtINR(down)}. Your plan doesn't change.`,
  done: (n: number) => `${n} ${n === 1 ? 'action' : 'actions'} ran this week, each logged in Trust.`,
  found: (amount: number) => `Found this year: ${fmtINR(amount)}.`,
  coming: (items: { name: string; amount: number; due: string }[], autopilot: boolean) =>
    `Coming up: ${items.map((i) => `${i.name} ${fmtINR(i.amount)} on ${fmtDate(i.due)}`).join(', ')}.${autopilot ? ' Autopilot pays card bills in full on the day.' : ''}`,
  nothing: 'Nothing needs you this week. Happy Diwali.',
  /** "family floater premium": a policy's name mid-sentence */
  premium: (name: string) => `${name.charAt(0).toLowerCase()}${name.slice(1)} premium`,
}

/* ---------- Moment 7: The household (SPEC 5.7) ---------- */

export const household = {
  invite:
    "You mentioned you look after your parents' money. Want me to? I'd only see what Dad approves, and he'd approve anything that moves his money.",
  dadsIn: "Dad's in. One thing right away:",
}

export const dadFd = {
  title: "Move Dad's FD to a senior-citizen FD",
  why: (v: { principal: number; maturesOn: string; rate: number; senior: number; extra: number }) =>
    `Dad's ${fmtLakh(v.principal)} FD matures ${fmtDate(v.maturesOn)} and is set to auto-renew at ${fmtPct(v.rate)}. A senior-citizen FD at ${fmtPct(v.senior)} pays ${fmtINR(v.extra)} more a year.`,
  alsoConsidered: (medical: number) =>
    `Keep it in Dad's name (no clubbing, and it's his money); file Form 15H so no TDS is cut; keep ${fmtLakh(medical)} liquid for medical.`,
  railDetail: (bank: string) => `${bank} e-mandate, on maturity`,
  approvalDetail: "Dad's OTP, on his phone",
  when: (maturesOn: string) => `Booked now; the new FD starts ${fmtDate(maturesOn)}`,
  receiptWhat: (bank: string, senior: number) => `Dad's ${bank} FD moved to a senior-citizen FD at ${fmtPct(senior)}`,
  timeline: (v: { rate: number; senior: number; maturesOn: string; medical: number; bank: string }) => [
    `Auto-renew at ${fmtPct(v.rate)} turned off`,
    `Senior-citizen FD at ${fmtPct(v.senior)} booked from ${fmtDate(v.maturesOn)}, in Dad's name`,
    `Form 15H filed with ${v.bank}: no TDS`,
    `${fmtLakh(v.medical)} stays in Dad's savings for medical needs`,
  ],
  effectClose: (rate: number) => `FD at ${fmtPct(rate)} closes on maturity`,
  effectOpen: (senior: number) => `Senior-citizen FD at ${fmtPct(senior)}, same amount`,
  /** Dad's confirmation, in his own chat (Hindi) */
  doneHi: (v: { principal: number; maturesOn: string; senior: number }) =>
    `हो गया, सुरेश जी। आपकी ${fmtLakhHi(v.principal)} की FD ${fmtDateHi(v.maturesOn)} से ${fmtPct(v.senior)} पर सीनियर सिटीज़न FD में जाएगी, आपके ही नाम पर। Form 15H जमा हो गया है, TDS नहीं कटेगा।`,
}

/* ---------- Moment 8: Trust centre and plans (SPEC 5.8) ---------- */

export const trustMoment = {
  summary: (v: { found: number; family: number; done: number }) =>
    [
      `Two weeks in. Found this year: ${fmtINR(v.found)}${v.family > 0 ? `, plus ${fmtINR(v.family)} a year for Dad` : ''}.`,
      `${v.done} ${v.done === 1 ? 'action' : 'actions'} done, each in your ledger with who approved it and the rail. We earned ₹0 on all of it.`,
    ].join('\n'),
  plan: (price: number) => `You pay us ${fmtINR(price)} a year on Plus, for the whole household. That's all we earn.`,
  chip: 'Open Trust centre',
}
