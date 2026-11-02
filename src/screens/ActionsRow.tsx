/*
  Interim row for one action on the Actions timeline: title, why, impact, rail, approval,
  status. Item 3's full ActionCard (components/ActionCard.tsx: approve, PIN sheet, hold
  with Cancel, receipts) replaces this. It takes the same prop ({ card }) and handles the
  deep-link pulse itself, so the swap is the one import in Actions.tsx.
*/
import { useEffect, useRef } from 'react'
import * as P from '../data/persona'
import { fmtINR } from '../lib/format'
import { useMunim } from '../store'
import type { ActionCard, Impact } from '../types'
import { actionLine, actionTypeLabel, approvalLabel, common } from '../copy/screens'
import { ScreenTag } from '../components/ScreenParts'
import { useActionStatusLine } from './useNow'

const memberName = (id?: string) => (id ? (P.people as Record<string, { name: string }>)[id]?.name : undefined)

export function impactText(i: Impact): string {
  if (i.label) return i.label
  if (i.per === 'year') return common.perYear(fmtINR(i.amount))
  if (i.per === 'now') return common.now(fmtINR(i.amount))
  return actionLine.impactNone
}

export function ActionsRow({ card }: { card: ActionCard }) {
  const status = useActionStatusLine(card)
  const highlighted = useMunim((s) => s.highlightedActionId === card.id)
  const ref = useRef<HTMLElement>(null)

  // Deep link ("Open in Munim", "View"): bring the card into view while it is highlighted.
  useEffect(() => {
    if (!highlighted) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ref.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [highlighted])

  const facts: [string, string][] = [
    [actionLine.impact, impactText(card.impact)],
    [actionLine.rail, card.railDetail ?? card.rail],
    [actionLine.approval, card.approvalDetail ?? approvalLabel[card.approval](memberName(card.approverMemberId))],
  ]
  return (
    <article
      ref={ref}
      className={`rounded-card bg-card p-4 shadow-soft transition-shadow duration-300 ${highlighted ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <ScreenTag tone="accent">{actionTypeLabel[card.type]}</ScreenTag>
        <p className={`num text-right text-xs font-medium ${status.tone}`}>{status.text}</p>
      </div>
      <h3 className="mt-2 text-[15px] font-semibold leading-snug text-ink">{card.title}</h3>
      <p className="mt-1 text-sm leading-snug text-muted">{card.why}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="num text-right font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {card.alsoConsidered && (
        <p className="mt-3 border-t border-line pt-2 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-ink">{actionLine.alsoConsidered}: </span>
          {card.alsoConsidered}
        </p>
      )}
      <p className="num mt-2 text-xs text-muted">{common.earned(fmtINR(card.earned))}</p>
    </article>
  )
}
