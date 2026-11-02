/*
  A ticking clock for hold countdowns, and the one-line status of an action
  (shared by Home's Up next, Money's related actions and the Actions rows).
*/
import { useEffect, useState } from 'react'
import { actionLine, common, statusLabel } from '../copy/screens'
import { fmtDateTime, fmtTime } from '../lib/format'
import type { ActionCard } from '../types'
import { clock } from './selectors'

/** Epoch ms, re-rendering every second while `active`. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [active])
  return now
}

export interface StatusLine {
  text: string
  /** Text colour class */
  tone: string
}

const trimStop = (s: string) => s.replace(/[.\s]+$/, '')

export function statusLine(a: ActionCard, now: number): StatusLine {
  switch (a.status) {
    case 'held': {
      if (a.holdEndsAt === undefined) return { text: statusLabel.held, tone: 'text-accent' }
      const left = a.holdEndsAt - now
      return { text: left > 0 ? actionLine.heldFor(clock(left)) : actionLine.heldEnding, tone: 'text-accent' }
    }
    case 'failed':
      return {
        text: a.failure ? actionLine.failed(trimStop(a.failure.reason), fmtTime(a.failure.retryAt)) : statusLabel.failed,
        tone: 'text-negative',
      }
    case 'proposed':
      return { text: statusLabel.proposed, tone: 'text-warning' }
    case 'approved': {
      if (a.scheduledFor) return { text: actionLine.scheduledFor(fmtDateTime(a.scheduledFor)), tone: 'text-muted' }
      const last = a.timeline[a.timeline.length - 1]
      return { text: last ? last.text : statusLabel.approved, tone: 'text-muted' }
    }
    case 'running':
      return { text: statusLabel.running, tone: 'text-accent' }
    case 'done': {
      const r = a.receipts[a.receipts.length - 1]
      return { text: r ? common.dot(statusLabel.done, fmtDateTime(r.at)) : statusLabel.done, tone: 'text-positive' }
    }
    case 'cancelled':
      return { text: statusLabel.cancelled, tone: 'text-muted' }
  }
}

export function useActionStatusLine(a: ActionCard): StatusLine {
  const now = useNow(a.status === 'held' && a.holdEndsAt !== undefined)
  return statusLine(a, now)
}
