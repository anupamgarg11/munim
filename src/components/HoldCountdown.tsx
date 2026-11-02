import { useSyncExternalStore } from 'react'
import { Clock, FastForward } from 'lucide-react'
import { useMunim } from '../store'
import { fmtCountdown } from '../lib/actions'
import { buttons, countdown, states, toasts } from '../copy/cards'

/*
  One shared one-second clock for every countdown on screen, so the WhatsApp card and the
  app card always show the same second. The interval only runs while something listens.
*/
const listeners = new Set<() => void>()
let nowMs = Date.now()
let interval: ReturnType<typeof setInterval> | null = null

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  // React re-reads the snapshot right after subscribing, so a fresh mount never shows a stale second.
  nowMs = Date.now()
  if (!interval) {
    nowMs = Date.now()
    interval = setInterval(() => {
      nowMs = Date.now()
      listeners.forEach((l) => l())
    }, 1000)
  }
  return () => {
    listeners.delete(onChange)
    if (listeners.size === 0 && interval) {
      clearInterval(interval)
      interval = null
    }
  }
}

/** Wall-clock ms, updated once a second while mounted */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => nowMs, () => nowMs)
}

interface Props {
  /** The held card's id */
  id: string
  /** Hide the demo-only Skip wait */
  hideSkip?: boolean
  /** Tighter layout for compact cards */
  compact?: boolean
}

/** "Runs in 09:41" from holdEndsAt, ticking each second, with Cancel and (demo) Skip wait. */
export function HoldCountdown({ id, hideSkip = false, compact = false }: Props) {
  const card = useMunim((s) => s.actions.find((a) => a.id === id))
  const cancelAction = useMunim((s) => s.cancelAction)
  const skipWait = useMunim((s) => s.skipWait)
  const showToast = useMunim((s) => s.showToast)
  const now = useNow()

  if (!card || card.status !== 'held' || card.holdEndsAt === undefined) return null

  // The shared clock can lag a just-started hold by up to a second; never show more than the hold.
  const totalMs = Math.max(1, card.holdMinutes * 60_000)
  const leftMs = Math.min(totalMs, Math.max(0, card.holdEndsAt - now))
  const mmss = fmtCountdown(leftMs)
  const pct = Math.round((leftMs / totalMs) * 100)

  const onCancel = () => {
    cancelAction(id)
    showToast(card.cancelNote ?? toasts.cancelled, { tone: 'info' })
  }

  return (
    <div className={`rounded-button border border-warning/25 bg-warning/5 ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-warning">
          <Clock size={16} aria-hidden="true" />
          <span role="timer" aria-label={`${countdown.label}: ${mmss}`} className="num">
            {countdown.runsIn(mmss)}
          </span>
        </p>
        <div className="flex items-center gap-1.5">
          {!hideSkip && (
            <button
              type="button"
              onClick={() => skipWait(id)}
              className="inline-flex items-center gap-1 rounded-button px-2 py-1.5 text-xs font-medium text-muted hover:bg-card hover:text-ink"
            >
              <FastForward size={14} aria-hidden="true" />
              {buttons.skipWait}
              <span className="rounded bg-line px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-muted">{states.demoTag}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-button border border-negative/30 bg-card px-3 py-1.5 text-sm font-semibold text-negative hover:bg-negative/5"
          >
            {buttons.cancel}
          </button>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="mt-2 h-1 overflow-hidden rounded-full bg-warning/15"
      >
        <div className="h-full rounded-full bg-warning transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      {!compact && <p className="mt-1.5 text-xs text-muted">{countdown.cancelHint}</p>}
    </div>
  )
}
