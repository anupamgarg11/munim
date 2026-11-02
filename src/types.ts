/*
  Domain types. Section references are to SPEC.md.
  Money is always whole rupees (number). Times are ISO strings with the IST offset.
*/

export type Rupees = number
/** e.g. "2026-10-30T09:14:00+05:30" */
export type ISODateTime = string
/** e.g. "2026-11-09" (a calendar day in IST) */
export type ISODate = string

/* ---------- Shell ---------- */

export type Surface = 'whatsapp' | 'app'
export type Tab = 'home' | 'money' | 'actions' | 'rules' | 'trust'
export type Moment = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type CentreView = 'phone' | 'wide'

/* ---------- SPEC 4: Action card ---------- */

export type ActionType =
  | 'sweep'
  | 'switch'
  | 'pay'
  | 'invest'
  | 'prepay'
  | 'insure'
  | 'harvest'
  | 'plan'
  | 'consent'
  | 'info'

export type Rail =
  | 'UPI Reserve Pay'
  | 'UPI with PIN'
  | 'bank e-mandate'
  | 'MF Central'
  | 'insurer direct'
  | 'BBPS'

/** none = runs within Autopilot; tap; pin = UPI PIN or bank OTP sheet; member-consent = the member's OTP. */
export type Approval = 'none' | 'tap' | 'pin' | 'member-consent'

export type ActionStatus =
  | 'proposed'
  | 'approved'
  | 'held'
  | 'running'
  | 'done'
  | 'cancelled'
  | 'failed'

/** "₹ now or ₹ a year". per 'none' is for cards like term cover ("protection, no ₹ a year"). */
export interface Impact {
  amount: Rupees
  per: 'now' | 'year' | 'none'
  /** Display override, e.g. "Protection, no ₹ a year" */
  label?: string
}

export interface TimelineEntry {
  at: ISODateTime
  text: string
  status?: ActionStatus
}

export interface Receipt {
  at: ISODateTime
  what: string
  rail: Rail
  reference: string
  amount?: Rupees
}

export interface ActionCard {
  id: string
  type: ActionType
  title: string
  /** Applied to the live persona when the card completes (SPEC 9.3). Items 4 and 5 declare these. */
  effects?: Effect[]
  /** One line, includes the number */
  why: string
  impact: Impact
  rail: Rail
  /** Display form when a card uses two rails, e.g. "HDFC e-mandate → MF Central" */
  railDetail?: string
  approval: Approval
  /** For approval 'member-consent': which member approves (Member.id) */
  approverMemberId?: string
  /** Minutes the action waits before it runs (SPEC 1.4: 10) */
  holdMinutes: number
  status: ActionStatus
  createdAt: ISODateTime
  /** Real-clock epoch ms when the hold ends; drives the 10:00 countdown while status is 'held' */
  holdEndsAt?: number
  /** Set when status is 'failed' */
  failure?: { reason: string; retryAt: ISODateTime }
  timeline: TimelineEntry[]
  receipts: Receipt[]
  /** Second-order note, shown as "Also considered" */
  alsoConsidered?: string
  /** "We earned ₹0 on this." Always zero. */
  earned: 0
  /**
   * What this card adds to "Found this year" once done (SPEC 6). Only done cards count.
   * complete() keeps a declared value; when absent it sets it from a positive impact
   * (scope 'family' for member-consent cards). Set { amount: 0 } to opt out.
   */
  found?: { amount: Rupees; scope: 'self' | 'family' }

  /* ----- Item 3 additions (all optional) ----- */

