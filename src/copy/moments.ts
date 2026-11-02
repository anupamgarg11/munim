/*
  Copy for the demo moments 1 to 4 (SPEC 5.1 to 5.4), the onboarding flow, the commentary
  (SPEC 7) and the Autopilot rules. Rules: plain words, no em or en dashes, no emoji.
  Every number arrives as an argument computed by the caller from the live persona, and is
  formatted here with fmtINR, fmtLakh, fmtPct or fmtDate. None is typed.
*/
import { fmtDate, fmtINR, fmtLakh, fmtPct, fmtTime, type DateInput } from '../lib/format'

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
/** 6 -> "six" (up to twelve), else the digits */
export const inWords = (n: number) => WORDS[n] ?? String(n)

const and = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

/* ---------- Funds the effects create ---------- */

export const fundNotes = {
  liquid: (yieldPct: string) => `${yieldPct} recent yield`,
  via: 'MF Central',
}

/** Short names for the direct funds in the buyback split (SPEC 5.4) */
export const fundShort: Record<string, string> = {
  ppfas: 'PPFAS',
  'uti-nifty': 'UTI Nifty',
  'mirae-midcap': 'Mirae Midcap',
}

/* ---------- Commentary panel (SPEC 7) ---------- */

export const commentaryLabels = {
  principle: 'Principle',
  edge: 'Edge case handled',
  metric: 'Metric we watch',
  empty: 'This moment has no commentary yet.',
}

export const commentary = {
  1: {
    principle: 'One consent, then it comes to you.',
    edge: "Account Aggregator doesn't cover cards and policies, so Gmail fills the gap. Every number shows its source and how fresh it is.",
    metric: 'Share of net worth linked in the first session.',
  },
  2: {
    principle: 'Every insight arrives ready to sign, with the number.',
    edge: (limit: number) => `Switching regular to direct is a sale, so it is sequenced to stay under the ${fmtLakh(limit)} tax-free limit.`,
    metric: 'Cards acted on in week 1.',
  },
  3: {
    principle: (minutes: number) => `Autopilot within caps, with a ${minutes} minute hold.`,
    edge: 'Rules trigger on the salary credit, not a date, so a late salary never bounces a bill. If the buffer would be breached, the sweep skips and says so.',
    metric: 'Rules enabled per user; cancel rate.',
  },
  4: {
    principle: 'Big money gets a plan, not a product.',
    edge: (upiLimit: number) => `Above the ${fmtLakh(upiLimit)} UPI limit, so it runs on the bank mandate. The 80E trade-off is stated, not hidden.`,
    metric: 'Share of windfalls planned through Munim.',
  },
}

/* ---------- Onboarding (SPEC 5.1) ---------- */

