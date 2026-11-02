/*
  Building blocks shared by Nikhil's and Suresh's WhatsApp frames: header, bubbles with
  tails, time and ticks, date dividers, the pinned notice, the typing bubble, quick-reply
  chips, the composer, and auto-scroll. WhatsApp colours come from the --wa-* tokens.
*/
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import { ArrowLeft, BadgeCheck, Camera, Check, CheckCheck, EllipsisVertical, Lock, Mic, Paperclip, Phone, SendHorizontal, Video } from 'lucide-react'
import { fmtTime, istParts } from '../../lib/format'
import type { Message, Ticks } from '../../types'

/** WhatsApp ink and meta greys (meta passes 4.5:1 on both bubble colours) */
export const WA_INK = 'text-[#111B21]'
export const WA_META = 'text-[#5B6B75]'

/* ---------- Header ---------- */

interface HeaderProps {
  name: string
  avatar: string
  status: string
  verifiedLabel: string
  /** When set, the back arrow is a real button (Suresh's frame: back to Nikhil's phone) */
  onBack?: () => void
  backLabel?: string
  /** A real button on the right, before the decorative icons (the phone layout's commentary "i") */
  action?: ReactNode
}

export function ChatHeader({ name, avatar, status, verifiedLabel, onBack, backLabel, action }: HeaderProps) {
  return (
    <header className="flex h-[60px] shrink-0 items-center gap-1.5 bg-wa-header px-2 text-white">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label={backLabel} className="on-dark -ml-1 rounded-full p-1 hover:bg-white/10">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
      ) : (
        <ArrowLeft size={22} aria-hidden="true" className="shrink-0" />
      )}
      <div aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-[15px] font-semibold ring-2 ring-white/20">
        {avatar}
      </div>
      <div className="min-w-0 flex-1 pl-1 leading-tight">
        <p className="flex items-center gap-1 text-[16px] font-semibold">
          <span className="truncate">{name}</span>
          <BadgeCheck size={16} className="shrink-0 fill-[#25D366] text-white" aria-hidden="true" />
          <span className="sr-only">{verifiedLabel}</span>
        </p>
        <p className="truncate text-[13px] text-white/85">
          {status}
        </p>
      </div>
      {action}
      <span aria-hidden="true" className="flex shrink-0 items-center gap-4 pr-1 text-white/95">
        <Video size={21} />
        <Phone size={19} />
        <EllipsisVertical size={20} />
      </span>
    </header>
  )
}

/* ---------- Bubbles ---------- */

function Tail({ side }: { side: 'in' | 'out' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 8 13"
      width="8"
      height="13"
      className={`absolute top-0 ${side === 'in' ? '-left-2 text-wa-in' : '-right-2 text-wa-out'}`}
    >
      <path fill="currentColor" d={side === 'in' ? 'M8 0H1.6C.4 0 0 1.3.9 2.2L8 11z' : 'M0 0h6.4c1.2 0 1.6 1.3.7 2.2L0 11z'} />
    </svg>
  )
}

interface BubbleProps {
  side: 'in' | 'out'
  /** First of a run from the same sender: draws the tail */
  tail: boolean
  /** Cards take more of the width */
  wide?: boolean
  children: ReactNode
  className?: string
  lang?: string
}

export function Bubble({ side, tail, wide = false, children, className = '', lang }: BubbleProps) {
  const corner = tail ? (side === 'in' ? 'rounded-tl-none' : 'rounded-tr-none') : ''
  return (
    <div className={`flex ${side === 'in' ? 'justify-start' : 'justify-end'} px-3`}>
      <div
        lang={lang}
        className={`wa-bubble relative min-w-[84px] rounded-[8px] ${corner} ${side === 'in' ? 'bg-wa-in' : 'bg-wa-out'} ${
          wide ? 'w-[86%]' : 'max-w-[82%]'
        } ${WA_INK} ${className}`}
      >
        {tail && <Tail side={side} />}
        {children}
      </div>
    </div>
  )
}

