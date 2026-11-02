import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  ArrowRightLeft,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  IndianRupee,
  Info,
  Landmark,
  LoaderCircle,
  Lock,
  Receipt,
  Repeat,
  RotateCw,
  Scissors,
  ShieldCheck,
  Target,
  TrendingUp,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { useMunim } from '../store'
import { people } from '../data/persona'
import { isMoneyCard, isScheduled } from '../lib/actions'
import { fmtDateTime, fmtINR } from '../lib/format'
import {
  alsoConsidered as alsoConsideredLabel,
  approvalText,
  approvers,
  buttons,
  earned,
  facts,
  impactText,
  lineAlsoConsidered,
  scheduledLabel,
  states,
  statusLabel,
  timeline as timelineCopy,
  toasts,
  typeLabel,
  when as whenCopy,
} from '../copy/cards'
import type { ActionCard as Card, ActionStatus, ActionType } from '../types'
import { HoldCountdown } from './HoldCountdown'
import { ReceiptBlock } from './ReceiptBlock'

const TYPE_ICON: Record<ActionType, LucideIcon> = {
  sweep: ArrowRightLeft,
  switch: Repeat,
  pay: Receipt,
  invest: TrendingUp,
  prepay: Landmark,
  insure: ShieldCheck,
  harvest: Scissors,
  plan: Target,
  consent: UserCheck,
  info: Info,
}

const PILL: Record<ActionStatus, string> = {
  proposed: 'bg-accent-soft text-accent',
  approved: 'bg-accent-soft text-accent',
  held: 'bg-warning/10 text-warning',
  running: 'bg-accent-soft text-accent',
  done: 'bg-positive/10 text-positive',
  cancelled: 'bg-line text-muted',
  failed: 'bg-negative/10 text-negative',
}

const DOT: Record<ActionStatus, string> = {
  proposed: 'bg-accent',
  approved: 'bg-accent',
  held: 'bg-warning',
  running: 'bg-accent',
  done: 'bg-positive',
  cancelled: 'bg-muted',
  failed: 'bg-negative',
}

const PEOPLE = people as Record<string, { name: string } | undefined>

const reducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-button bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50'
const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-1.5 rounded-button border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-bg'

