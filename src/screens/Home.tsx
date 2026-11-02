import { Fragment, type ReactNode } from 'react'
import { CalendarClock, ChevronRight, CircleCheck } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { ScreenTitle } from '../components/ScreenTitle'
import { ScreenShell } from '../components/ScreenShell'
import { ScreenActionLink } from '../components/ScreenActionLink'
import { FoundCounter } from '../components/FoundCounter'
import { ScreenCard, ScreenSection, ScreenTag } from '../components/ScreenParts'
import { tabs } from '../copy/shell'
import { actionTypeLabel, common, homeCopy } from '../copy/screens'
import * as P from '../data/persona'
import { fmtDate, fmtINR, fmtTime } from '../lib/format'
import { useMunim } from '../store'
import type { ActionCard, Message } from '../types'
import { latestMunim, nextBriefAt, sameDay, upNext } from './selectors'
import { openAction } from './uiStore'
import { useActionStatusLine } from './useNow'
import { earned, impactText } from '../copy/cards'
import { isMoneyCard } from '../lib/actions'

const personName = (id: string) => (P.people as Record<string, { name: string }>)[id]?.name ?? id

/** One line for a Munim message, for the "latest" summary. */
function oneLine(m: Message, byId: Map<string, ActionCard>): { text: string; actionId?: string } {
  switch (m.kind) {
    case 'text':
      return { text: m.text }
    case 'action':
      return { text: byId.get(m.actionId)?.title ?? m.actionId, actionId: m.actionId }
    case 'approval':
      return { text: homeCopy.needsApproval(byId.get(m.actionId)?.title ?? m.actionId), actionId: m.actionId }
    case 'receipt':
      return { text: homeCopy.receiptLine(m.receipt.what), actionId: m.actionId }
    case 'consent':
      return { text: homeCopy.consentSent(personName(m.memberId)), actionId: m.actionId }
    case 'brief':
      return { text: m.title }
    case 'chips':
      return { text: m.chips.join(' · ') }
  }
}