  /** Money that moves, for the receipt and the ledger (e.g. ₹3,00,000 for card A) */
  amount?: Rupees
  /** Parts of a multi-line card (the ESOP split, the salary chores) */
  lines?: ActionLine[]
  /** When it runs, in words (SPEC 1.2), e.g. "Units by Fri 30 Oct (ordered before the 3 pm cut-off)" */
  when?: string
  /** Display override for the approval, e.g. "Tap to start; signature at the insurer" */
  approvalDetail?: string
  /** Autopilot rule this card runs under (approval 'none'); the rule's name is the approver */
  ruleId?: string
  /** Set on approval: "Nikhil", the rule name, or the member's name */
  approvedBy?: string
  approvedVia?: ApprovalVia
  approvedAt?: ISODateTime
  /** Approved but waits for this time before its hold starts; shown as Scheduled */
  scheduledFor?: ISODateTime
  /** Demo-clock time the hold started; the run is stamped holdStartedAt + holdMinutes */
  holdStartedAt?: ISODateTime
  /** Scripted receipt and extra done-timeline lines, used when the card completes */
  receiptPlan?: ReceiptPlan
  /** Timeline line when cancelled, e.g. "Kept in HDFC. I'll ask next month." */
  cancelNote?: string
  /** Demo (SPEC 9.5): the run fails with this instead of completing; Retry then completes */
  scriptedFailure?: { reason: string; retryAt: ISODateTime }
}

/* ---------- Item 3: action card system ---------- */

/** How an approval was given: a tap, the UPI PIN sheet, the member's OTP, or an Autopilot rule */
export type ApprovalVia = 'tap' | 'pin' | 'member' | 'rule'

/** One part of a multi-part card */
export interface ActionLine {
  label: string
  amount?: Rupees
  /** e.g. "Takes your emergency fund to ₹4.5 L, six months of spending." */
  note?: string
  /** This line's own second-order note */
  alsoConsidered?: string
}

/** What the receipt says when the card completes */
export interface ReceiptPlan {
  /** What ran (defaults to the card title) */
  what?: string
  /** Bank, RTA or BBPS reference (defaults to one derived from the card id) */
  reference?: string
  /** Extra timeline lines added before "Done", e.g. "Prepayment done · SBI ref 8821" */
  timeline?: string[]
}

/** What a moment passes to proposeAction: the card minus what the system fills in */
export type ActionDraft = Omit<ActionCard, 'status' | 'timeline' | 'receipts' | 'earned' | 'createdAt' | 'holdMinutes'> & {
  /** Defaults to 10 for Autopilot cards (approval 'none'), else 0 (tap and PIN run after 1.5 s) */
  holdMinutes?: number
  createdAt?: ISODateTime
  timeline?: TimelineEntry[]
}

/** Optional overrides when a card completes */
export interface CompleteInput {
  what?: string
  reference?: string
  found?: ActionCard['found']
}

/** A member's OTP approval waiting on their phone */
export interface MemberRequest {
  actionId: string
  memberId?: string
}

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface ToastItem {
  id: string
  text: string
  tone: ToastTone
  /** 0 = stays until dismissed */
  durationMs: number
}

/* ---------- SPEC 4: Rule (Autopilot) ---------- */

/** Sentence form: "When [trigger], [action], up to [cap]. Runs via [rail]. Hold 10 min." */
export interface Rule {
  id: string
  /** Shown as the approver in the ledger */
  name: string
  trigger: string
  action: string
  capPerRun: Rupees
  capPerMonth: Rupees
  rail: Rail
  holdMinutes: number
  enabled: boolean
  lastRun?: ISODateTime
  nextExpected?: ISODateTime
}

/* ---------- SPEC 4: Member ---------- */

export type ConsentStatus = 'invited' | 'consented' | 'expired'
export type Scope = 'see' | 'suggest' | 'act-with-otp'
export type Language = 'en' | 'hi'

export interface Member {
  id: string
  name: string
  relation: 'self' | 'spouse' | 'father' | 'mother'
  language: Language
  consent: ConsentStatus
  scopes: Scope[]
  /** Account ids from persona data */
  accountsLinked: string[]
  upiCircle: {
    status: 'none' | 'invited' | 'active'
    monthlyCap?: Rupees
    perPaymentCap?: Rupees
  }
}