export function TickIcon({ ticks, labels }: { ticks: Ticks; labels: Record<Ticks, string> }) {
  const Icon = ticks === 'sent' ? Check : CheckCheck
  return (
    <span className="inline-flex">
      <Icon size={16} strokeWidth={2} aria-hidden="true" className={ticks === 'read' ? 'text-[#34B7F1]' : WA_META} />
      <span className="sr-only">{labels[ticks]}</span>
    </span>
  )
}

/** Time (and ticks on the person's own messages), bottom right of a bubble */
export function Meta({ at, ticks, tickLabels, className = '' }: { at: string; ticks?: Ticks; tickLabels: Record<Ticks, string>; className?: string }) {
  return (
    <span className={`num inline-flex items-center gap-1 text-[11px] leading-none ${WA_META} ${className}`}>
      <time dateTime={at}>{fmtTime(at)}</time>
      {ticks && <TickIcon ticks={ticks} labels={tickLabels} />}
    </span>
  )
}

/** Plain text with WhatsApp's *bold*, kept line breaks, and the time tucked into the last line */
export function TextBody({ text, at, ticks, tickLabels }: { text: string; at: string; ticks?: Ticks; tickLabels: Record<Ticks, string> }) {
  return (
    <div className="relative px-2 pb-1.5 pt-1.5 text-[14.5px] leading-[19px]">
      <span className="whitespace-pre-wrap break-words">{richText(text)}</span>
      <span aria-hidden="true" className={`inline-block ${ticks ? 'w-[74px]' : 'w-[58px]'}`} />
      <Meta at={at} ticks={ticks} tickLabels={tickLabels} className="absolute bottom-1.5 right-2" />
    </div>
  )
}

/** "*₹2,38,000*" -> bold, as in WhatsApp */
export function richText(text: string): ReactNode[] {
  return text.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.length > 2 && part.startsWith('*') && part.endsWith('*') ? (
      <strong key={i} className="font-semibold">
        {part.slice(1, -1)}
      </strong>
    ) : (
      part
    ),
  )
}

/* ---------- Dividers, notice, typing ---------- */

export function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-2" role="separator" aria-label={label}>
      <span className="num rounded-[7.5px] bg-[#E1F3FB] px-3 py-1 text-[12.5px] font-medium text-[#54656F] shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]">
        {label}
      </span>
    </div>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center px-6 py-2">
      <p className="flex items-start gap-1.5 rounded-[7.5px] bg-[#FFF3C4] px-3 py-1.5 text-center text-[12px] leading-snug text-[#54656F] shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]">
        <Lock size={12} aria-hidden="true" className="mt-[2px] shrink-0" />
        <span>{children}</span>
      </p>
    </div>
  )
}

export function TypingBubble({ label }: { label: string }) {
  return (
    <div className="wa-in-left pt-2">
      <Bubble side="in" tail>
        <div role="status" aria-label={label} className="flex h-[34px] items-center gap-1 px-3">
          <span className="wa-dot" />
          <span className="wa-dot" />
          <span className="wa-dot" />
        </div>
      </Bubble>
    </div>
  )
}

/* ---------- Chips and composer ---------- */

export function Chips({ chips, label, onTap }: { chips: string[]; label: string; onTap: (chip: string) => void }) {
  if (!chips.length) return null
  return (
    <div role="group" aria-label={label} className="animate-fade-in flex flex-wrap justify-center gap-1.5 px-2 pb-1.5">
      {chips.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onTap(c)}
          className="wa-bubble rounded-full bg-white px-3.5 py-1.5 text-[13.5px] font-medium text-wa-link transition-colors hover:bg-[#F5FBFF] active:bg-[#E9F5FC]"
        >
          {c}
        </button>
      ))}
    </div>
  )
}

interface ComposerProps {
  placeholder: string
  inputLabel: string
  sendLabel: string
  onSend: (text: string) => void
  lang?: string
}

