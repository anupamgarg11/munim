/*
  Copy for the chat: the WhatsApp frames (Nikhil's in English, Suresh's in Hindi), the
  compact cards, and the scripted answers to free typing (SPEC 9.4).
  Rules: plain words, no em or en dashes, no emoji, no "agentic". Every number arrives as an
  argument computed from persona data (src/chat/facts.ts); none is typed here.
*/
import { fmtINR, fmtLakh, fmtPct, fmtDate, fmtDateTime, istParts } from '../lib/format'

/* ---------- Nikhil's WhatsApp (English UI) ---------- */

export const chat = {
  contactName: 'Munim ji',
  online: 'online',
  typing: 'typing…',
  verified: 'Verified business',
  placeholder: 'Message',
  send: 'Send',
  inputLabel: 'Message Munim ji',
  quickReplies: 'Quick replies',
  /** Pinned system note at the top of the chat */
  notice: 'Munim ji is a verified business account. Munim never asks for your PIN or OTP in chat.',
  avatar: 'M',
  ticks: { sent: 'Sent', delivered: 'Delivered', read: 'Read' },
  typingBubble: 'Munim ji is typing',
  log: 'Chat with Munim ji',
}

/* ---------- Compact cards inside WhatsApp ---------- */

export const card = {
  /** Small label above a card's title */
  type: {
    sweep: 'Idle cash',
    switch: 'Switch',
    pay: 'Payment',
    invest: 'Invest',
    prepay: 'Prepay',
    insure: 'Insurance',
    harvest: 'Tax harvest',
    plan: 'Plan',
    consent: 'Consent',
    info: 'For your information',
  } as Record<string, string>,
  impactLabel: 'Impact',
  openInMunim: 'Open in Munim ›',
  approve: 'Approve',
  approveInMunim: 'Approve in Munim',
  cancel: 'Cancel',
  retry: 'Retry now',
  sendTo: (who: string) => `Send to ${who}`,
  needsApproval: 'Needs your approval',
  pinNote: 'You enter your UPI PIN in the Munim app, never in chat.',
  alsoConsidered: 'Also considered:',
  earned: 'We earned ₹0',
  /** "₹11,400 a year", "₹6,40,000 now", or the card's own label */
  impact: (amount: number, per: 'now' | 'year' | 'none', label?: string) =>
    label ?? (per === 'year' ? `${fmtINR(amount)} a year` : per === 'now' ? `${fmtINR(amount)} now` : 'No ₹ impact'),
  status: {
    approved: 'Approved',
    scheduled: (at: string) => `Approved · runs ${fmtDate(at)}`,
    held: (mmss: string) => `Held · runs in ${mmss}`,
    heldHint: 'Cancel any time before it runs.',
    running: 'Approved · running',
    done: 'Done',
    cancelled: 'Cancelled. Nothing moved.',
    failed: (reason: string, retryAt: string) => `${reason} Retrying ${fmtDateTime(retryAt)}. Nothing else affected.`,
  },
  receipt: {
    title: 'Done',
    rail: 'Rail',
    ref: 'Ref',
    earned: 'We earned ₹0 on this.',
  },
  brief: {
    label: 'Weekly brief',
    footer: 'Every Sunday, 6 pm',
    open: 'Open in Munim ›',
  },
  consent: {
    sentTitle: (who: string) => `Request sent to ${who}`,
    sentBody: (who: string) => `In Hindi, on ${who}'s WhatsApp. He approves with his own OTP; I see only what he approves.`,
    actionBody: (who: string) => `${who} approves this on his phone with his OTP.`,
    waiting: (who: string) => `Waiting for ${who}`,
    given: (who: string) => `${who} approved`,
    showPhone: (who: string) => `Show ${who}'s phone`,
  },
  unavailable: 'This card is no longer available.',
}

/** Relation to how Nikhil says it */
export const relationName: Record<string, string> = { father: 'Dad', mother: 'Mom' }

/* ---------- Free typing (SPEC 9.4) ---------- */

