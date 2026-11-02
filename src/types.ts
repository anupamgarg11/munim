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
  /** What this card adds to "Found this year" once done (SPEC 6). Absent = does not count. */
  found?: { amount: Rupees; scope: 'self' | 'family' }
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
