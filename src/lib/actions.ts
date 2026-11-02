/*
  Action card state machine (SPEC 4, 9.2). Pure functions, no timers, no store.

    proposed  -> approved          (tap, UPI PIN, the member's OTP, or an Autopilot rule)
    approved  -> held              (10:00 countdown, Cancel)  | stays approved while scheduled
    approved | held -> running -> done (receipt, ledger)  | failed (reason, retry time)
    proposed | approved | held -> cancelled
    failed    -> running           (retry)

  Each transition returns a new card with one timeline entry appended. A move that is not
  allowed from the card's state returns the same card object, unchanged, so callers can
  detect a no-op with ===, and nothing can break. complete() also returns the ledger entry
  (earned 0, approver Nikhil, the rule name, or the member).

  Two clocks: timeline times use the demo clock (ISO strings in IST, set per moment);
  holdEndsAt uses the real clock (epoch ms) so the countdown ticks in real time.
*/
import { computeFound } from '../data/derived'
import { profile } from '../data/persona'
import { timeline as copy } from '../copy/cards'
import type {
  ActionCard,
  ActionDraft,
  ActionStatus,
  ApprovalVia,
  CompleteInput,
  ISODateTime,
  LedgerEntry,
  Rail,
  Receipt,
  TimelineEntry,
} from '../types'

/** Every automated action waits this long before it runs (SPEC 1.4) */
export const HOLD_MINUTES = 10
/** Simulated running time before a card completes (SPEC 9.2) */
export const RUN_MS = 1500
/** Deep-link highlight pulse (SPEC 3) */
export const HIGHLIGHT_MS = 1200

const NIKHIL = profile.firstName

/* ---------- Time helpers (IST) ---------- */

const IST_OFFSET_MS = 330 * 60 * 1000
const pad = (n: number) => String(n).padStart(2, '0')

/** Epoch ms -> "2026-10-30T00:24:00+05:30" */
export function toIST(ms: number): ISODateTime {
  const z = new Date(ms + IST_OFFSET_MS)
  return `${z.getUTCFullYear()}-${pad(z.getUTCMonth() + 1)}-${pad(z.getUTCDate())}T${pad(z.getUTCHours())}:${pad(z.getUTCMinutes())}:${pad(z.getUTCSeconds())}+05:30`
}

export function addMinutes(at: ISODateTime, minutes: number): ISODateTime {
  return toIST(new Date(at).getTime() + minutes * 60_000)
}

export const isAfter = (a: ISODateTime, b: ISODateTime): boolean => new Date(a).getTime() > new Date(b).getTime()

/** Milliseconds -> "09:41" (rounds up, so a fresh hold shows 10:00 and the last second shows 00:01) */
export function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

export function holdRemainingMs(card: ActionCard, nowMs: number): number {
  if (card.status !== 'held' || card.holdEndsAt === undefined) return 0
  return Math.max(0, card.holdEndsAt - nowMs)
}

/* ---------- Internals ---------- */

function step(card: ActionCard, patch: Partial<ActionCard>, text: string, at: ISODateTime): ActionCard {
  const next: ActionCard = { ...card, ...patch }
  const entry: TimelineEntry = { at, text, status: next.status }
  return { ...next, timeline: [...card.timeline, entry] }
}

const among = (card: ActionCard, states: readonly ActionStatus[]) => states.includes(card.status)

/** FNV-1a, for stable reference numbers */
function hashDigits(s: string, n: number): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const a = String(h >>> 0).padStart(10, '0')
  const b = String(Math.imul(h ^ 0x9e3779b9, 2246822507) >>> 0).padStart(10, '0')
  return (a + b).slice(-n)
}

const REF_PREFIX: Record<Rail, string> = {
  'UPI Reserve Pay': 'UPI',
  'UPI with PIN': 'UPI',
  'bank e-mandate': 'NACH',
  'MF Central': 'MFC',
  'insurer direct': 'INS',
  BBPS: 'BBPS',
}