export const onboarding = {
  brand: 'Munim',
  tagline: 'All your money, one picture, one chat.',
  stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
  back: 'Back',
  phone: {
    title: 'Your mobile number',
    sub: 'The one on WhatsApp. We send a code to check it is you.',
    label: 'Mobile number',
    prefix: '+91',
    demoNumber: '98765 43210',
    cta: 'Send code',
  },
  otp: {
    title: 'Enter the code',
    sub: (masked: string) => `Sent by SMS to +91 ${masked}.`,
    label: '6 digit code',
    hint: 'Demo: any 6 digits work.',
    cta: 'Verify',
  },
  promise: {
    title: 'What Munim does',
    lines: [
      'Sees all your money in one place: banks, funds, stocks, cards, loans and cover.',
      'Finds what is working too little, and tells you with the number.',
      'Gets it done with your approval, on WhatsApp and here.',
    ],
    trustTitle: 'Our promise',
    trust: [
      'Fee-only. We earn ₹0 on anything you buy, sell or switch.',
      'We never ask for your PIN or OTP in chat.',
      'You approve anything that moves money.',
    ],
    cta: 'Link my accounts',
  },
  aa: {
    header: 'Account Aggregator',
    partner: 'RBI-licensed partner',
    title: 'Munim wants to view your financial data',
    requestedBy: 'Requested by',
    requester: 'Munim, for Nikhil',
    accounts: 'Accounts to share',
    selected: (n: number, total: number) => `${n} of ${total} selected`,
    groups: {
      banks: 'Bank accounts',
      funds: 'Mutual funds',
      stocks: 'Stocks',
      nps: 'Pension',
      epf: 'Provident fund',
    } as Record<'banks' | 'funds' | 'stocks' | 'nps' | 'epf', string>,
    purposeLabel: 'Purpose',
    purpose: 'Personal finance management and advice',
    durationLabel: 'Consent valid for',
    duration: (months: number) => `${months} months`,
    frequencyLabel: 'Fetch',
    frequency: 'Daily',
    dataLabel: 'Data shared',
    data: 'Balances, holdings and transactions. View only: Munim cannot move money with this consent.',
    approve: 'Approve',
    revoke: 'You can revoke anytime from Trust.',
    noneSelected: 'Pick at least one account to share.',
  },
  gmail: {
    title: 'Cards, policies and orders',
    sub: "Account Aggregator doesn't cover credit cards or insurance yet. Gmail fills the gap.",
    scope: 'Read-only; we only read statements, policies and order emails.',
    reads: ['Credit card statements', 'Insurance policies and premium notices', 'Loan and ESOP letters', 'Subscription and order emails'],
    never: 'We never send, delete or read anything else.',
    cta: 'Connect Gmail (read-only)',
    account: 'Google account: Nikhil Mehra',
  },
  reveal: {
    title: 'Putting it together',
    sub: 'Reading your accounts, funds, cards and cover.',
    ready: 'Ready',
    progress: 'Linking sources',
  },
}

/* ---------- Moment 1: Connect and reveal ---------- */

export const m1 = {
  reveal: "Here's all your money in one picture, and three things I found.",
  showMe: 'Show me',
}

/* ---------- Moment 2: Money found ---------- */