export const chips = {
  starter: ['Can we buy a ₹14 L car in March?', 'Where can I save tax?', 'Am I insured enough?', 'How do you earn?'],
  whatIf: ['What if I lose my job?', 'What if markets fall 20%?', 'What if rates go up 1%?'],
}

const L = (n: number, digits = 2) => fmtLakh(n, digits)

export const answers = {
  fallback: "I'll look into that and come back by evening. Meanwhile, here's what I can do right now:",

  greeting: (name: string) => `Hello ${name}. Ask me anything about your money, or start with one of these:`,
  help:
    "I keep all your money in one picture, find what's working too little, and get things done with your approval: sweeps, switches to direct plans, bills, cover top-ups. Ask in your own words, or try one of these:",
  thanks: "Happy to help. I'll ping you only when something needs you.",
  yes: "To approve, tap the button on the card. I don't act on a typed yes for anything that moves money; the app asks for your PIN.",
  no: "No problem, I'll leave it and won't ask again this week. To stop something already held, tap Cancel on its card; to pause everything, use the switch at the top of Rules.",

  car: (v: {
    price: number
    stretch: boolean
    downNow: number
    loanNow: number
    rate: number
    years: number
    emiNow: number
    goalYear: number
    goalDelayMonths: number
    waitUntil: string
    downLater: number
    emiLater: number
  }) => [
    v.stretch ? `You can, but a ${L(v.price)} car is a stretch. Two ways:` : 'Yes, two ways.',
    `A: buy in March. ${L(v.downNow)} down from the liquid fund and a ${L(v.loanNow)} loan at ${fmtPct(v.rate)} for ${v.years} years. EMI ${fmtINR(v.emiNow)}, and your ${v.goalYear} house down payment moves back ${v.goalDelayMonths} months.\nB: wait till ${v.waitUntil} and put ${L(v.downLater)} down. EMI ${fmtINR(v.emiLater)}, and your goals don't move.`,
    "I'd pick B unless the current car is costing you. Either way, I'd insure it direct and keep the emergency fund untouched.",
  ],
  carCash: (v: { price: number; setAside: number; from: string; readyBy: string }) => [
    `Yes, and you don't need a loan. Set aside ${fmtINR(v.setAside)} a month from ${v.from} and a ${L(v.price)} car is paid in cash by ${v.readyBy}.`,
    'Your goals and the emergency fund stay as they are. I\'d insure it direct from the insurer.',
  ],

  houseAfford: (v: { emiShare: number; emiCap: number; loan: number; rate: number; years: number; price: number; down: number; stamp: number; goalYear: number }) => [
    `Keeping the home EMI within ${fmtPct(v.emiShare, 0)} of your take-home (${fmtINR(v.emiCap)} a month) supports a loan of about ${L(v.loan)} at ${fmtPct(v.rate)} over ${v.years} years. With 20% down, that's a home of about ${L(v.price)}.`,
    `You'd need about ${L(v.down)} down plus about ${L(v.stamp)} for stamp duty and registration. Your house goal is set for ${v.goalYear}; I'd build the down payment from your direct funds and SIPs, never the emergency fund.`,
  ],
  housePriced: (v: { price: number; down: number; stamp: number; loan: number; rate: number; years: number; emi: number; share: number; emiShare: number; emiCap: number; affordable: number; goalYear: number }) => [
    `For a ${L(v.price)} home: ${L(v.down)} down plus about ${L(v.stamp)} for stamp duty and registration, and a ${L(v.loan)} loan at ${fmtPct(v.rate)} over ${v.years} years. EMI about ${fmtINR(v.emi)}, which is ${fmtPct(v.share, 0)} of your take-home.`,
    v.share <= v.emiShare
      ? `That fits within the ${fmtPct(v.emiShare, 0)} I'd hold to, with your SIPs untouched. Your house goal is set for ${v.goalYear}; I'd build the down payment from your direct funds, never the emergency fund.`
      : `I'd keep the EMI within ${fmtPct(v.emiShare, 0)} (${fmtINR(v.emiCap)}), which points to a home of about ${L(v.affordable)}, or a bigger down payment. Your house goal is set for ${v.goalYear}.`,
  ],

  retire: (v: { invested: number; pots: number; sips: number; rate: number; atAge: number; nominal: number; real: number; yearsOfSpend: number; spend: number; stepUp: number; nominalStepUp: number }) => [
    `You have ${L(v.invested, 1)} invested, ${L(v.pots, 1)} of it in EPF and NPS, and ${fmtINR(v.sips)} a month going in through SIPs.`,
    `Keep that going at ${fmtPct(v.rate, 0)} a year and you'd have about ${L(v.nominal, 1)} at ${v.atAge}. In today's money that's about ${L(v.real, 1)}, or ${v.yearsOfSpend} years of your ${fmtINR(v.spend)} a month spending. Step your SIPs up ${fmtPct(v.stepUp, 0)} each April and it's about ${L(v.nominalStepUp, 1)}.`,
  ],

  tax: (v: { interest: number; gains: number; exemption: number; switchDone: boolean; loss: number; saving: number; harvestDone: boolean }) => [
    [
      'Three things on tax this year:',
      `• Your education-loan interest, ${fmtINR(v.interest)}, is deductible under 80E. Claim it when you file.`,
      v.switchDone
        ? `• The switch to direct plans booked ${fmtINR(v.gains)} of gains, inside the ${L(v.exemption)} tax-free limit: ₹0 tax.`
        : `• Switching your regular plans to direct books ${fmtINR(v.gains)} of gains on the older units. That's inside the ${L(v.exemption)} tax-free limit, so ₹0 tax.`,
      v.harvestDone
        ? `• Booking Mirae Midcap's ${fmtINR(v.loss)} loss saves about ${fmtINR(v.saving)}.`
        : `• Mirae Midcap is ${fmtINR(v.loss)} below cost. Booking that loss saves about ${fmtINR(v.saving)} of tax.`,
    ].join('\n'),
  ],

  fdDad: (v: { principal: number; maturesOn: string; rate: number; senior: number; extra: number }) => [
    `Dad's ${L(v.principal)} SBI FD matures ${fmtDate(v.maturesOn)} and is set to auto-renew at ${fmtPct(v.rate)}. A senior-citizen FD at ${fmtPct(v.senior)} pays ${fmtINR(v.extra)} more a year.`,
    'It stays in his name, and Form 15H means no TDS is cut. He approves with his own OTP.',
  ],
  fdSelf: (v: { liquidName: string; liquidYield: number; savingsRate: number; instant: number; senior: number }) => [
    `You don't hold any FDs. For money you might need within a year, ${v.liquidName} (${fmtPct(v.liquidYield)} recently) beats HDFC savings at ${fmtPct(v.savingsRate)}, and up to ${fmtINR(v.instant)} a day comes out instantly.`,
    `FDs suit your parents better: senior-citizen rates are around ${fmtPct(v.senior)}.`,
  ],

  insurance: (v: { corp: number; employer: string; floater: number; premium: number; due?: string; term: number; sizedAt: number; ctc: number; shouldBe: number; topUp: number; quote: number }) => [
    `Health: ${L(v.corp)} from ${v.employer} plus your ${L(v.floater)} family floater${v.due ? `; its ${fmtINR(v.premium)} premium is due ${fmtDate(v.due)}` : ''}. The ${v.employer} cover ends if you change jobs, so keep the floater.`,
    `Life: your ${L(v.term)} term plan was sized at a ${L(v.sizedAt)} salary. At ${L(v.ctc)} it should be about ${L(v.shouldBe)}, so I'd add ${L(v.topUp)} direct from the insurer, about ${fmtINR(v.quote)} a month. We earn ₹0 on it.`,
  ],

  emergency: (v: { target: number; spend: number; instant: number }) => [
    `Your emergency fund target is ${fmtINR(v.target)}: six months of your ${fmtINR(v.spend)} spending. It sits in a liquid fund, not the market, so a fall doesn't touch it, and up to ${fmtINR(v.instant)} a day comes out instantly.`,
  ],

  sip: (v: { total: number; day: number; list: { name: string; amount: number }[]; next: string; stepUp: number; stepUpAmount: number }) => [
    `Your SIPs: ${fmtINR(v.total)} a month on the ${ordinal(v.day)}. ${v.list.map((s) => `${s.name} ${fmtINR(s.amount)}`).join(', ')}, all direct plans.`,
    `The next one runs ${fmtDate(v.next)}, and the money is set aside from salary first. Raising them ${fmtPct(v.stepUp, 0)} each April (${fmtINR(v.stepUpAmount)} a month more next year) does more for your goals than hunting for a better fund.`,
  ],

  loan: (v: { lender: string; outstanding: number; prepaid: number; rate: number; emi: number; months: number; interest: number; section: string; perLakh: number }) => [
    v.prepaid > 0
      ? `Your ${v.lender} education loan: ${fmtINR(v.outstanding)} left after your ${fmtINR(v.prepaid)} prepayment, at ${fmtPct(v.rate)} floating. EMI ${fmtINR(v.emi)}, about ${v.months} months to go.`
      : `Your ${v.lender} education loan: ${fmtINR(v.outstanding)} left at ${fmtPct(v.rate)} floating, EMI ${fmtINR(v.emi)}, ${v.months} months to go. This year's interest, ${fmtINR(v.interest)}, is deductible under ${v.section}.`,
    `It's floating rate, so prepaying has no penalty. Every ₹1 L you prepay saves about ${fmtINR(v.perLakh)} of interest a year.`,
  ],

  doNothing: (v: { costs: { text: string; amount: number }[]; total: number; sips: number }) =>
    v.costs.length
      ? [
          `Then nothing moves, and that's allowed. Your SIPs (${fmtINR(v.sips)} on the 5th) and bills carry on as they are.`,
          `Waiting does cost a little: ${v.costs.map((c) => c.text).join(', and ')}. That's ${fmtINR(v.total)} a year. Nothing here is urgent; I'll remind you once, not every day.`,
        ]
      : [
          "You've already acted on the big ones, so doing nothing from here costs you nothing.",
          "Your SIPs and bills run as set. I'll ping you only when something needs you.",
        ],
  costIdle: (amount: number, gain: number) => `${L(amount)} idle in HDFC earns ${fmtINR(gain)} a year less than a liquid fund`,
  costRegular: (drag: number) => `your regular plans cost ${fmtINR(drag)} a year more than direct`,

  fees: (v: { plus: number; family: number; members: number; managedFrom: number; managedFee: number }) => [
    `Fee-only. Free shows you everything, with the weekly brief. Plus is ${fmtINR(v.plus)} a year per household for advice, actions and Autopilot; Family is ${fmtINR(v.family)} for up to ${v.members} members. Managed starts at ${L(v.managedFrom)} for ${fmtPct(v.managedFee)} a year.`,
    'We earn ₹0 from funds, insurers and banks: direct plans only, no commissions, ever. Your ledger in Trust shows what we earned on every action: ₹0.',
  ],

  whatIfJob: (v: { need: number; spend: number; emi: number; sips: number; runwayCash: number; months: string; corp: number; employer: string; floater: number }) => [
    `If your salary stopped, you'd need about ${fmtINR(v.need)} a month: ${fmtINR(v.spend)} of spending plus the ${fmtINR(v.emi)} EMI. I'd pause the ${fmtINR(v.sips)} of SIPs first.`,
    `Your cash after this month's card bills, ${fmtINR(v.runwayCash)}, covers about ${v.months} months. The ${L(v.corp)} ${v.employer} health cover ends with the job, so the ${L(v.floater)} floater is the one to keep paid.`,
  ],
  whatIfMarket: (v: { fall: number; exposed: number; loss: number }) => [
    `If markets fell ${fmtPct(v.fall, 0)}, your funds and stocks (${fmtINR(v.exposed)} today) would be down about ${fmtINR(v.loss)} on paper. Your cash, EPF and emergency fund wouldn't move.`,
    "I wouldn't sell anything. Your SIPs would buy more units at lower prices, and your goals are 5 to 15 years out.",
  ],
  whatIfRates: (v: { rise: number; lender: string; extra: number; emi: number }) => [
    `If rates rose ${fmtPct(v.rise, 0)}, your floating ${v.lender} loan would cost about ${fmtINR(v.extra)} more a year. Banks usually stretch the tenure rather than raise the EMI, so your ${fmtINR(v.emi)} a month stays the same.`,
    "Your liquid fund would start earning more too. I'd keep prepaying the loan from windfalls, not from your SIPs.",
  ],
  whatIf: 'I can test any what-if against your numbers. Three that people ask most:',

  netWorth: (v: { total: number; cash: number; invested: number; loans: number; cardDues: number; asOf: string }) => [
    `Your net worth is ${fmtINR(v.total)}: ${fmtINR(v.cash)} in cash and ${fmtINR(v.invested)} invested, minus the ${fmtINR(v.loans)} loan and ${fmtINR(v.cardDues)} of card bills.`,
    `As of ${fmtDateTime(v.asOf)}, from your banks, funds, depository, NPS and EPF through Account Aggregator, and Gmail for cards. The full picture is on the Money tab.`,
  ],

  spending: (v: { total: number; categories: { label: string; monthly: number }[]; unused: { name: string; unusedFor?: string }[]; unusedMonthly: number }) => [
    `You spend about ${fmtINR(v.total)} a month: ${v.categories.map((c) => `${c.label.toLowerCase()} ${fmtINR(c.monthly)}`).join(', ')}.`,
    ...(v.unused.length
      ? [
          `${v.unused.map((s) => `${s.name} (unused ${s.unusedFor})`).join(' and ')} cost ${fmtINR(v.unusedMonthly)} a month, ${fmtINR(v.unusedMonthly * 12)} a year. Worth cancelling.`,
        ]
      : []),
  ],

  safety: [
    "I never ask for your PIN or OTP in chat. Anything that moves money needs your UPI PIN or your bank's OTP, entered in the Munim app or on your bank's page.",
    'Every automated action waits 10 minutes with a Cancel button, every rule has a cap, and you can pause everything from Rules. Your data comes through Account Aggregator consent you can revoke from Trust.',
  ],
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${s}`
}

/* ---------- Suresh's WhatsApp (Hindi UI) ---------- */

const HI_WEEKDAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार']
const HI_MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर']

/** "बुधवार, 11 नवंबर" (IST) */
export function fmtDateHi(d: string | number | Date): string {
  const p = istParts(d)
  return `${HI_WEEKDAYS[p.weekday]}, ${p.day} ${HI_MONTHS[p.month]}`
}

/** "₹8 लाख", "₹1.2 करोड़" */
export function fmtLakhHi(n: number, digits = 2): string {
  return fmtLakh(n, digits).replace(/L$/, 'लाख').replace(/Cr$/, 'करोड़')
}

export const chatHi = {
  contactName: 'मुनीम जी',
  online: 'ऑनलाइन',
  typing: 'टाइप कर रहे हैं…',
  verified: 'सत्यापित बिज़नेस',
  placeholder: 'संदेश',
  send: 'भेजें',
  inputLabel: 'मुनीम जी को संदेश',
  quickReplies: 'जल्दी जवाब',
  notice: 'मुनीम जी एक सत्यापित बिज़नेस खाता है। मुनीम चैट में कभी आपका PIN या OTP नहीं माँगता।',
  avatar: 'मु',
  ticks: { sent: 'भेजा गया', delivered: 'पहुँच गया', read: 'पढ़ लिया' },
  typingBubble: 'मुनीम जी टाइप कर रहे हैं',
  log: 'मुनीम जी से बातचीत',
  /** Demo chrome (English, for the person presenting) */
  demoLabel: "Dad's phone · Suresh Mehra, Lucknow",
  back: "Back to Nikhil's phone",
  /** Reply to anything Suresh types */
  fallback: 'जी, मैं देखकर शाम तक बताता हूँ। आपकी मंज़ूरी के बिना आपके पैसे में कुछ नहीं बदलेगा।',

  consent: {
    linkTitle: 'Account Aggregator सहमति',
    linkSub: 'SBI बचत खाता और FD · 12 महीने',
    fdLinkTitle: 'FD बदलने की मंज़ूरी',
    fdLinkSub: (principal: number) => `SBI FD · ${fmtLakhHi(principal)}`,
    open: 'सहमति दें',
    openFd: 'मंज़ूरी दें',
    given: 'आपने मंज़ूरी दे दी',
    scopesTitle: 'मुनीम क्या कर सकेगा',
    scopes: {
      see: 'आपके खाते देखना',
      suggest: 'सुझाव देना',
      'act-with-otp': 'आपके OTP से ही कोई काम करना',
    } as Record<string, string>,
  },

  sheet: {
    aaHeader: 'Account Aggregator',
    bankHeader: 'SBI',
    secure: 'सुरक्षित पेज',
    aaTitle: 'मुनीम को सहमति',
    fdTitle: 'FD बदलने की मंज़ूरी',
    rows: {
      accounts: 'खाते',
      accountsValue: 'SBI बचत खाता, SBI FD',
      purpose: 'उद्देश्य',
      purposeValue: 'पैसे की सलाह और योजना',
      duration: 'अवधि',
      durationValue: '12 महीने',
      frequency: 'कितनी बार',
      frequencyValue: 'रोज़ाना',
    },
    revoke: 'आप यह सहमति कभी भी वापस ले सकते हैं।',
    fdRows: (v: { principal: number; rate: number; maturesOn: string; senior: number; extra: number }) => [
      { label: 'अभी की FD', value: `${fmtLakhHi(v.principal)}, ${fmtPct(v.rate)}, ${fmtDateHi(v.maturesOn)} को पूरी` },
      { label: 'नई FD', value: `सीनियर सिटीज़न FD, ${fmtPct(v.senior)}` },
      { label: 'फ़ायदा', value: `हर साल ${fmtINR(v.extra)} ज़्यादा` },
      { label: 'किसके नाम', value: 'आपके ही नाम पर' },
      { label: 'Form 15H', value: 'भरा जाएगा, TDS नहीं कटेगा' },
    ],
    otpLabel: 'OTP डालें',
    otpHintAa: 'आपके मोबाइल पर 6 अंकों का OTP भेजा गया है।',
    otpHintBank: 'SBI ने आपके मोबाइल पर 6 अंकों का OTP भेजा है।',
    approve: 'मंज़ूर करें',
    approved: 'मंज़ूर हो गया',
    close: 'बंद करें',
  },

  /** Default consent request text (moment 7). The moment script may pass its own. */
  inviteText: [
    'नमस्ते सुरेश जी। आपके बेटे निखिल ने आपको मुनीम से जोड़ने का अनुरोध भेजा है।',
    'मुनीम सिर्फ़ वही देखेगा जो आप मंज़ूर करेंगे, और आपके पैसे से जुड़ा हर काम आपकी मंज़ूरी से ही होगा।',
    'नीचे दिए लिंक से सहमति दें। यह 12 महीने के लिए है और आप इसे कभी भी वापस ले सकते हैं।',
  ].join('\n'),

  /** Default FD approval text (moment 7), computed from Suresh's data */
  fdText: (v: { principal: number; maturesOn: string; rate: number; senior: number; extra: number; medical: number }) =>
    [
      `सुरेश जी, आपकी ${fmtLakhHi(v.principal)} की SBI FD ${fmtDateHi(v.maturesOn)} को पूरी हो रही है और ${fmtPct(v.rate)} पर अपने आप दोबारा जमा हो जाएगी।`,
      `सीनियर सिटीज़न FD पर ${fmtPct(v.senior)} मिल रहा है, यानी हर साल ${fmtINR(v.extra)} ज़्यादा।`,
      `FD आपके ही नाम पर रहेगी, और Form 15H भरने से TDS नहीं कटेगा। इलाज के लिए ${fmtLakhHi(v.medical)} बचत खाते में रहेंगे।`,
      'मंज़ूरी आपके OTP से होगी, चैट में नहीं।',
    ].join('\n'),
}