/* ---------- SPEC 4: Ledger entry ---------- */

export interface LedgerEntry {
  id: string
  at: ISODateTime
  /** What ran, in words */
  action: string
  /** Link to the card */
  actionId?: string
  /** "Nikhil", an Autopilot rule name, or "Suresh" */
  approver: string
  rail: Rail
  amount: Rupees
  reference: string
  earned: 0
}

/* ---------- SPEC 4: Data source ---------- */

export type SourceVia = 'Account Aggregator' | 'Gmail' | 'SMS'

export interface DataSource {
  id: string
  /** HDFC, ICICI, Kotak, CAMS, KFintech, CDSL, NPS CRA, EPFO, Gmail, SMS (and SBI for Suresh) */
  name: string
  via: SourceVia
  /** What this source supplies, in words */
  covers: string
  /** Last successful fetch */
  freshness: ISODateTime
  /** When the consent lapses; Gmail and SMS have none */
  consentExpiry?: ISODate
  /** Whose consent this is; absent means Nikhil */
  memberId?: string
}

/* ---------- SPEC 3: Messages (one thread, two surfaces) ---------- */

export type Sender = 'munim' | 'nikhil' | 'suresh'
/** Nikhil's chat with Munim ji, or Suresh's (Hindi) */
export type ThreadId = 'nikhil' | 'suresh'
export type Ticks = 'sent' | 'delivered' | 'read'

interface MessageBase {
  id: string
  thread: ThreadId
  from: Sender
  at: ISODateTime
  /** Only on messages the person sent */
  ticks?: Ticks
}

export interface TextMessage extends MessageBase {
  kind: 'text'
  text: string
}

/** Compact card: title, one-line why, impact, primary button, "Open in Munim ›" */
export interface ActionCardMessage extends MessageBase {
  kind: 'action'
  actionId: string
}

/** Card plus "Approve in Munim", which opens the PIN sheet in the app */
export interface ApprovalRequestMessage extends MessageBase {
  kind: 'approval'
  actionId: string
}

/** What ran, rail, reference number */
export interface ReceiptMessage extends MessageBase {
  kind: 'receipt'
  actionId: string
  receipt: Receipt
}

/** Sent to another member, in their language */
export interface ConsentRequestMessage extends MessageBase {
  kind: 'consent'
  memberId: string
  text: string
  scopes: Scope[]
  /** Set when the request is about one action (e.g. Dad's FD) */
  actionId?: string
}

export interface WeeklyBriefMessage extends MessageBase {
  kind: 'brief'
  title: string
  lines: string[]
}

export interface ChipsMessage extends MessageBase {
  kind: 'chips'
  chips: string[]
}

export type Message =
  | TextMessage
  | ActionCardMessage
  | ApprovalRequestMessage
  | ReceiptMessage
  | ConsentRequestMessage
  | WeeklyBriefMessage
  | ChipsMessage

/* ---------- SPEC 2: Persona data ---------- */

export interface BankAccount {
  id: string
  bank: string
  short: string
  kind: 'salary' | 'savings'
  mask: string
  balance: Rupees
  /** Savings rate, where the spec gives one */
  interestRate?: number
  note?: string
  sourceId: string
  asOf: ISODateTime
}

export interface CreditCard {
  id: string
  issuer: string
  name: string
  mask: string
  statement: Rupees
  due: ISODate
  sourceId: string
  asOf: ISODateTime
}

/** A slice of a fund holding. gain is unrealised (negative for a loss). */
export interface FundLot {
  value: Rupees
  gain?: Rupees
  /** Held for more than a year (long-term for tax). Unknown when absent. */
  olderThanYear?: boolean
  bought?: string
}