export const m2 = {
  intro: 'Three things worth your time, biggest first. Nothing moves until you approve.',
  smallOne: 'And a small one:',

  cardA: {
    title: (amount: number, fund: string, yieldRate: number) => `Move ${fmtINR(amount)} to ${fund} (${fmtPct(yieldRate)})`,
    why: (idle: number, buffer: number, rate: number) =>
      `${fmtLakh(idle)} sits in HDFC above your ${fmtLakh(buffer)} buffer, earning ${fmtPct(rate)}.`,
    also: (dues: number, leaving: number, instantPerDay: number) =>
      `${fmtINR(dues)} of card bills are due before your next salary; I'm leaving ${fmtLakh(leaving)} for them on top of the buffer. If you need cash, up to ${fmtINR(instantPerDay)} a day comes back instantly.`,
    impact: (amount: number) => `About ${fmtINR(amount)} a year more`,
    railDetail: 'HDFC e-mandate → MF Central',
    approvalDetail: 'Your UPI PIN (first time)',
    when: (unitsBy: DateInput) => `Units by ${fmtDate(unitsBy)} (ordered before the 3 pm cut-off)`,
    receipt: (amount: number, fund: string) => `${fmtINR(amount)} to ${fund}`,
    timeline: (unitsBy: DateInput) => [`Ordered before the 3 pm cut-off. Units by ${fmtDate(unitsBy)}.`],
  },

  cardB: {
    title: 'Switch regular plans to direct, in two steps',
    why: (value: number, drag: number) =>
      `${fmtLakh(value)} is in regular plans that pay your bank about ${fmtINR(drag)} a year. The same funds have direct plans.`,
    now: 'Now: units older than a year',
    nowNote: (gain: number, limit: number) => `Gains ${fmtINR(gain)}, under the ${fmtLakh(limit)} tax-free limit, so no tax and no exit load.`,
    later: 'March: the rest',
    laterNote: 'Once those units pass a year.',
    also: (cost: number) => `Switching is a sale and a buy. Doing it all today would cost about ${fmtINR(cost)} in exit load and tax.`,
    railDetail: 'MF Central switch',
    approvalDetail: 'Your tap (no money leaves)',
    when: (doneBy: DateInput, days: number) => `Done by ${fmtDate(doneBy)} (${days} working days)`,
    receipt: (amount: number) => `Switched ${fmtINR(amount)} of regular plans to direct`,
    effect: (fund: string) => `${fund}: units older than a year switched to the direct plan`,
    timeline: (doneBy: DateInput) => [
      'Switch orders placed with MF Central',
      `Units in the direct plans by ${fmtDate(doneBy)}`,
      'The rest is set for March, once it passes a year',
    ],
  },

  cardC: {
    title: (topUp: number) => `Top up your term cover by ${fmtLakh(topUp)}`,
    why: (cover: number, sizedAt: number, ctc: number, shouldBe: number) =>
      `Your ${fmtLakh(cover)} cover was sized at a ${fmtLakh(sizedAt)} salary. At ${fmtLakh(ctc)} it should be about ${fmtLakh(shouldBe)}.`,
    line: (topUp: number) => `${fmtLakh(topUp)} top-up term plan, direct from the insurer`,
    lineNote: (monthly: number, age: number) => `About ${fmtINR(monthly)} a month at ${age}.`,
    also: "Needs a medical; two weeks. I'll start the application and book the test.",
    impact: 'Protection, no ₹ a year',
    approvalDetail: 'Tap to start; signature at the insurer',
    when: 'Application today; cover starts after the medical, in about two weeks',
    receipt: (topUp: number) => `Term top-up application started (${fmtLakh(topUp)})`,
    timeline: ['Application started with the insurer', 'Medical test booking sent to you'],
  },

  subs: {
    title: (names: string[]) => `Cancel ${and(names)}`,
    why: (items: { name: string; unusedFor: string }[], monthly: number) =>
      `${and(items.map((i) => `${i.name} (${i.unusedFor} unused)`))}: ${fmtINR(monthly)} a month. Cancel?`,
    also: (kept: string[]) =>
      kept.length ? `${and(kept)} stay; you use ${kept.length === 2 ? 'both' : kept.length === 1 ? 'it' : 'them'}.` : 'Nothing else is unused.',
    impact: (perYear: number) => `${fmtINR(perYear)} a year`,
    railDetail: 'Cancellation email, then the card mandate stops',
    approvalDetail: 'Your tap; you confirm each email',
    when: 'Emails drafted now; you send them',
    receipt: (names: string[]) => `Cancellation emails drafted for ${and(names)}`,
    reference: 'Drafts in your Gmail',
    timeline: ['Cancellation emails drafted'],
  },
}

/* ---------- Moment 3: Salary and Autopilot ---------- */