/** SPEC 3.1: latest in the thread, Found this year, Up next, the weekly brief, the full thread. */
export function HomeScreen() {
  const messages = useMunim((s) => s.messages)
  const actions = useMunim((s) => s.actions)
  const clock = useMunim((s) => s.clock)

  const byId = new Map(actions.map((a) => [a.id, a]))
  const latest = latestMunim(messages)
  const next = upNext(actions)
  const thread = messages.filter((m) => m.thread === 'nikhil')
  // The latest brief that has gone out by now (SPEC 1.7: Sundays, 6 pm); before the first, when it comes.
  const lastBrief = [...thread].reverse().find((m) => m.kind === 'brief' && new Date(m.at).getTime() <= new Date(clock).getTime())
  const brief = lastBrief && lastBrief.kind === 'brief' ? { when: homeCopy.briefWhen(fmtDate(lastBrief.at)), lines: lastBrief.lines } : null

  return (
    <ScreenShell>
      <ScreenTitle>{tabs.home}</ScreenTitle>

      {/* Latest in the chat */}
      <ScreenCard flush>
        <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">
          {homeCopy.latestOn(fmtDate(latest.length ? latest[latest.length - 1].at : clock))}
        </p>
        {latest.length === 0 ? (
          <p className="px-4 pb-3 text-sm text-muted">{homeCopy.latestEmpty}</p>
        ) : (
          <ul className="divide-y divide-line">
            {latest.map((m) => {
              const line = oneLine(m, byId)
              const body = (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{line.text}</span>
                  <span className="num shrink-0 text-xs text-muted">{fmtTime(m.at)}</span>
                </>
              )
              return (
                <li key={m.id}>
                  {line.actionId ? (
                    <button type="button" onClick={() => openAction(line.actionId!)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-bg">
                      {body}
                      <ChevronRight size={14} className="shrink-0 text-muted" aria-hidden="true" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </ScreenCard>

      {/* Found this year: item 3's counter, computed from done cards */}
      <FoundCounter />

      <ScreenSection title={homeCopy.upNext}>
        {next.length === 0 ? (
          <EmptyState>{homeCopy.upNextEmpty}</EmptyState>
        ) : (
          <ScreenCard flush>
            <ul className="divide-y divide-line">
              {next.map((a) => (
                <li key={a.id}>
                  <ScreenActionLink action={a} />
                </li>
              ))}
            </ul>
          </ScreenCard>
        )}
      </ScreenSection>

      <ScreenSection title={homeCopy.briefTitle} aside={brief?.when}>
        <ScreenCard>
          {brief ? (
            <ul className="flex flex-col gap-2">
              {brief.lines.map((l) => (
                <li key={l} className="flex gap-2 text-sm leading-snug text-ink">
                  <CalendarClock size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                  <span className="num">{l}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex gap-2 text-sm leading-snug">
              <CalendarClock size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="num font-medium text-ink">{homeCopy.briefNext(homeCopy.briefWhen(fmtDate(nextBriefAt(clock))))}</p>
                <p className="text-xs text-muted">{homeCopy.briefNextNote}</p>
              </div>
            </div>
          )}
        </ScreenCard>
      </ScreenSection>

      <ScreenSection title={homeCopy.thread}>
        <p className="-mt-1 px-1 text-xs text-muted">{homeCopy.threadNote}</p>
        {thread.length === 0 ? <EmptyState>{homeCopy.threadEmpty}</EmptyState> : <Thread messages={thread} byId={byId} />}
      </ScreenSection>
    </ScreenShell>
  )
}

function Thread({ messages, byId }: { messages: Message[]; byId: Map<string, ActionCard> }) {
  return (
    <ol className="flex flex-col gap-2">
      {messages.map((m, i) => {
        const newDay = i === 0 || !sameDay(messages[i - 1].at, m.at)
        return (
          <Fragment key={m.id}>
            {newDay && (
              <li className="num self-center rounded-full bg-card px-3 py-0.5 text-xs font-medium text-muted shadow-soft">{fmtDate(m.at)}</li>
            )}
            <li className={`flex ${m.from === 'munim' ? 'justify-start' : 'justify-end'}`}>
              <ThreadItem m={m} byId={byId} />
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}

function Bubble({ m, children }: { m: Message; children: ReactNode }) {
  const mine = m.from !== 'munim'
  return (
    <div
      className={`max-w-[85%] rounded-card px-3 py-2 text-sm leading-snug text-ink shadow-soft ${
        mine ? 'rounded-br-md bg-accent-soft' : 'rounded-bl-md bg-card'
      }`}
    >
      <span className="sr-only">{mine ? homeCopy.fromYou : homeCopy.fromMunim}: </span>
      {children}
      <span className="num mt-0.5 block text-right text-[11px] text-muted">{fmtTime(m.at)}</span>
    </div>
  )
}

function ThreadItem({ m, byId }: { m: Message; byId: Map<string, ActionCard> }) {
  switch (m.kind) {
    case 'text':
      return (
        <Bubble m={m}>
          <span className="whitespace-pre-line">{m.text}</span>
        </Bubble>
      )
    case 'consent':
      return (
        <Bubble m={m}>
          <span className="whitespace-pre-line">{m.text}</span>
        </Bubble>
      )
    case 'brief':
      return (
        <Bubble m={m}>
          <span className="block font-semibold">{m.title}</span>
          <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4">
            {m.lines.map((l) => (
              <li key={l} className="num">
                {l}
              </li>
            ))}
          </ul>
        </Bubble>
      )
    case 'chips':
      return <p className="w-full text-center text-xs text-muted">{homeCopy.quickReplies(m.chips)}</p>
    case 'receipt':
      return (
        <Bubble m={m}>
          <span className="flex items-start gap-2">
            <CircleCheck size={16} className="mt-0.5 shrink-0 text-positive" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block font-medium">{homeCopy.receiptLine(m.receipt.what)}</span>
              {m.receipt.amount !== undefined && <span className="num block">{fmtINR(m.receipt.amount)}</span>}
              <span className="num block text-xs text-muted">{homeCopy.receiptRef(m.receipt.rail, m.receipt.reference)}</span>
            </span>
          </span>
          <button type="button" onClick={() => openAction(m.actionId)} className="mt-1 text-xs font-medium text-accent hover:underline">
            {homeCopy.openCard}
          </button>
        </Bubble>
      )
    case 'action':
    case 'approval': {
      const a = byId.get(m.actionId)
      return a ? <ThreadCard a={a} m={m} approval={m.kind === 'approval'} /> : null
    }
  }
}

/** Rich card in the thread, compact: type, title, impact, status, View. */
function ThreadCard({ a, m, approval }: { a: ActionCard; m: Message; approval: boolean }) {
  const status = useActionStatusLine(a)
  return (
    <div className="w-[85%] rounded-card rounded-bl-md border border-line bg-card px-3 py-2.5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <ScreenTag tone="accent">{actionTypeLabel[a.type]}</ScreenTag>
        <span className="num text-[11px] text-muted">{fmtTime(m.at)}</span>
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-ink">{approval ? homeCopy.needsApproval(a.title) : a.title}</p>
      <p className="num mt-0.5 text-xs text-ink">{impactText(a.impact)}</p>
      {isMoneyCard(a) && <p className="mt-0.5 text-[11px] font-medium text-positive">{a.type === 'insure' ? earned.insure : earned.default}</p>}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className={`num min-w-0 truncate text-xs ${status.tone}`}>{status.text}</span>
        <button type="button" onClick={() => openAction(a.id)} className="flex shrink-0 items-center text-xs font-medium text-accent hover:underline">
          {common.view}
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
