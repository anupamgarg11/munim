/*
  Message renderers for the WhatsApp frame (SPEC 3): text, action card, approval request,
  receipt, consent request (as sent), weekly brief. Chips render above the composer, not here.
  Cards are compact and WhatsApp-styled (an interactive message: header, body, footer, then
  full-width buttons in link blue). They read the live card from the store, so a status
  change (approved, held with countdown, done) shows in the chat at once.
*/
import type { ReactNode } from 'react'
import {
  ArrowRightLeft,
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheck,
  Hourglass,
  IndianRupee,
  Info,
  Landmark,
  LoaderCircle,
  Lock,
  Repeat,
  RotateCw,
  Scissors,
  Send,
  ShieldCheck,
  Smartphone,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useMunim } from '../../store'
import { fmtINR } from '../../lib/format'
import { card as copy, chat } from '../../copy/chat'
import { useChat } from '../chatStore'
import { openInMunim, showPhone } from '../engine'
import { consentStatus, memberLabel, runCardCommand, type CardCommand } from '../bridge'
import type {
  ActionCard,
  ActionType,
  ConsentRequestMessage,
  Message,
  ReceiptMessage,
  WeeklyBriefMessage,
} from '../../types'
import { Bubble, Meta, TextBody, WA_META, fmtMmSs, useRemainingMs } from './ChatParts'

export type OnCardAction = (actionId: string, command: CardCommand) => void

const TYPE_ICON: Record<ActionType, LucideIcon> = {
  sweep: ArrowRightLeft,
  switch: Repeat,
  pay: IndianRupee,
  invest: TrendingUp,
  prepay: Landmark,
  insure: ShieldCheck,
  harvest: Scissors,
  plan: Target,
  consent: UserCheck,
  info: Info,
}

/** Cards that move or commit money carry "We earned ₹0" (SPEC 1.5) */
const isMoneyCard = (a: ActionCard) => !['plan', 'consent', 'info'].includes(a.type)

/** Optional fields the card system may add; read loosely so the chat never breaks on them */
type CardExtras = { scheduledFor?: string; lines?: { label: string; amount?: number }[] }

/* ---------- Pieces ---------- */

function Label({ icon: Icon, children, tone = 'accent' }: { icon: LucideIcon; children: ReactNode; tone?: 'accent' | 'warning' }) {
  return (
    <p className={`flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-wide ${tone === 'accent' ? 'text-accent' : 'text-warning'}`}>
      <Icon size={13} strokeWidth={2.25} aria-hidden="true" />
      {children}
    </p>
  )
}