/** Stable, rail-flavoured reference for a card's nth receipt, e.g. "MFC48213907" */
export function makeReference(card: ActionCard): string {
  const digits = card.rail.startsWith('UPI') ? 12 : 8
  return `${REF_PREFIX[card.rail]}${hashDigits(`${card.id}#${card.receipts.length}`, digits)}`
}

/* ---------- Transitions ---------- */

/** New card, status proposed. Hold defaults to 10 min for Autopilot cards, else 0. */
export function propose(draft: ActionDraft, at: ISODateTime): ActionCard {
  const holdMinutes = draft.holdMinutes ?? (draft.approval === 'none' ? HOLD_MINUTES : 0)
  const base: ActionCard = {
    ...draft,
    holdMinutes,
    status: 'proposed',
    createdAt: draft.createdAt ?? at,
    earned: 0,
    receipts: [],
    timeline: draft.timeline ?? [],
    approvedBy: undefined,
    approvedVia: undefined,
    approvedAt: undefined,
    holdEndsAt: undefined,
    holdStartedAt: undefined,
    failure: undefined,
  }
  return step(base, {}, copy.proposed(draft.approval), at)
}

function approve(card: ActionCard, via: ApprovalVia, by: string, at: ISODateTime): ActionCard {
  if (card.status !== 'proposed') return card
  return step(card, { status: 'approved', approvedBy: by, approvedVia: via, approvedAt: at }, copy.approved(via, by), at)
}

/** Tap approval: cards whose approval is 'tap' */
export function approveByTap(card: ActionCard, at: ISODateTime, by: string = NIKHIL): ActionCard {
  return card.approval === 'tap' ? approve(card, 'tap', by, at) : card
}

/** UPI PIN approval: 'pin' cards (a PIN also satisfies a 'tap' card) */
export function approveByPin(card: ActionCard, at: ISODateTime, by: string = NIKHIL): ActionCard {
  return card.approval === 'pin' || card.approval === 'tap' ? approve(card, 'pin', by, at) : card
}

/** The member's OTP: 'member-consent' cards. The member is the approver. */
export function approveByMember(card: ActionCard, memberName: string, at: ISODateTime): ActionCard {
  return card.approval === 'member-consent' ? approve(card, 'member', memberName, at) : card
}

/** Standing approval of an Autopilot rule: cards whose approval is 'none'. The rule is the approver. */
export function approveByRule(card: ActionCard, ruleName: string, at: ISODateTime): ActionCard {
  return card.approval === 'none' ? approve(card, 'rule', ruleName, at) : card
}

/** Approved card that waits for its date (card bills on their due dates) */
export function schedule(card: ActionCard, scheduledFor: ISODateTime, at: ISODateTime): ActionCard {
  if (card.status !== 'approved') return card
  return step(card, { scheduledFor }, copy.scheduled(scheduledFor), at)
}

/** Start the hold: holdEndsAt = now + holdMinutes (real clock); the countdown shows on the card. */
export function hold(card: ActionCard, nowMs: number, at: ISODateTime): ActionCard {
  if (card.status !== 'approved') return card
  return step(
    card,
    { status: 'held', holdEndsAt: nowMs + card.holdMinutes * 60_000, holdStartedAt: at },
    copy.held(card.holdMinutes, addMinutes(at, card.holdMinutes)),
    at,
  )
}

/** Cancel before anything moves: a proposed card is skipped; a held or scheduled one is cancelled. */
export function cancel(card: ActionCard, at: ISODateTime, note?: string): ActionCard {
  if (!among(card, ['proposed', 'approved', 'held'])) return card
  const text = note ?? (card.status === 'proposed' ? copy.skipped : (card.cancelNote ?? copy.cancelled))
  return step(card, { status: 'cancelled', holdEndsAt: undefined }, text, at)
}

/** Demo time a card runs: the end of its hold if it was held, else the given clock */
export function runStamp(card: ActionCard, clock: ISODateTime): ISODateTime {
  return card.status === 'held' && card.holdStartedAt ? addMinutes(card.holdStartedAt, card.holdMinutes) : clock
}

