import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CircleCheck, Lock, ShieldCheck, X } from 'lucide-react'
import { useMunim } from '../store'
import { chatHi, fmtDateHi } from '../copy/chat'
import { useChat } from '../chat/chatStore'
import { ask, showPhone, tapChip } from '../chat/engine'
import { consentKey, consentStatus, giveConsent, type ConsentEvent } from '../chat/bridge'
import { facts } from '../chat/facts'
import { MessageView } from '../chat/ui/MessageViews'
import {
  Bubble,
  ChatHeader,
  Chips,
  Composer,
  Meta,
  MessageList,
  Notice,
  TextBody,
  TypingBubble,
  WA_META,
  richText,
  useAutoScroll,
} from '../chat/ui/ChatParts'
import type { ConsentRequestMessage, Message } from '../types'
import { CommentaryButton } from '../components/CommentarySheet'
import '../chat/chat.css'

/*
  Suresh's WhatsApp (SPEC 5.7, 9.2): the same look as Nikhil's, with Hindi UI strings in
  Noto Sans Devanagari. A consent request arrives in Hindi; "सहमति दें" opens the Account
  Aggregator page (or SBI's, for the FD) where he enters his OTP. The OTP is never typed
  into the chat. Approving calls onConsent (default: giveConsent, which approves the card or
  marks him consented, then flips the frame back to Nikhil's phone).
*/

interface Props {
  onConsent?: (e: ConsentEvent) => void
  /** The header's back arrow; default flips back to Nikhil's phone */
  onBack?: () => void
}

export function SureshFrame({ onConsent = giveConsent, onBack = () => showPhone('nikhil') }: Props) {
  const messages = useMunim((s) => s.messages)
  const typing = useChat((s) => s.typing.suresh)
  const thread = useMemo(() => messages.filter((m) => m.thread === 'suresh'), [messages])
  const last = thread[thread.length - 1]
  const chips = !typing && last?.kind === 'chips' ? last.chips : []
  const [sheet, setSheet] = useState<ConsentRequestMessage | null>(null)
  const [autoSheet, setAutoSheet] = useState(false)
  const autoConsent = useChat((s) => s.autoConsent)
  const scrollRef = useRef<HTMLDivElement>(null)
  useAutoScroll(scrollRef, `${thread.length}:${typing}:${chips.length}`)

  // Guided mode: Dad opens the request and types his OTP himself (demo/autoplay.ts asks).
  useEffect(() => {
    if (!autoConsent) return
    const m = thread.find((x): x is ConsentRequestMessage => x.id === autoConsent && x.kind === 'consent')
    if (!m) return
    useChat.getState().setAutoConsent(null)
    setAutoSheet(true)
    setSheet(m)
  }, [autoConsent, thread])

  const render = (m: Message, tail: boolean) => {
    if (m.kind === 'consent')
      return (
        <ConsentBubble
          m={m}
          tail={tail}
          onOpen={() => {
            setAutoSheet(false)
            setSheet(m)
          }}
        />
      )
    if (m.kind === 'text') {
      return (
        <Bubble side={m.from === 'munim' ? 'in' : 'out'} tail={tail}>
          <TextBody text={m.text} at={m.at} ticks={m.from === 'munim' ? undefined : m.ticks} tickLabels={chatHi.ticks} />
        </Bubble>
      )
    }
    return <MessageView m={m} tail={tail} />
  }

  return (
    <div lang="hi" className="deva relative flex h-full min-h-0 flex-col">
      <ChatHeader
        name={chatHi.contactName}
        avatar={chatHi.avatar}
        status={typing ? chatHi.typing : chatHi.online}
        verifiedLabel={chatHi.verified}
        onBack={onBack}
        backLabel={chatHi.back}
        action={<CommentaryButton tone="light" />}
      />
      <div className="wa-doodle flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} role="log" aria-label={chatHi.log} className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
          <div className="flex justify-center pt-2">
            <p lang="en" className="rounded-full bg-ink/75 px-3 py-1 font-sans text-[11.5px] font-medium text-white">
              {chatHi.demoLabel}
            </p>
          </div>
          <Notice>{chatHi.notice}</Notice>
          <MessageList messages={thread} dateLabel={fmtDateHi} render={render} />
          {typing && <TypingBubble label={chatHi.typingBubble} />}
        </div>
        <Chips chips={chips} label={chatHi.quickReplies} onTap={(c) => void tapChip(c, 'suresh')} />
        <Composer placeholder={chatHi.placeholder} inputLabel={chatHi.inputLabel} sendLabel={chatHi.send} onSend={(t) => void ask(t, 'suresh')} lang="hi" />
      </div>
      {sheet && (
        <ConsentSheet
          key={sheet.id}
          m={sheet}
          auto={autoSheet}
          onClose={() => setSheet(null)}
          onApproved={() => onConsent({ messageId: sheet.id, memberId: sheet.memberId, actionId: sheet.actionId })}
        />
      )}
    </div>
  )
}