export interface MutualFund {
  id: string
  name: string
  plan: 'direct' | 'regular'
  heldVia: string
  /** Value is the sum of the lots, never typed */
  lots: FundLot[]
  sourceId: string
  asOf: ISODateTime
  /** Item 4: 'liquid' marks the sweep target (created by the first 'liquid' effect) */
  kind?: 'liquid'
  /** Item 4: one line shown under the fund, e.g. "6.8% recent yield" */
  note?: string
}

export interface Sip {
  fundId: string
  amount: Rupees
  dayOfMonth: number
}

export interface StockHolding {
  id: string
  name: string
  value: Rupees
}

export interface Loan {
  id: string
  lender: string
  kind: string
  outstanding: Rupees
  rate: number
  rateType: 'floating' | 'fixed'
  emi: Rupees
  monthsLeft: number
  interestThisYear: Rupees
  taxSection: string
  sourceId: string
  asOf: ISODateTime
}

export interface Policy {
  id: string
  kind: 'health' | 'term' | 'life'
  name: string
  cover: Rupees
  covers: string
  provider?: string
  premium?: Rupees
  premiumPer?: 'year'
  premiumDue?: ISODate
  note?: string
  sourceId: string
  asOf: ISODateTime
}

export interface Wallet {
  id: string
  name: string
  balance: Rupees
  sourceId: string
}

export interface Subscription {
  id: string
  name: string
  monthly: Rupees
  /** e.g. "11 weeks" since last use; absent means in use */
  unusedFor?: string
  sourceId: string
}

export interface SpendCategory {
  id: string
  label: string
  monthly: Rupees
}

/* ---------- Effects: how a completed action or a story event moves balances (SPEC 9.3) ---------- */

/**
 * target: which persona record the delta applies to.
 *  'account'  id = bank account id (e.g. 'hdfc'); delta in rupees
 *  'card'     id = card id; delta to the statement due (negative when paid)
 *  'fund'     id = mutual fund id; delta to its value (a new direct fund may be created by the moment first)
 *  'liquid'   the liquid fund (created on first positive delta); delta in rupees
 *  'loan'     id = loan id; delta to outstanding (negative when prepaid)
 *  'stocks'   delta to total stock value (market moves)
 *  'member'   id = member account id (e.g. 'suresh-fd'); delta in rupees
 *
 * How derived.ts applyEffects reads them (item 4):
 *  'fund' delta > 0 is a purchase: a new lot at cost (gain 0, newer than a year). An unknown id
 *    creates a direct fund named `name` (else the id). delta < 0 is a price move: lots fall pro
 *    rata and known gains fall with them. A delta of minus the whole value (or more) is a sale:
 *    the fund is removed.
 *  'liquid' creates "ICICI Liquid Direct" (direct, 6.8% note) on the first positive delta; it
 *    is removed if it reaches zero.
 *  'loan' also shortens months left in proportion (the EMI stays).
 *  'stocks' scales every holding pro rata; the rounding remainder goes to the largest.
 *  'member' ids: 'suresh-fd' (FD principal), 'suresh-sbi' (savings balance).
 *  Every touched record's asOf, and the persona's AS_OF, move to the time of the change.
 */
export type EffectTarget = 'account' | 'card' | 'fund' | 'liquid' | 'loan' | 'stocks' | 'member'
export interface Effect {
  target: EffectTarget
  id?: string
  delta: Rupees
  /** Optional one-line label for the ledger or timeline, e.g. "₹3,00,000 to ICICI Liquid Direct" */
  label?: string
  /** Item 4: 'fund' only. Name for a direct fund that a positive delta creates when the id is new. */
  name?: string
}

/**
 * Item 4: one application of effects to the live persona (a completed card, the salary
 * credit, the buyback). Kept in the store's balanceLog, newest last.
 */
export interface BalanceEvent {
  at: ISODateTime
  /** e.g. "Salary from Orbit Labs", or the card's title */
  note?: string
  /** The card that caused it, when one did */
  actionId?: string
  effects: Effect[]
}