/** Text field and the round send button. Empty shows the mic, as WhatsApp does; it focuses the field. */
export function Composer({ placeholder, inputLabel, sendLabel, onSend, lang }: ComposerProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const empty = text.trim() === ''

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (empty) {
      inputRef.current?.focus()
      return
    }
    onSend(text)
    setText('')
  }

  return (
    <form onSubmit={submit} className="flex shrink-0 items-end gap-1.5 px-1.5 pt-1" style={{ paddingBottom: 'calc(6px + var(--safe-bottom, 0px))' }}>
      <label className="wa-bubble flex min-h-[44px] min-w-0 flex-1 cursor-text items-center gap-2 rounded-full bg-white pl-4 pr-3 focus-within:ring-2 focus-within:ring-[#128C7E]/60">
        <span className="sr-only">{inputLabel}</span>
        <input
          ref={inputRef}
          lang={lang}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          enterKeyHint="send"
          autoComplete="off"
          className={`min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#5B6B75] ${WA_INK}`}
        />
        <Paperclip size={20} aria-hidden="true" className="shrink-0 -rotate-45 text-[#667781]" />
        {empty && <Camera size={20} aria-hidden="true" className="shrink-0 text-[#667781]" />}
      </label>
      <button
        type="submit"
        aria-label={sendLabel}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#128C7E] text-white shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition hover:brightness-110"
      >
        {empty ? <Mic size={20} aria-hidden="true" /> : <SendHorizontal size={20} aria-hidden="true" />}
      </button>
    </form>
  )
}

/* ---------- Scrolling ---------- */

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Keep the newest message in view whenever the key changes; jump (no animation) on first render. */
export function useAutoScroll(ref: RefObject<HTMLElement | null>, key: unknown) {
  const first = useRef(true)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (first.current) {
      first.current = false
      el.scrollTop = el.scrollHeight
      return
    }
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [ref, key])
}

/** Ids present when the list first rendered; only messages added later slide in */
export function useInitialIds(ids: string[]): Set<string> {
  const [initial] = useState(() => new Set(ids))
  return initial
}

/** Ticking clock for hold countdowns (only while a deadline is set) */
export function useRemainingMs(endsAt?: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!endsAt) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [endsAt])
  return endsAt ? Math.max(0, endsAt - now) : 0
}

/** 600000 -> "10:00"; rounds up so the last second shows 00:01 */
export function fmtMmSs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/* ---------- The message list ---------- */

const dayKey = (at: string) => {
  const p = istParts(at)
  return `${p.year}-${p.month}-${p.day}`
}

interface ListProps {
  messages: Message[]
  /** Date divider text for a message time ("Thu 29 Oct", or Hindi in Suresh's frame) */
  dateLabel: (at: string) => string
  render: (m: Message, tail: boolean) => ReactNode
}

/**
 * Messages with a date divider whenever the IST day changes, the tail on the first bubble
 * of each run from one sender, and a slide-in for messages that arrive while it is on screen.
 */
export function MessageList({ messages, dateLabel, render }: ListProps) {
  const initial = useInitialIds(messages.map((m) => m.id))
  const rows: ReactNode[] = []
  let prevDay = ''
  let prevFrom = ''
  for (const m of messages) {
    if (m.kind === 'chips') continue
    const day = dayKey(m.at)
    if (day !== prevDay) {
      rows.push(<DateDivider key={`day-${day}`} label={dateLabel(m.at)} />)
      prevDay = day
      prevFrom = ''
    }
    const tail = m.from !== prevFrom
    prevFrom = m.from
    const anim = initial.has(m.id) ? '' : m.from === 'munim' ? 'wa-in-left' : 'wa-in-right'
    rows.push(
      <div key={m.id} className={`${tail ? 'pt-2' : 'pt-0.5'} ${anim}`}>
        {render(m, tail)}
      </div>,
    )
  }
  return <>{rows}</>
}