/* ---------- The Hindi consent request in the chat ---------- */

function ConsentBubble({ m, tail, onOpen }: { m: ConsentRequestMessage; tail: boolean; onOpen: () => void }) {
  const actions = useMunim((s) => s.actions)
  const members = useMunim((s) => s.members)
  const given = useChat((s) => s.consentGiven)
  const done = consentStatus(m, { actions, members, given }) === 'given'
  const fd = Boolean(m.actionId)
  const c = chatHi.consent

  return (
    <Bubble side="in" tail={tail} wide lang="hi">
      <div className="px-1.5 pt-1.5">
        <div className="flex items-center gap-2.5 rounded-[6px] bg-[#F0F2F5] p-2">
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#1E3A5F] text-white">
            <ShieldCheck size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold">{fd ? c.fdLinkTitle : c.linkTitle}</p>
            <p className={`truncate text-[12px] ${WA_META}`}>{fd ? c.fdLinkSub(facts.suresh.fd.principal) : c.linkSub}</p>
          </div>
        </div>
      </div>
      <div className="px-2.5 pb-2 pt-1.5">
        <p className="whitespace-pre-wrap text-[14.5px] leading-[21px]">{richText(m.text)}</p>
        {!fd && m.scopes.length > 0 && (
          <div className="mt-1.5">
            <p className={`text-[12.5px] font-semibold ${WA_META}`}>{c.scopesTitle}</p>
            <ul className="mt-0.5 space-y-0.5 text-[13.5px]">
              {m.scopes.map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <CircleCheck size={13} aria-hidden="true" className="shrink-0 text-accent" />
                  {c.scopes[s] ?? s}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-1 flex justify-end">
          <Meta at={m.at} tickLabels={chatHi.ticks} />
        </div>
      </div>
      <div className="border-t border-black/10">
        {done ? (
          <p className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[14.5px] font-medium text-accent">
            <CircleCheck size={17} aria-hidden="true" />
            {c.given}
          </p>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="flex w-full items-center justify-center gap-1.5 px-3 py-2.5 text-[14.5px] font-semibold text-wa-link transition-colors hover:bg-black/[0.03] active:bg-black/[0.06]"
          >
            <Lock size={16} aria-hidden="true" />
            {fd ? c.openFd : c.open}
          </button>
        )}
      </div>
    </Bubble>
  )
}

/* ---------- The Account Aggregator (or SBI) page with the OTP ---------- */

/** The OTP Dad "types" in guided mode, one digit at a time */
const AUTO_OTP = '482916'
const AUTO_DIGIT_MS = 140

function ConsentSheet({ m, auto = false, onClose, onApproved }: { m: ConsentRequestMessage; auto?: boolean; onClose: () => void; onApproved: () => void }) {
  const [otp, setOtp] = useState('')
  const [approved, setApproved] = useState(false)
  const fd = Boolean(m.actionId)
  const s = chatHi.sheet
  const ready = /^\d{6}$/.test(otp)
  const alreadyGiven = useChat((st) => Boolean(st.consentGiven[consentKey(m)]))
  const handlers = useRef({ onApproved, onClose })
  useEffect(() => {
    handlers.current = { onApproved, onClose }
  })

  // Guided mode: the OTP fills in digit by digit, then he approves.
  useEffect(() => {
    if (!auto) return
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i <= AUTO_OTP.length; i++) timers.push(setTimeout(() => setOtp(AUTO_OTP.slice(0, i)), 300 + i * AUTO_DIGIT_MS))
    timers.push(setTimeout(() => setApproved(true), 300 + (AUTO_OTP.length + 3) * AUTO_DIGIT_MS))
    return () => timers.forEach(clearTimeout)
  }, [auto])

  // After "मंज़ूर हो गया", hand over and close
  useEffect(() => {
    if (!approved) return
    const t = setTimeout(() => {
      // Given meanwhile (the guided demo can hand it over directly): just close.
      if (!useChat.getState().consentGiven[consentKey(m)]) handlers.current.onApproved()
      handlers.current.onClose()
    }, 900)
    return () => clearTimeout(t)
  }, [approved, m])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (ready && !approved && !alreadyGiven) setApproved(true)
  }

  const fdRows = s.fdRows({
    principal: facts.suresh.fd.principal,
    rate: facts.suresh.fd.rate,
    maturesOn: facts.suresh.fd.maturesOn,
    senior: facts.suresh.seniorFdRate,
    extra: Math.round(facts.suresh.fd.principal * (facts.suresh.seniorFdRate - facts.suresh.fd.rate)),
  })
  const rows = fd
    ? fdRows
    : [
        { label: s.rows.accounts, value: s.rows.accountsValue },
        { label: s.rows.purpose, value: s.rows.purposeValue },
        { label: s.rows.duration, value: s.rows.durationValue },
        { label: s.rows.frequency, value: s.rows.frequencyValue },
      ]
  const titleId = `consent-sheet-${m.id}`

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        className="wa-sheet overflow-hidden rounded-t-[20px] bg-white text-ink"
        style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
      >
        <div className="flex items-center justify-between bg-[#1E3A5F] px-4 py-2.5 text-white">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Lock size={14} aria-hidden="true" />
            <span lang="en">{fd ? s.bankHeader : s.aaHeader}</span>
            <span className="font-normal text-white/80">· {s.secure}</span>
          </p>
          <button type="button" onClick={onClose} aria-label={s.close} className="on-dark rounded-full p-1 hover:bg-white/10">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {approved ? (
          <div role="status" className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <CircleCheck size={44} aria-hidden="true" className="text-accent" />
            <p className="text-[18px] font-semibold">{s.approved}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="px-4 pb-4 pt-3">
            <h2 id={titleId} className="text-[17px] font-semibold">
              {fd ? s.fdTitle : s.aaTitle}
            </h2>
            <dl className="mt-2 divide-y divide-line rounded-[10px] border border-line text-[13.5px]">
              {rows.map((r) => (
                <div key={r.label} className="flex justify-between gap-3 px-3 py-2">
                  <dt className="shrink-0 text-muted">{r.label}</dt>
                  <dd className="num text-right font-medium">{r.value}</dd>
                </div>
              ))}
            </dl>
            {!fd && <p className="mt-2 text-[12.5px] text-muted">{s.revoke}</p>}

            <label className="mt-3 block">
              <span className="text-[13.5px] font-semibold">{s.otpLabel}</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="num mt-1 block w-full rounded-[10px] border border-line bg-bg px-3 py-2.5 text-center text-[22px] font-semibold tracking-[0.5em] text-ink focus:border-[#1E3A5F]"
                aria-describedby={`${titleId}-hint`}
              />
            </label>
            <p id={`${titleId}-hint`} className="mt-1 text-[12.5px] text-muted">
              {fd ? s.otpHintBank : s.otpHintAa}
            </p>

            <button
              type="submit"
              disabled={!ready}
              className="mt-3 w-full rounded-button bg-[#1E3A5F] py-3 text-[15px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
            >
              {s.approve}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