/** Status pill: Needs you, Held, Scheduled, Running, Done, Cancelled, Failed */
export function StatusPill({ card }: { card: Card }) {
  const scheduled = isScheduled(card)
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        scheduled ? 'bg-line text-ink' : PILL[card.status]
      }`}
    >
      {scheduled && <CalendarClock size={12} aria-hidden="true" />}
      {scheduled ? scheduledLabel : statusLabel[card.status]}
    </span>
  )
}

interface Props {
  /** The card's id: the live card is read from the store */
  id?: string
  /** Or the card itself; the live version in the store wins when it exists */
  card?: Card
  /** compact: title, one-line why, impact, primary button. full: everything (SPEC 4, 5). */
  variant?: 'compact' | 'full'
  /** Compact only: adds "Details ›" (e.g. open the full card) */
  onOpen?: () => void
  /** Pulse and scroll into view on a deep link (default true) */
  highlightable?: boolean
  className?: string
}

/** The in-app action card. Every state has its one right primary action. */
export function ActionCard({ id, card, variant = 'full', onOpen, highlightable = true, className = '' }: Props) {
  const key = id ?? card?.id
  const live = useMunim((s) => (key ? s.actions.find((a) => a.id === key) : undefined))
  const c = live ?? card
  if (!c) return null
  return <CardView card={c} variant={variant} onOpen={onOpen} highlightable={highlightable} className={className} />
}

interface ViewProps {
  card: Card
  variant: 'compact' | 'full'
  onOpen?: () => void
  highlightable: boolean
  className: string
}

function CardView({ card, variant, onOpen, highlightable, className }: ViewProps) {
  const full = variant === 'full'
  const ref = useRef<HTMLElement>(null)
  const titleId = useId()
  const highlighted = useMunim((s) => highlightable && s.highlightedActionId === card.id)
  const storeMemberName = useMunim((s) => s.members.find((m) => m.id === card.approverMemberId)?.name)
  const memberName = storeMemberName ?? (card.approverMemberId ? PEOPLE[card.approverMemberId]?.name : undefined) ?? approvers.member
  const [receiptOpen, setReceiptOpen] = useState(full)

  // Deep link: scroll into view and pulse (two 600 ms rings; a static ring under reduced motion)
  useEffect(() => {
    const el = ref.current
    if (!highlighted || !el) return
    const reduce = reducedMotion()
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    if (reduce || typeof el.animate !== 'function') return
    const anim = el.animate(
      [{ boxShadow: '0 0 0 0 rgb(11 110 79 / 0.55)' }, { boxShadow: '0 0 0 10px rgb(11 110 79 / 0)' }],
      { duration: 600, iterations: 2, easing: 'ease-out' },
    )
    return () => anim.cancel()
  }, [highlighted])

  const Icon = TYPE_ICON[card.type]
  const money = isMoneyCard(card)
  const ring = highlighted ? 'ring-2 ring-accent' : ''
  const actions = (
    <PrimaryActions
      card={card}
      full={full}
      memberName={memberName}
      receiptOpen={receiptOpen}
      onToggleReceipt={() => setReceiptOpen((o) => !o)}
    />
  )
  const earnedLine = money && (
    <p className="flex items-center gap-1 text-xs font-medium text-positive">
      <IndianRupee size={12} aria-hidden="true" />
      {card.type === 'insure' ? earned.insure : earned.default}
    </p>
  )
  const receipts = card.status === 'done' && receiptOpen && card.receipts.length > 0 && (
    <div className="mt-3 flex flex-col gap-2">
      {card.receipts.map((r, i) => (
        <ReceiptBlock key={`${r.reference}-${i}`} receipt={r} />
      ))}
    </div>
  )

  if (!full) {
    const last = card.timeline[card.timeline.length - 1]
    return (
      <article ref={ref} aria-labelledby={titleId} className={`rounded-card bg-card p-3.5 shadow-soft ${ring} ${className}`}>
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <Icon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 id={titleId} className="text-sm font-semibold leading-snug text-ink">
                {card.title}
              </h3>
              <StatusPill card={card} />
            </div>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">{card.why}</p>
            <p className="num mt-1 text-[13px] text-ink">
              <span className="text-muted">{facts.impact}: </span>
              <span className="font-semibold">{impactText(card.impact)}</span>
            </p>
          </div>
        </div>
        <FailureNote card={card} />
        {card.status === 'cancelled' && last && <p className="mt-2 text-[13px] text-muted">{last.text}</p>}
        {card.status !== 'cancelled' && <div className="mt-3">{actions}</div>}
        {receipts}
        {(earnedLine || onOpen) && (
          <div className="mt-2.5 flex items-center justify-between gap-2">
            {earnedLine || <span />}
            {onOpen && (
              <button
                type="button"
                onClick={onOpen}
                className="inline-flex items-center gap-0.5 rounded-button px-1 py-1 text-[13px] font-medium text-accent hover:underline"
              >
                {buttons.details}
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </article>
    )
  }

  return (
    <article ref={ref} aria-labelledby={titleId} className={`rounded-card bg-card p-4 shadow-soft ${ring} ${className}`}>
      <header className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
          <Icon size={14} aria-hidden="true" />
          {typeLabel[card.type]}
        </p>
        <StatusPill card={card} />
      </header>
      <h3 id={titleId} className="mt-2 text-[17px] font-semibold leading-snug tracking-tight text-ink">
        {card.title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-ink/85">{card.why}</p>

      {card.lines && card.lines.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-button border border-line">
          {card.lines.map((l, i) => (
            <li key={`${l.label}-${i}`} className="px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink">{l.label}</span>
                {l.amount !== undefined && <span className="num shrink-0 text-sm font-semibold text-ink">{fmtINR(l.amount)}</span>}
              </div>
              {l.note && <p className="mt-0.5 text-[13px] leading-snug text-muted">{l.note}</p>}
              {l.alsoConsidered && (
                <p className="mt-1 text-[13px] leading-snug text-ink/85">
                  <span className="font-medium text-accent">{lineAlsoConsidered}</span> {l.alsoConsidered}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <Fact label={facts.impact} strong>
          {impactText(card.impact)}
        </Fact>
        <Fact label={facts.rail}>{card.railDetail ?? card.rail}</Fact>
        <Fact label={facts.approval}>{card.approvalDetail ?? approvalText(card.approval, memberName)}</Fact>
        <Fact label={facts.when}>{whenText(card)}</Fact>
      </dl>

      {card.alsoConsidered && <AlsoConsidered text={card.alsoConsidered} defaultOpen={card.status === 'proposed'} />}

      <FailureNote card={card} />
      {card.status === 'cancelled' && (
        <p className="mt-3 text-sm text-muted">{card.timeline[card.timeline.length - 1]?.text ?? states.cancelled}</p>
      )}
      {card.status !== 'cancelled' && <div className="mt-4">{actions}</div>}
      {earnedLine && <div className="mt-3">{earnedLine}</div>}
      {receipts}

      {card.timeline.length > 0 && (
        <section aria-label={states.timelineTitle} className="mt-4 border-t border-line pt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{states.timelineTitle}</h4>
          <ol className="mt-2 flex flex-col gap-2">
            {card.timeline.map((t, i) => (
              <li key={`${t.at}-${i}`} className="flex gap-2.5 text-[13px]">
                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.status ? DOT[t.status] : 'bg-line'}`} />
                <div className="min-w-0">
                  <p className="leading-snug text-ink">{t.text}</p>
                  <p className="num text-xs text-muted">{fmtDateTime(t.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  )
}

function whenText(card: Card): string {
  if (card.when) return card.when
  if (card.scheduledFor) return whenCopy.scheduled(card.scheduledFor)
  if (card.holdMinutes > 0) return whenCopy.afterHold(card.holdMinutes)
  return whenCopy.now
}

