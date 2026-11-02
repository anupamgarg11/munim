/*
  Copy for the five app screens: Home, Money, Actions, Rules, Trust.
  Rules: plain words, no em or en dashes, no emoji. Amounts and dates arrive already
  formatted (fmtINR, fmtLakh, fmtDate) from the caller; nothing here types a number
  that the app computes.
*/
import type { ActionStatus, ActionType, Approval, ConsentStatus, Language, Member, Scope, SourceVia } from '../types'
import type { PlanId, SpendCategoryId } from '../screens/screenData'
import type { TrustSection } from '../screens/uiStore'

/* ---------- Shared ---------- */

export const common = {
  view: 'View',
  back: 'Back',
  close: 'Close',
  cancel: 'Cancel',
  earned: (zero: string) => `We earned ${zero} on this.`,
  asOf: (when: string) => `as of ${when}`,
  /** "as of Thu 29 Oct, 9:14 am · CAMS via Account Aggregator" */
  freshness: (asOf: string, source: string) => `${asOf} · ${source}`,
  /** "A, B and C" */
  list: (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`),
  /** Masked account or card number: "****4471" */
  mask: (last4: string) => `****${last4}`,
  /** Two parts of a line: "a · b" */
  dot: (a: string, b: string) => `${a} · ${b}`,
  perYear: (amt: string) => `${amt} a year`,
  perMonth: (amt: string) => `${amt} a month`,
  now: (amt: string) => `${amt} now`,
  ordinal: (n: number) => {
    const t = n % 100
    if (t >= 11 && t <= 13) return `${n}th`
    return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
  },
}

export const sourceVia: Record<SourceVia, (name: string) => string> = {
  'Account Aggregator': (name) => `${name} via Account Aggregator`,
  Gmail: () => 'Gmail, read-only',
  SMS: () => 'SMS alerts',
}

/* ---------- Actions vocabulary (used on Home, Money and Actions) ---------- */

export const actionTypeLabel: Record<ActionType, string> = {
  sweep: 'Sweep',
  switch: 'Switch',
  pay: 'Pay',
  invest: 'Invest',
  prepay: 'Prepay',
  insure: 'Insure',
  harvest: 'Tax harvest',
  plan: 'Plan',
  consent: 'Consent',
  info: 'Info',
}

export const approvalLabel: Record<Approval, (member?: string) => string> = {
  none: () => 'Runs within Autopilot',
  tap: () => 'Your tap',
  pin: () => 'Your UPI PIN or bank OTP',
  'member-consent': (member) => (member ? `${member}'s OTP` : "The member's OTP"),
}

export const statusLabel: Record<ActionStatus, string> = {
  proposed: 'Needs your approval',
  approved: 'Approved, scheduled',
  held: 'Held',
  running: 'Running',
  done: 'Done',
  cancelled: 'Cancelled',
  failed: 'Failed',
}

export const actionLine = {
  heldFor: (clock: string) => `Held · runs in ${clock}`,
  heldEnding: 'Held · running now',
  scheduledFor: (when: string) => `Scheduled · ${when}`,
  failed: (reason: string, retry: string) => `${reason}. Retrying at ${retry}. Nothing else affected.`,
  impactNone: 'Protection, no ₹ a year',
  rail: 'Rail',
  approval: 'Approval',
  impact: 'Impact',
  status: 'Status',
  alsoConsidered: 'Also considered',
}

/* ---------- Home ---------- */

export const homeCopy = {
  latestOn: (date: string) => `Latest in your chat · ${date}`,
  latestEmpty: 'Nothing from Munim ji yet. Press Next to start the story.',
  needsApproval: (title: string) => `Needs your approval: ${title}`,
  receiptLine: (what: string) => `Done: ${what}`,
  consentSent: (name: string) => `Consent request sent to ${name}`,

  upNext: 'Up next',
  upNextEmpty: 'Nothing held or scheduled.',

  briefTitle: 'Weekly brief',
  briefWhen: (date: string) => `${date}, 6 pm`,
  briefNetWorth: (nw: string, date: string) => `Net worth ${nw}, as of ${date}.`,
  briefIdle: (idle: string, buffer: string, rate: string) =>
    `${idle} sits in HDFC above your ${buffer} buffer, earning ${rate}.`,
  briefCards: (n: number, total: string, first: string, last: string) =>
    `${n} card bills, ${total} in all, due between ${first} and ${last}.`,
  briefSips: (amt: string, day: string) => `SIPs of ${amt} go out on the ${day}.`,
  briefRegular: (drag: string) => `Regular plans cost you ${drag} a year more than direct ones.`,
  briefNothing: 'Nothing else needs you this week.',

  thread: 'Your chat with Munim ji',
  threadNote: 'The same messages as WhatsApp.',
  threadEmpty: 'Your conversation with Munim ji will show here.',
  fromMunim: 'Munim ji',
  fromYou: 'You',
  fromSuresh: 'Suresh',
  receiptRef: (rail: string, ref: string) => `${rail} · Ref ${ref}`,
  quickReplies: (chips: string[]) => `Quick replies in WhatsApp: ${chips.join(' · ')}`,
  openCard: 'View card',
}

/* ---------- Money ---------- */

export const moneyCopy = {
  netWorth: 'Net worth',
  sources: 'Sources',
  sourcesLabel: 'Sources, in Trust',
  partCash: 'Cash in banks',
  partInvestments: 'Investments',
  partLoans: 'Loans',
  partCards: 'Card dues',
  esopExcluded: (value: string) => `ESOPs not counted: ${value} vested`,

  cash: 'Cash',
  bufferLine: (buffer: string, above: string) => `Buffer ${buffer} · ${above} above it`,
  idleCallout: (idle: string, buffer: string, rate: string) =>
    `${idle} sits in HDFC above your ${buffer} buffer, earning ${rate}.`,
  accountKind: { salary: 'Salary account', savings: 'Savings account' } as Record<'salary' | 'savings', string>,

  investments: 'Investments',
  mutualFunds: 'Mutual funds',
  direct: 'Direct',
  regular: 'Regular',
  costsYou: (amt: string) => `Costs you ${amt} a year`,
  belowCost: (amt: string) => `${amt} below cost`,
  sip: (amt: string, day: string) => `SIP ${amt} on the ${day}`,
  stocks: 'Stocks',
  stocksVia: (broker: string, n: number) => `${broker} · ${n} stocks`,
  nps: (tier: number) => `NPS Tier ${tier}`,
  epf: 'EPF',
  esop: (company: string) => `${company} ESOPs`,
  esopVested: (units: string) => `${units} vested, outside the buyback`,
  esopNotCounted: 'Not in net worth',
  aMonth: 'a month',

  protection: 'Protection',
  coverFor: (who: string) => `Covers ${who}`,
  premiumDue: (amt: string, date: string) => `${amt} due ${date}`,
  premiumYear: (amt: string) => `${amt} a year`,
  termShouldBe: (sizedAt: string, salary: string, shouldBe: string) =>
    `Sized at a ${sizedAt} salary. At ${salary} it should be about ${shouldBe}.`,

  loans: 'Loans',
  loanLine: (rate: string, rateType: string, emi: string, months: number) =>
    `${rate} ${rateType} · EMI ${emi} · ${months} months left`,
  loanTax: (interest: string, section: string) => `${interest} interest this year, deductible under ${section}`,
  cardBills: 'Card bills due',
  cardDue: (date: string) => `Due ${date}`,
  owed: (amt: string) => `${amt} owed`,

  spending: 'Spending',
  thisMonth: (month: string) => `${month}, against budget`,
  spentOf: (spent: string, budget: string) => `${spent} of ${budget}`,
  over: (amt: string) => `${amt} over`,
  left: (amt: string) => `${amt} left`,
  diwali: 'Diwali budget',
  diwaliFor: (date: string) => `Gifts and travel · Diwali is ${date}`,
  diwaliEarmarked: 'Earmarked in HDFC',
  diwaliPending: 'Set aside when your salary lands',
  recent: 'Recent',
  recentHint: 'Tap one to fix its category. Munim remembers.',
  correctedTag: 'You set this',
  wallets: 'Wallets',
  walletsNote: (cap: string) => `Topped up by UPI Reserve Pay, within ${cap} a month`,
  subscriptions: 'Subscriptions',
  unusedFor: (span: string) => `Unused ${span}`,
  unusedCallout: (names: string, amt: string) => `${names} unused: ${amt} a month`,

  categorySheetTitle: (merchant: string) => `Category for ${merchant}`,
  categorySheetNote: 'Applies to this payment and every future one from this merchant.',
  categoryToast: (merchant: string, category: string) => `Got it. ${merchant} is ${category} from now on.`,
  spendCategory: {
    groceries: 'Groceries',
    'food-delivery': 'Food delivery',
    household: 'Household',
    shopping: 'Shopping',
    travel: 'Travel',
  } as Record<SpendCategoryId, string>,

  /* Detail view */
  detailBack: 'Money',
  detailSource: 'Source',
  detailFreshness: 'Freshness',
  detailConsent: (date: string) => `Consent until ${date}`,
  detailManage: 'Manage in Trust',
  detailRelated: 'Related actions',
  detailRelatedNone: 'No actions on this yet.',
  fact: {
    balance: 'Balance',
    buffer: 'Buffer',
    aboveBuffer: 'Above the buffer',
    earns: 'Earns',
    note: 'Note',
    statement: 'Statement',
    due: 'Due',
    plan: 'Plan',
    heldVia: 'Held via',
    extraCost: 'Extra cost over direct',
    olderLots: 'Units older than a year',
    newerLots: 'Units newer than a year',
    gains: 'Unrealised gain',
    cost: 'Cost',
    belowCost: 'Below cost',
    bought: 'Bought',
    sip: 'SIP',
    broker: 'Held with',
    shareOfStocks: 'Share of your stocks',
    tier: 'Tier',
    employer: 'Through',
    vested: 'Vested',
    inBuyback: 'In the buyback',
    buybackNet: 'Buyback, after tax',
    lands: 'Lands',
    remaining: 'Vested, outside the buyback',
    netWorth: 'Net worth',
    rate: 'Rate',
    emi: 'EMI',
    monthsLeft: 'Months left',
    interestThisYear: 'Interest this year',
    prepayment: 'Prepayment penalty',
    cover: 'Cover',
    covers: 'Covers',
    provider: 'Provider',
    premium: 'Premium',
    premiumDue: 'Premium due',
    shouldBe: 'Should be',
    topUps: 'Top-ups',
    monthly: 'Billed',
    yearly: 'A year',
    lastUsed: 'Last used',
  },
  value: {
    perYear: (rate: string) => `${rate} a year`,
    rate: (rate: string, rateType: string) => `${rate}, ${rateType}`,
    withGain: (value: string, gain: string) => `${value}, gain ${gain}`,
    units: (n: string) => `${n} options`,
    unitsAt: (n: string, price: string) => `${n} at ${price}`,
    afterTax: (net: string, rate: string) => `${net}, ${rate} withheld`,
    remaining: (n: string, value: string) => `${n}, ${value} at the buyback price`,
    notCounted: 'Not counted',
    deductible: (amt: string, section: string) => `${amt}, deductible under ${section}`,
    noPenalty: 'None on a floating rate',
    aboutCover: (amt: string) => `About ${amt}`,
    reservePay: (cap: string) => `UPI Reserve Pay, within ${cap} a month`,
    monthly: (amt: string) => `${amt} a month`,
    sip: (amt: string, day: string) => `${amt} on the ${day}`,
    unused: (span: string) => `Not in ${span}`,
    inUse: 'In use',
    plan: { direct: 'Direct', regular: 'Regular' } as Record<'direct' | 'regular', string>,
    rateType: { floating: 'floating', fixed: 'fixed' } as Record<'floating' | 'fixed', string>,
    share: (pct: string) => pct,
  },
}

/* ---------- Actions ---------- */

export const actionsCopy = {
  filterLabel: 'Filter by type',
  all: 'All',
  groups: {
    needs: 'Needs you',
    held: 'Held',
    scheduled: 'Scheduled',
    done: 'Done',
  } as Record<'needs' | 'held' | 'scheduled' | 'done', string>,
  groupNotes: {
    needs: 'Ready to sign. Nothing moves until you approve.',
    held: 'Each waits 10 minutes before it runs. Cancel stops it.',
    scheduled: 'Approved, waiting for their date.',
    done: 'Ran, or cancelled.',
  } as Record<'needs' | 'held' | 'scheduled' | 'done', string>,
  empty: 'No actions yet. Anything Munim proposes lands here, ready to sign.',
  emptyFilter: 'Nothing of this type yet.',
}

/* ---------- Rules ---------- */

export const rulesCopy = {
  intro: 'Autopilot runs these on its own, inside the caps. Every run waits 10 minutes first, with Cancel.',
  killTitle: 'Kill switch',
  killOffNote: 'Pauses every rule and cancels anything held.',
  killButton: 'Pause everything',
  killOnBanner: 'Autopilot is paused. No rule runs until you resume, and held actions were cancelled.',
  resume: 'Resume Autopilot',
  confirmTitle: 'Pause everything?',
  confirmBody: (rules: number, held: number) =>
    `${rules} ${rules === 1 ? 'rule stops' : 'rules stop'} and ${held} held ${held === 1 ? 'action is' : 'actions are'} cancelled. Nothing else changes, and you can resume any time.`,
  confirmYes: 'Pause everything',
  confirmNo: 'Keep running',
  pausedToast: 'Autopilot paused. Held actions cancelled.',
  resumedToast: 'Autopilot resumed.',
  empty: 'No Autopilot rules yet. Munim suggests them when your salary lands.',
  capPerRun: 'Per run',
  capPerMonth: 'Per month',
  rail: 'Rail',
  lastRun: 'Last run',
  nextExpected: 'Next expected',
  never: 'Not yet',
  none: 'None expected',
  enabled: (name: string) => `${name} on`,
  paused: 'Paused',
  off: 'Off',
}

/* ---------- Trust ---------- */

export const trustSectionLabel: Record<TrustSection, string> = {
  members: 'Members',
  ledger: 'Ledger',
  caps: 'Caps',
  data: 'Data',
  plan: 'Plan',
}

export const relationLabel: Record<Member['relation'], string> = {
  self: 'You',
  spouse: 'Spouse',
  father: 'Dad',
  mother: 'Mom',
}

export const languageLabel: Record<Language, string> = { en: 'English', hi: 'Hindi' }

export const consentLabel: Record<ConsentStatus, string> = {
  consented: 'Consented',
  invited: 'Invited, waiting',
  expired: 'Consent expired',
}

export const scopeLabel: Record<Scope, string> = {
  see: 'Sees balances',
  suggest: 'Gets suggestions',
  'act-with-otp': 'Acts with their own OTP',
}

export const trustCopy = {
  sectionsLabel: 'Trust sections',

  membersIntro: 'The household is the unit. Each member consents for themselves, in their language.',
  owner: 'Approves anything that moves money.',
  accountsLinked: (n: number) => `${n} ${n === 1 ? 'source' : 'sources'} linked`,
  upiCircle: (payer: string, member: string, monthly: string, perPayment: string) =>
    `${payer} can pay for ${member} up to ${monthly} a month, ${perPayment} a payment.`,
  inviteLabel: (who: string) => `Invite ${who}`,
  inviteNote: (lang: string) => `Consent request on WhatsApp, in ${lang}`,
  invitedToast: (who: string, lang: string) => `Invite sent to ${who} on WhatsApp, in ${lang}.`,

  ledgerIntro: 'Every action: what ran, who approved it, the rail, and what we earned.',
  ledgerSummary: (n: number, earned: string) => `${n} ${n === 1 ? 'entry' : 'entries'} · We earned ${earned} in all`,
  ledgerApprover: (who: string, rail: string) => `Approved by ${who} · ${rail}`,
  ledgerWhen: (when: string, ref: string) => `${when} · Ref ${ref}`,
  ledgerEmpty: 'Nothing has run yet. Every action will be logged here.',

  capsIntro: 'Hard limits. Autopilot cannot go past them, and you can change them any time.',
  capsAutopilot: 'Autopilot',
  capsRule: (perRun: string, perMonth: string) => `${perRun} a run · ${perMonth} a month`,
  capsTotal: (perMonth: string) => `All rules together: up to ${perMonth} a month`,
  capsNoRules: 'No rules yet.',
  capsHold: (mins: number) => `Every automated action waits ${mins} minutes first, with Cancel.`,
  capsReservePay: 'UPI Reserve Pay for wallets',
  capsReservePayValue: (cap: string) => `${cap} a month`,
  capsReservePayNote: (wallets: string) => `Small top-ups for ${wallets} run without a PIN, inside this limit.`,
  capsCooling: 'New payee cooling period',
  capsCoolingValue: (hours: number) => `${hours} hours`,
  capsCoolingNote: 'A payee Munim has not paid before waits a day, whatever the amount.',
  capsCircle: 'UPI Circle',
  capsCircleNone: 'No one yet.',
  capsKill: 'Kill switch',
  capsKillOn: 'On. Autopilot is paused.',
  capsKillOff: 'Off.',
  capsKillManage: 'Manage in Rules',
  capsPin: 'Anything else needs your UPI PIN or the bank OTP, never typed in chat.',

  dataIntro: (months: number) =>
    `Account Aggregator consents run ${months} months and refresh daily. Revoke any source here.`,
  dataAa: 'Account Aggregator',
  dataOther: 'Gmail and SMS',
  dataFor: (name: string) => `For ${name}`,
  dataConsentUntil: (date: string) => `Consent until ${date}`,
  dataExpiresIn: (days: number) => `Consent expires in ${days} ${days === 1 ? 'day' : 'days'}.`,
  dataRenew: 'Renew',
  dataReconsent: 'Re-consent',
  dataRenewedToast: (name: string, months: number) => `${name} consent renewed for ${months} months.`,
  dataGmail: 'Read-only. We only read statements, policies and order emails.',
  dataSms: 'Read-only. Payment alerts and wallet balances.',

  planIntro: 'Fee-only. You pay us, so the advice is yours.',
  planName: { free: 'Free', plus: 'Plus', family: 'Family', managed: 'Managed' } as Record<PlanId, string>,
  planWhat: {
    free: 'See everything in one place, and the weekly brief.',
    plus: 'Advice, ready-to-sign actions and Autopilot.',
    family: 'Plus for the whole household, each member with their own consent.',
    managed: 'We run the portfolio for you, as a registered portfolio manager (PRIM).',
  } as Record<PlanId, string>,
  planFree: (zero: string) => zero,
  planPrice: (price: string) => `${price} a year per household`,
  planFamily: (price: string, members: number) => `${price} a year, up to ${members} members`,
  planManaged: (min: string, rate: string) => `From ${min}, ${rate} a year`,
  planCurrent: 'Your plan',
  noCommissions: 'No commissions, ever.',
  planDirect: 'Direct plans only. Insurance direct from the insurer.',

  deleteTitle: 'Delete everything',
  deleteNote: 'Revokes every consent, erases your data and stops every rule. Your bank accounts are untouched.',
  deleteButton: 'Delete everything',
  deleteConfirmTitle: 'Delete everything?',
  deleteConfirmBody:
    'Every consent is revoked, your data is erased from Munim, and every rule stops. This cannot be undone.',
  deleteConfirmYes: 'Delete everything',
  deleteConfirmNo: 'Keep my data',
  deletedTitle: 'Everything is deleted',
  deletedBody: 'Consents revoked, data erased, rules stopped. Munim holds nothing about you.',
  startAgain: 'Start again',

  footer:
    'Prototype. Munim assumes a SEBI RIA and PRIM registration, Account Aggregator access via a partner, direct-plan execution via an execution-only platform, UPI Circle, Reserve Pay and BBPS through bank partners, and the IRDAI route for insurance.',
}