export const m3 = {
  creditNote: (employer: string) => `Salary from ${employer}`,
  landed: (amount: number) => `Salary landed: ${fmtINR(amount)}. Autopilot is doing the chores:`,

  bill: {
    title: (card: string) => `Pay ${card} in full`,
    why: (statement: number, due: DateInput) => `${fmtINR(statement)} due ${fmtDate(due)}. Paid in full on the due date, so no interest.`,
    also: (buffer: number) =>
      `Paid on the due date, not before, so the cash works until then. If HDFC would drop below your ${fmtLakh(buffer)} buffer, I'll ask first.`,
    impact: 'No interest, no late fee',
    railDetail: 'BBPS via UPI',
    approvalDetail: (rule: string) => `None: your rule "${rule}"`,
    receipt: (amount: number, card: string) => `${fmtINR(amount)} to ${card}`,
    /** SPEC 9.5: the failed run */
    declined: (time: string) => `Bank declined at ${time}`,
    failedPing: (what: string, reason: string, retryAt: DateInput) =>
      `Heads up: ${what} didn't go through. ${reason}; retrying at ${fmtTime(retryAt)}. Nothing else affected.`,
  },

  sips: (amount: number, on: DateInput) => `SIPs ${fmtINR(amount)} on ${fmtDate(on)}: already set, nothing to do.`,
  diwali: (amount: number, on: DateInput) =>
    `Diwali budget: ${fmtINR(amount)} earmarked in HDFC for gifts and travel (Diwali is ${fmtDate(on)}). I'll track spending against it.`,

  sweepLead: (spare: number, amount: number, mmss: string) =>
    `${fmtINR(spare)} is spare after bills, SIPs, Diwali and your buffer. Moving ${fmtINR(amount)} to the liquid fund in ${mmss}.`,
  sweepSkip: (buffer: number) =>
    `Nothing is spare this month after bills, SIPs, Diwali and your ${fmtLakh(buffer)} buffer, so the sweep skips. Your buffer stays whole.`,

  sweep: {
    title: (amount: number, fund: string) => `Sweep ${fmtINR(amount)} to ${fund}`,
    why: (spare: number) => `${fmtINR(spare)} is spare after bills, SIPs, Diwali and your buffer.`,
    balance: 'HDFC after salary',
    buffer: 'Keep as buffer',
    due: 'Due before next salary',
    dueNote: (c: { rent: number; emi: number; sips: number; cards: number; diwali: number; living: number }) =>
      `Rent ${fmtINR(c.rent)}, EMI ${fmtINR(c.emi)}, SIPs ${fmtINR(c.sips)}, card bills ${fmtINR(c.cards)}, Diwali ${fmtINR(c.diwali)}, living ${fmtINR(c.living)}.`,
    spare: 'Spare',
    spareNote: (step: number, amount: number) => `Rounded down to the nearest ${fmtINR(step)}: ${fmtINR(amount)} moves.`,
    also: 'The rule fires on the salary credit, not a date, so a late salary never bounces a bill. If the buffer would be breached, it skips and tells you.',
    cancelNote: "Kept in HDFC. I'll ask next month.",
    railDetail: 'HDFC e-mandate → MF Central',
    approvalDetail: (rule: string) => `None: your rule "${rule}"`,
    receipt: (amount: number, fund: string) => `${fmtINR(amount)} swept to ${fund}`,
  },
}

/* ---------- Moment 4: ESOP buyback ---------- */