/** Full-width buttons under a card, divided by hairlines, as WhatsApp draws them */
function ButtonRow({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-black/10 border-t border-black/10">{children}</div>
}

function CardButton({ icon: Icon, children, onClick, strong = false }: { icon?: LucideIcon; children: ReactNode; onClick: () => void; strong?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-1.5 px-3 py-2.5 text-[14.5px] text-wa-link transition-colors hover:bg-black/[0.03] active:bg-black/[0.06] ${
        strong ? 'font-semibold' : 'font-medium'
      }`}
    >
      {Icon && <Icon size={17} aria-hidden="true" />}
      {children}
    </button>
  )
}

function Footer({ left, at }: { left?: ReactNode; at: string }) {
  return (
    <div className={`mt-1.5 flex items-end justify-between gap-3 text-[12px] ${WA_META}`}>
      <span className="min-w-0">{left}</span>
      <Meta at={at} tickLabels={chat.ticks} className="shrink-0" />
    </div>
  )
}

/* ---------- Action card and approval request ---------- */

interface Primary {
  label: string
  command: CardCommand
  icon: LucideIcon
}

function primaryFor(a: ActionCard & CardExtras, approvalRequest: boolean): Primary | null {
  switch (a.status) {
    case 'proposed':
      if (approvalRequest || a.approval === 'pin') return { label: copy.approveInMunim, command: 'approve-in-munim', icon: Lock }
      if (a.approval === 'member-consent') return { label: copy.sendTo(memberLabel(a.approverMemberId ?? 'suresh')), command: 'ask-member', icon: Send }
      return { label: copy.approve, command: 'approve', icon: Check }
    case 'approved':
    case 'held':
      return { label: copy.cancel, command: 'cancel', icon: X }
    case 'failed':
      return { label: copy.retry, command: 'retry', icon: RotateCw }
    default:
      return null
  }
}

function StatusLine({ a }: { a: ActionCard & CardExtras }) {
  const remaining = useRemainingMs(a.status === 'held' ? a.holdEndsAt : undefined)
  const row = (Icon: LucideIcon, text: string, tone: string, spin = false) => (
    <p className={`mt-1.5 flex items-start gap-1.5 text-[13px] font-medium ${tone}`}>
      <Icon size={15} aria-hidden="true" className={`mt-[1px] shrink-0 ${spin ? 'animate-spin' : ''}`} />
      <span>{text}</span>
    </p>
  )
  switch (a.status) {
    case 'proposed':
      return null
    case 'approved':
      return a.scheduledFor ? row(CalendarDays, copy.status.scheduled(a.scheduledFor), 'text-accent') : row(Check, copy.status.approved, 'text-accent')
    case 'held':
      return (
        <div aria-live="polite">
          {row(Hourglass, copy.status.held(fmtMmSs(remaining)), 'text-warning num')}
          <p className={`pl-[21px] text-[12px] ${WA_META}`}>{copy.status.heldHint}</p>
        </div>
      )
    case 'running':
      return row(LoaderCircle, copy.status.running, 'text-accent', true)
    case 'done': {
      const ref = a.receipts[a.receipts.length - 1]?.reference
      return row(CircleCheck, ref ? `${copy.status.done} · ${copy.receipt.ref} ${ref}` : copy.status.done, 'text-accent')
    }
    case 'cancelled':
      return row(X, copy.status.cancelled, WA_META)
    case 'failed':
      return a.failure ? row(CircleAlert, copy.status.failed(a.failure.reason, a.failure.retryAt), 'text-negative') : null
  }
}

interface CardBubbleProps {
  actionId: string
  at: string
  tail: boolean
  /** Approval request: "Needs your approval" and "Approve in Munim" */
  approvalRequest?: boolean
  onAction?: OnCardAction
}

export function ActionCardBubble({ actionId, at, tail, approvalRequest = false, onAction }: CardBubbleProps) {
  const a = useMunim((s) => s.actions.find((x) => x.id === actionId)) as (ActionCard & CardExtras) | undefined
  if (!a) {
    return (
      <Bubble side="in" tail={tail}>
        <TextBody text={copy.unavailable} at={at} tickLabels={chat.ticks} />
      </Bubble>
    )
  }
  const run = (command: CardCommand) => (onAction ?? runCardCommand)(a.id, command)
  const primary = primaryFor(a, approvalRequest)
  const Icon = TYPE_ICON[a.type] ?? Info
  const lines = Array.isArray(a.lines) ? a.lines : []

  return (
    <Bubble side="in" tail={tail} wide>
      <div className="px-2.5 pb-2 pt-2">
        {approvalRequest ? <Label icon={Lock} tone="warning">{copy.needsApproval}</Label> : <Label icon={Icon}>{copy.type[a.type] ?? a.type}</Label>}
        <p className="mt-0.5 text-[15px] font-semibold leading-snug">{a.title}</p>
        <p className="mt-0.5 text-[14px] leading-[19px]">{a.why}</p>
        {lines.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-[13.5px] leading-[18px]">
            {lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="min-w-0">{l.label}</span>
                {typeof l.amount === 'number' && <span className="num shrink-0 font-medium">{fmtINR(l.amount)}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1.5 text-[13.5px]">
          <span className={WA_META}>{copy.impactLabel} </span>
          <span className="num font-semibold text-accent">{copy.impact(a.impact.amount, a.impact.per, a.impact.label)}</span>
        </p>
        {a.alsoConsidered && (
          <p className={`mt-1 line-clamp-2 text-[12.5px] leading-[17px] ${WA_META}`}>
            <span className="font-semibold">{copy.alsoConsidered}</span> {a.alsoConsidered}
          </p>
        )}
        {approvalRequest && a.status === 'proposed' && <p className={`mt-1 text-[12.5px] ${WA_META}`}>{copy.pinNote}</p>}
        <StatusLine a={a} />
        <Footer at={at} left={`${a.railDetail ?? a.rail}${isMoneyCard(a) ? ` · ${copy.earned}` : ''}`} />
      </div>
      <ButtonRow>
        {primary && (
          <CardButton icon={primary.icon} strong onClick={() => run(primary.command)}>
            {primary.label}
          </CardButton>
        )}
        <CardButton onClick={() => openInMunim(a.id)}>{copy.openInMunim}</CardButton>
      </ButtonRow>
    </Bubble>
  )
}

/* ---------- Receipt ---------- */

export function ReceiptBubble({ m, tail }: { m: ReceiptMessage; tail: boolean }) {
  const r = m.receipt
  return (
    <Bubble side="in" tail={tail} wide>
      <div className="px-2.5 pb-2 pt-2">
        <Label icon={CircleCheck}>{copy.receipt.title}</Label>
        <p className="mt-0.5 text-[15px] font-semibold leading-snug">{r.what}</p>
        {typeof r.amount === 'number' && r.amount > 0 && <p className="num mt-0.5 text-[18px] font-semibold">{fmtINR(r.amount)}</p>}
        <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px]">
          <dt className={WA_META}>{copy.receipt.rail}</dt>
          <dd>{r.rail}</dd>
          <dt className={WA_META}>{copy.receipt.ref}</dt>
          <dd className="num break-all">{r.reference}</dd>
        </dl>
        <Footer at={m.at} left={copy.receipt.earned} />
      </div>
      <ButtonRow>
        <CardButton onClick={() => openInMunim(m.actionId)}>{copy.openInMunim}</CardButton>
      </ButtonRow>
    </Bubble>
  )
}

/* ---------- Consent request, as sent (Nikhil's side) ---------- */

export function ConsentSentBubble({ m, tail }: { m: ConsentRequestMessage; tail: boolean }) {
  const actions = useMunim((s) => s.actions)
  const members = useMunim((s) => s.members)
  const given = useChat((s) => s.consentGiven)
  const status = consentStatus(m, { actions, members, given })
  const who = memberLabel(m.memberId)
  const preview = m.text.split('\n')[0]
  return (
    <Bubble side="in" tail={tail} wide>
      <div className="px-2.5 pb-2 pt-2">
        <Label icon={UserPlus}>{copy.consent.sentTitle(who)}</Label>
        <blockquote lang="hi" className="deva mt-1.5 line-clamp-3 rounded-[6px] border-l-4 border-[#25D366] bg-black/[0.04] px-2 py-1 text-[13px] leading-[19px]">
          {preview}
        </blockquote>
        <p className="mt-1.5 text-[14px] leading-[19px]">{m.actionId ? copy.consent.actionBody(who) : copy.consent.sentBody(who)}</p>
        {status === 'given' ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-accent">
            <CircleCheck size={15} aria-hidden="true" />
            {copy.consent.given(who)}
          </p>
        ) : (
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-warning">
            <Hourglass size={15} aria-hidden="true" />
            {copy.consent.waiting(who)}
          </p>
        )}
        <Footer at={m.at} />
      </div>
      <ButtonRow>
        {status === 'waiting' && (
          <CardButton icon={Smartphone} strong onClick={() => showPhone('suresh')}>
            {copy.consent.showPhone(who)}
          </CardButton>
        )}
        <CardButton onClick={() => (m.actionId ? openInMunim(m.actionId) : openInMunim(undefined, 'trust'))}>{copy.openInMunim}</CardButton>
      </ButtonRow>
    </Bubble>
  )
}

/* ---------- Weekly brief ---------- */

export function BriefBubble({ m, tail }: { m: WeeklyBriefMessage; tail: boolean }) {
  return (
    <Bubble side="in" tail={tail} wide>
      <div className="px-2.5 pb-2 pt-2">
        <Label icon={CalendarDays}>{copy.brief.label}</Label>
        <p className="mt-0.5 text-[15px] font-semibold leading-snug">{m.title}</p>
        <ul className="mt-1 space-y-1 text-[14px] leading-[19px]">
          {m.lines.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <Footer at={m.at} left={copy.brief.footer} />
      </div>
      <ButtonRow>
        <CardButton onClick={() => openInMunim(undefined, 'home')}>{copy.brief.open}</CardButton>
      </ButtonRow>
    </Bubble>
  )
}

/* ---------- One message ---------- */

export function MessageView({ m, tail, onAction }: { m: Message; tail: boolean; onAction?: OnCardAction }) {
  switch (m.kind) {
    case 'text':
      return (
        <Bubble side={m.from === 'munim' ? 'in' : 'out'} tail={tail}>
          <TextBody text={m.text} at={m.at} ticks={m.from === 'munim' ? undefined : m.ticks} tickLabels={chat.ticks} />
        </Bubble>
      )
    case 'action':
      return <ActionCardBubble actionId={m.actionId} at={m.at} tail={tail} onAction={onAction} />
    case 'approval':
      return <ActionCardBubble actionId={m.actionId} at={m.at} tail={tail} approvalRequest onAction={onAction} />
    case 'receipt':
      return <ReceiptBubble m={m} tail={tail} />
    case 'consent':
      return <ConsentSentBubble m={m} tail={tail} />
    case 'brief':
      return <BriefBubble m={m} tail={tail} />
    case 'chips':
      return null
  }
}
