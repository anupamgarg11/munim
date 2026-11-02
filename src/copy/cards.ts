/*
  Copy for the action card system: card labels, timeline lines, buttons, the PIN sheet,
  receipts, the Found this year counter and toasts.
  Rules: plain words, no em or en dashes, no emoji. Amounts through fmtINR or fmtLakh.
*/
import { fmtDate, fmtINR, fmtTime } from '../lib/format'
import type { ActionStatus, ActionType, Approval, ApprovalVia, Impact } from '../types'

export const typeLabel: Record<ActionType, string> = {
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
}

export const statusLabel: Record<ActionStatus, string> = {
  proposed: 'Needs you',
  approved: 'Approved',
  held: 'Held',
  running: 'Running',
  done: 'Done',
  cancelled: 'Cancelled',
  failed: 'Failed',
}

/** Pill for an approved card that waits for its date */
export const scheduledLabel = 'Scheduled'

export const facts = {
  impact: 'Impact',
  rail: 'Rail',
  approval: 'Approval',
  when: 'When',
}

export function impactText(impact: Impact): string {
  if (impact.label) return impact.label
  if (impact.per === 'year') return `${fmtINR(impact.amount)} a year`
  if (impact.per === 'now') return `${fmtINR(impact.amount)} now`
  return 'No ₹ impact'
}

export function approvalText(approval: Approval, memberName = 'The member'): string {
  switch (approval) {
    case 'none':
      return 'None, runs within Autopilot'
    case 'tap':
      return 'Your tap'
    case 'pin':
      return 'Your UPI PIN'
    case 'member-consent':
      return `${memberName}'s OTP`
  }
}

export const when = {
  scheduled: (at: string) => `On ${fmtDate(at)}`,
  afterHold: (minutes: number) => `${minutes} min after approval, with Cancel`,
  now: 'As soon as you approve',
}

/** Shown on every money card (SPEC 1.5) */
export const earned = {
  default: 'We earned ₹0 on this.',
  insure: "We earn ₹0; you'd pay the same at the insurer.",
}

export const alsoConsidered = 'Also considered'

export const lineAlsoConsidered = 'Also considered:'

/** Default approver names */
export const approvers = {
  autopilot: 'Autopilot',
  member: 'Member',
}

/* ---------- Timeline (one line per transition) ---------- */

const viaText: Record<ApprovalVia, string> = {
  tap: 'with a tap',
  pin: 'with UPI PIN',
  member: 'with OTP',
  rule: 'under Autopilot',
}

export const timeline = {
  proposed: (approval: Approval) => (approval === 'none' ? 'Proposed under Autopilot' : 'Proposed, ready to sign'),
  approved: (via: ApprovalVia, by: string) =>
    via === 'rule' ? `Approved by the rule "${by}"` : `Approved by ${by} ${viaText[via]}`,
  scheduled: (at: string) => `Scheduled for ${fmtDate(at)}`,
  held: (minutes: number, runsAt: string) => `Held for ${minutes} min. Runs at ${fmtTime(runsAt)} unless you cancel.`,
  running: 'Running',
  done: 'Done',
  skipped: 'Skipped. Nothing moved.',
  cancelled: 'Cancelled during the hold. Nothing moved.',
  killSwitch: 'Cancelled by the kill switch. Nothing moved.',
  failed: (reason: string, retryAt: string) => `${reason}; retrying at ${fmtTime(retryAt)}. Nothing else affected.`,
  retried: 'Retried',
}

/* ---------- Buttons and states ---------- */

export const buttons = {
  approve: 'Approve',
  approvePin: 'Approve with UPI PIN',
  askMember: (name: string) => `Ask ${name} to approve`,
  notNow: 'Not now',
  cancel: 'Cancel',
  skipWait: 'Skip wait',
  retry: 'Retry now',
  viewReceipt: 'View receipt',
  hideReceipt: 'Hide receipt',
  details: 'Details',
  running: 'Approved · running',
  showAlso: 'Show what else I considered',
  hideAlso: 'Hide what else I considered',
}

export const states = {
  waitingMember: (name: string) => `Waiting for ${name}'s OTP on their phone`,
  scheduledFor: (at: string) => `Runs on ${fmtDate(at)} under its standing approval.`,
  approved: 'Approved. Starting now.',
  cancelled: 'Nothing moved.',
  failedTitle: 'Did not go through',
  demoTag: 'Demo',
  timelineTitle: 'Timeline',
}

/* ---------- Hold countdown ---------- */

export const countdown = {
  runsIn: (mmss: string) => `Runs in ${mmss}`,
  label: 'Time left before it runs',
  cancelHint: 'UPI is not reversible. The hold is your undo.',
}

/* ---------- Receipt ---------- */

export const receipt = {
  title: 'Receipt',
  what: 'What ran',
  amount: 'Amount',
  rail: 'Rail',
  reference: 'Reference',
  time: 'Time',
}

/* ---------- UPI PIN sheet (in the app, never in chat) ---------- */

export const pinSheet = {
  header: 'HDFC Bank · UPI PIN',
  account: (mask: string) => `Account ****${mask}`,
  forLabel: 'For',
  amountLabel: 'Amount',
  enter: 'Enter your 4 or 6 digit UPI PIN',
  digitsEntered: (n: number) => `${n} of 6 digits entered`,
  submit: 'Submit',
  cancel: 'Cancel',
  deleteDigit: 'Delete last digit',
  approved: 'Approved',
  approvedSub: 'Your bank has the approval. Munim never sees your PIN.',
  trust: 'Your PIN goes to your bank, never to Munim or the chat.',
  dialogLabel: 'Approve with UPI PIN',
}

/* ---------- Found this year (SPEC 6) ---------- */

export const found = {
  title: 'Found this year',
  line: 'found this year',
  full: (amount: number) => `${fmtINR(amount)} found this year`,
  family: (amount: number) => `Family: ${fmtINR(amount)}`,
  familyHint: 'Found for family members, counted separately',
  note: 'Counted from done cards only. Skipped or failed cards do not count.',
}

/* ---------- Toasts ---------- */

export const toasts = {
  cancelled: 'Cancelled. Nothing moved.',
  skipped: 'Skipped. It will not count.',
  sentToMember: (name: string) => `Sent to ${name}'s phone for approval.`,
  needsPin: 'This one needs your UPI PIN.',
  retrying: 'Retrying now.',
  dismiss: 'Dismiss',
  region: 'Notifications',
}