function Fact({ label, strong = false, children }: { label: string; strong?: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`num mt-0.5 text-sm leading-snug text-ink ${strong ? 'font-semibold' : ''}`}>{children}</dd>
    </div>
  )
}

function AlsoConsidered({ text, defaultOpen }: { text: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  return (
    <div className="mt-3 rounded-button bg-bg">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-button px-3 py-2 text-left text-[13px] font-semibold text-ink"
      >
        {alsoConsideredLabel}
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <p id={panelId} hidden={!open} className="px-3 pb-2.5 text-[13px] leading-relaxed text-ink/85">
        {text}
      </p>
    </div>
  )
}

function FailureNote({ card }: { card: Card }) {
  if (card.status !== 'failed' || !card.failure) return null
  return (
    <div role="alert" className="mt-3 rounded-button border border-negative/20 bg-negative/5 px-3 py-2.5 text-[13px]">
      <p className="flex items-center gap-1.5 font-semibold text-negative">
        <CircleAlert size={14} aria-hidden="true" />
        {states.failedTitle}
      </p>
      <p className="mt-0.5 leading-snug text-ink">{timelineCopy.failed(card.failure.reason, card.failure.retryAt)}</p>
    </div>
  )
}

interface ActionsProps {
  card: Card
  full: boolean
  memberName: string
  receiptOpen: boolean
  onToggleReceipt: () => void
}

/** The right primary action for the state (SPEC 4, 9.2). */
function PrimaryActions({ card, full, memberName, receiptOpen, onToggleReceipt }: ActionsProps) {
  const approveAction = useMunim((s) => s.approveAction)
  const openPinSheet = useMunim((s) => s.openPinSheet)
  const cancelAction = useMunim((s) => s.cancelAction)
  const retryAction = useMunim((s) => s.retryAction)
  const requestMemberApproval = useMunim((s) => s.requestMemberApproval)
  const showToast = useMunim((s) => s.showToast)
  const waitingMember = useMunim((s) => s.memberRequest?.actionId === card.id)

  switch (card.status) {
    case 'proposed': {
      let primary: ReactNode
      if (card.approval === 'pin') {
        primary = (
          <button type="button" onClick={() => openPinSheet(card.id)} className={BTN_PRIMARY}>
            <Lock size={16} aria-hidden="true" />
            {buttons.approvePin}
          </button>
        )
      } else if (card.approval === 'member-consent') {
        primary = waitingMember ? (
          <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-muted">
            <LoaderCircle size={16} aria-hidden="true" className="animate-spin" />
            {states.waitingMember(memberName)}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => {
              requestMemberApproval(card.id)
              showToast(toasts.sentToMember(memberName))
            }}
            className={BTN_PRIMARY}
          >
            <UserCheck size={16} aria-hidden="true" />
            {buttons.askMember(memberName)}
          </button>
        )
      } else {
        primary = (
          <button type="button" onClick={() => approveAction(card.id, 'tap')} className={BTN_PRIMARY}>
            {buttons.approve}
          </button>
        )
      }
      return (
        <div className="flex flex-wrap items-center gap-2">
          {primary}
          {full && (
            <button
              type="button"
              onClick={() => {
                cancelAction(card.id)
                showToast(toasts.skipped)
              }}
              className={BTN_SECONDARY}
            >
              {buttons.notNow}
            </button>
          )}
        </div>
      )
    }
    case 'approved':
      if (isScheduled(card) && card.scheduledFor) {
        return (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[13px] text-ink">
              <CalendarClock size={16} aria-hidden="true" className="shrink-0 text-muted" />
              {states.scheduledFor(card.scheduledFor)}
            </p>
            <button
              type="button"
              onClick={() => {
                cancelAction(card.id)
                showToast(card.cancelNote ?? toasts.cancelled)
              }}
              className="rounded-button border border-negative/30 bg-card px-3 py-1.5 text-sm font-semibold text-negative hover:bg-negative/5"
            >
              {buttons.cancel}
            </button>
          </div>
        )
      }
      return <p className="text-sm font-medium text-accent">{states.approved}</p>
    case 'held':
      return <HoldCountdown id={card.id} compact={!full} />
    case 'running':
      return (
        <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-accent">
          <LoaderCircle size={16} aria-hidden="true" className="animate-spin" />
          {buttons.running}
        </p>
      )
    case 'done':
      return (
        <button type="button" aria-expanded={receiptOpen} onClick={onToggleReceipt} className={BTN_SECONDARY}>
          <Receipt size={16} aria-hidden="true" />
          {receiptOpen ? buttons.hideReceipt : buttons.viewReceipt}
        </button>
      )
    case 'failed':
      return (
        <button
          type="button"
          onClick={() => {
            retryAction(card.id)
            showToast(toasts.retrying)
          }}
          className={BTN_PRIMARY}
        >
          <RotateCw size={16} aria-hidden="true" />
          {buttons.retry}
        </button>
      )
    case 'cancelled':
      return null
  }
}