export const m4 = {
  creditNote: (company: string) => `${company} ESOP buyback, net of tax`,
  landed: (net: number, company: string, units: number, price: number, taxRate: number) =>
    `${fmtINR(net)} landed from ${company}${company.endsWith('s') ? "'" : "'s"} buyback (${units.toLocaleString('en-IN')} options at ${fmtINR(price)}; ${fmtPct(taxRate)} perquisite tax already withheld). Here's a split to approve:`,

  title: (net: number) => `Split ${fmtINR(net)} three ways`,
  why: (net: number, loanRate: number) =>
    `${fmtINR(net)} from the buyback. The loan at ${fmtPct(loanRate)} goes first, then the emergency fund, then slow investing.`,

  prepay: (lender: string) => `Prepay the ${lender} education loan`,
  prepayAlso: (lost: number, saved: number, section: string) =>
    `Floating-rate, so no prepayment penalty. You lose about ${fmtINR(lost)} of ${section} deduction next year but save ${fmtINR(saved)} of interest a year. Net positive.`,
  prepayAlsoFixed: (saved: number) => `Saves ${fmtINR(saved)} of interest a year. Check the prepayment charge first.`,

  liquid: 'Top up the liquid fund',
  liquidNote: (target: number, months: number) => `Takes your emergency fund to ${fmtLakh(target, 1)}, ${inWords(months)} months of spending.`,
  liquidFull: (target: number) => `Your emergency fund is already at ${fmtLakh(target, 1)}.`,

  rest: 'The rest, into your direct funds',
  restNote: (tranches: number, weeks: number, split: { name: string; share: number }[], dates: DateInput[]) =>
    `${inWords(tranches).replace(/^./, (c) => c.toUpperCase())} tranches over ${inWords(weeks)} weeks (${and(dates.map((d) => fmtDate(d)))}), split ${split
      .map((s) => Math.round(s.share * 100))
      .join('/')} across ${and(split.map((s) => s.name))}.`,
  restAlso: 'Not all at once; markets are near highs.',

  also: (buffer: number) => `Your ${fmtLakh(buffer)} buffer and this month's bills stay in HDFC; tranches 2 and 3 wait there until their dates.`,
  railDetail: (upiLimit: number) => `HDFC e-mandate (above UPI's ${fmtLakh(upiLimit)} limit)`,
  approvalDetail: 'Your UPI PIN',
  when: (t2: DateInput, t3: DateInput) => `Now; tranches 2 and 3 on ${fmtDate(t2)} and ${fmtDate(t3)}`,
  receipt: (net: number) => `Buyback split: ${fmtINR(net)}`,
  timeline: (v: { lender: string; ref: string; liquidBy: DateInput; trancheBy: DateInput; t2: DateInput; t3: DateInput; topUp: number }) => [
    `Prepayment done · ${v.lender} ref ${v.ref}`,
    ...(v.topUp > 0 ? [`Liquid units by ${fmtDate(v.liquidBy)}`] : []),
    `Tranche 1 units by ${fmtDate(v.trancheBy)} (ordered before the 3 pm cut-off)`,
    `Tranches 2 and 3 scheduled for ${fmtDate(v.t2)} and ${fmtDate(v.t3)}`,
  ],
  prepayEffect: (amount: number, lender: string) => `${fmtINR(amount)} prepaid to ${lender}`,
  liquidEffect: (amount: number, fund: string) => `${fmtINR(amount)} to ${fund}`,
  fundEffect: (amount: number, fund: string) => `${fmtINR(amount)} into ${fund}`,

  advanceTax: (instalment: DateInput) =>
    `No extra advance tax due for this; it was taxed at source. Your ${fmtDate(instalment)} instalment is unchanged.`,

  tranche: {
    title: (n: number, amount: number) => `Tranche ${n}: ${fmtINR(amount)} into your direct funds`,
    why: (n: number, total: number, split: { name: string; share: number }[]) =>
      `Part ${n} of ${total} from the buyback, split ${split.map((s) => Math.round(s.share * 100)).join('/')} across ${and(split.map((s) => s.name))}.`,
    impact: 'Part of the buyback plan',
    approvalDetail: 'Signed with the buyback plan',
    also: 'Spread over six weeks rather than all at once; markets are near highs.',
    receipt: (n: number, amount: number) => `Tranche ${n}: ${fmtINR(amount)} invested`,
  },
}

/* ---------- Autopilot rules (SPEC 4, 5.3, 5.8) ---------- */

export const rulesText = {
  payCards: {
    name: 'Pay cards in full',
    trigger: 'a card statement arrives',
    action: 'pay it in full from HDFC on its due date',
  },
  sweep: {
    name: (buffer: number) => `Keep ${fmtLakh(buffer)}, sweep the rest`,
    trigger: 'salary lands in HDFC',
    action: (buffer: number, fund: string) => `keep ${fmtINR(buffer)} plus what is due before the next salary, and move the rest to ${fund}`,
  },
  wallets: {
    name: 'Top up wallets',
    trigger: (below: number) => `a food or shopping wallet drops below ${fmtINR(below)}`,
    action: 'top it up from HDFC',
  },
  harvest: {
    name: 'March tax harvest',
    trigger: 'the first week of March comes',
    action: 'book long-term gains under the tax-free limit and buy the same funds back the same day',
  },
}