export function run(card: ActionCard, at: ISODateTime): ActionCard {
  if (!among(card, ['approved', 'held'])) return card
  return step(card, { status: 'running', holdEndsAt: undefined }, copy.running, at)
}

/** Positive impact becomes the found amount; member-consent cards count as family. */
export function foundFromImpact(card: ActionCard): ActionCard['found'] {
  if (card.impact.per === 'none' || card.impact.amount <= 0) return undefined
  return { amount: card.impact.amount, scope: card.approval === 'member-consent' ? 'family' : 'self' }
}

/** Done: adds the receipt, marks done, sets found, and returns the ledger entry. */
export function complete(
  card: ActionCard,
  at: ISODateTime,
  input: CompleteInput = {},
): { card: ActionCard; ledger: LedgerEntry | null } {
  if (!among(card, ['approved', 'held', 'running'])) return { card, ledger: null }
  const plan = card.receiptPlan ?? {}
  const receipt: Receipt = {
    at,
    what: input.what ?? plan.what ?? card.title,
    rail: card.rail,
    reference: input.reference ?? plan.reference ?? makeReference(card),
    amount: card.amount,
  }
  const extra: TimelineEntry[] = (plan.timeline ?? []).map((text) => ({ at, text }))
  const done: ActionCard = {
    ...card,
    status: 'done',
    holdEndsAt: undefined,
    failure: undefined,
    found: input.found ?? card.found ?? foundFromImpact(card),
    receipts: [...card.receipts, receipt],
    timeline: [...card.timeline, ...extra, { at, text: copy.done, status: 'done' }],
  }
  const ledger: LedgerEntry = {
    id: `led-${card.id}-${done.receipts.length}`,
    at,
    action: receipt.what,
    actionId: card.id,
    approver: card.approvedBy ?? NIKHIL,
    rail: card.rail,
    amount: card.amount ?? 0,
    reference: receipt.reference,
    earned: 0,
  }
  return { card: done, ledger }
}

/** Failed: "Bank declined at 02:10; retrying at 10:00 am. Nothing else affected." Does not count. */
export function fail(card: ActionCard, reason: string, retryAt: ISODateTime, at: ISODateTime): ActionCard {
  if (!among(card, ['approved', 'held', 'running'])) return card
  return step(card, { status: 'failed', holdEndsAt: undefined, failure: { reason, retryAt } }, copy.failed(reason, retryAt), at)
}

/** Retry a failed card: it runs again (the approval stands) and the scripted failure is used up. */
export function retry(card: ActionCard, at: ISODateTime): ActionCard {
  if (card.status !== 'failed') return card
  return step(card, { status: 'running', failure: undefined, scriptedFailure: undefined }, copy.retried, at)
}

/* ---------- Selectors ---------- */

/** Found this year (SPEC 6): sum of found.amount over done cards, self and family kept apart */
export function selectFound(actions: readonly ActionCard[]): { self: number; family: number } {
  return computeFound(actions)
}

/** Cards that move or commit money carry "We earned ₹0 on this." */
export const isMoneyCard = (card: ActionCard): boolean => !['plan', 'consent', 'info'].includes(card.type)

/** Approved and waiting for its date */
export const isScheduled = (card: ActionCard): boolean => card.status === 'approved' && card.scheduledFor !== undefined

export type ActionBucket = 'needs-you' | 'held' | 'scheduled' | 'done' | 'closed'

/** Where a card sits on the Actions timeline (SPEC 3: Needs you, Held, Scheduled, Done) */
export function actionBucket(card: ActionCard): ActionBucket {
  switch (card.status) {
    case 'proposed':
    case 'failed':
      return 'needs-you'
    case 'approved':
      return card.scheduledFor ? 'scheduled' : 'held'
    case 'held':
    case 'running':
      return 'held'
    case 'done':
      return 'done'
    case 'cancelled':
      return 'closed'
  }
}
