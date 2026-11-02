/*
  The contract between the demo runner (runner.ts) and the moment scripts (moments.ts for
  1 to 4, moments5to8.ts for 5 to 8), plus helpers both use. Moment files import from here,
  never from runner.ts or moments.ts, so there is no import cycle.

  A moment's run(ctx):
    - finds the clock already set to its date and time, due scheduled cards already run,
      and the store's moment already set (the runner does all three);
    - plays its WhatsApp script with ctx.play (instant when replaying);
    - creates its cards with proposeAction or upsertAction, each money card declaring
      `effects`, every number computed from the live persona (useMunim.getState().persona).
  settle(ctx), optional: the default path when replaying past the moment (Back, a link).
  Without it the runner approves every proposed card, skips holds and completes runs.
*/
import { useMunim, type MunimState } from '../store'
import { play, type ScriptStep } from '../chat/engine'
import { addMinutes } from '../lib/actions'
import { istParts } from '../lib/format'
import type { ActionCard, ApprovalVia, ISODate, ISODateTime, Moment } from '../types'

/* ---------- Contract ---------- */

/** SPEC 7: three lines per moment */
export interface Commentary {
  principle: string
  edge: string
  metric: string
}

export interface MomentContext {
  n: Moment
  /** Replaying (Back, a link, Next pressed mid-moment): no typing, no delays. */
  instant: boolean
  /** The moment's time stamp (its date and time in IST) */
  at: ISODateTime
  /** chat/engine play() with this moment's instant flag; resolves false if cancelled */
  play: (steps: ScriptStep[]) => Promise<boolean>
  /** The main store, now */
  store: () => MunimState
}

export interface MomentDef {
  n: Moment
  /** IST calendar day, e.g. '2026-11-06' */
  date: ISODate
  /** IST wall clock, 24 h, e.g. '09:40' */
  time: string
  /** Short title (the demo bar uses copy/shell momentTitles) */
  title: string
  commentary: Commentary
  run: (ctx: MomentContext) => Promise<void>
  settle?: (ctx: MomentContext) => void | Promise<void>
}

export function makeContext(def: MomentDef, instant: boolean): MomentContext {
  return {
    n: def.n,
    instant,
    at: stamp(def.date, def.time),
    play: (steps) => play(steps, { instant }),
    store: () => useMunim.getState(),
  }
}

/* ---------- Time (IST) ---------- */

/** '2026-10-30', '00:14' -> '2026-10-30T00:14:00+05:30' */
export const stamp = (date: ISODate, time: string): ISODateTime => `${date}T${time}:00+05:30`

/** The IST calendar day of a time, '2026-10-30' */
export function dayOf(at: ISODateTime): ISODate {
  const p = istParts(at)
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export const addDays = (at: ISODateTime, days: number): ISODateTime => addMinutes(at, days * 24 * 60)

const isWeekend = (at: ISODateTime) => {
  const w = istParts(at).weekday
  return w === 0 || w === 6
}

/** n working days later (weekends skipped) */
export function addWorkingDays(at: ISODateTime, n: number): ISODateTime {
  let d = at
  let left = n
  while (left > 0) {
    d = addDays(d, 1)
    if (!isWeekend(d)) left--
  }
  return d
}

/** Mutual fund units: the next working day if ordered before the 3 pm cut-off, else the one after */
export function unitsBy(at: ISODateTime, extraDays = 0): ISODateTime {
  return addWorkingDays(at, (istParts(at).hour < 15 ? 1 : 2) + extraDays)
}

/** The next time `dayOfMonth` comes round, strictly after `at` (SIP dates) */
export function nextDayOfMonth(at: ISODateTime, dayOfMonth: number, time = '09:00'): ISODateTime {
  const p = istParts(at)
  const month = p.day < dayOfMonth ? p.month : p.month + 1
  const d = new Date(Date.UTC(p.year, month, dayOfMonth))
  return stamp(d.toISOString().slice(0, 10), time)
}

/** The last working day of the month after `at` (the next salary, SPEC 2) */
export function nextSalaryDay(at: ISODateTime, time = '00:14'): ISODateTime {
  const p = istParts(at)
  let d = new Date(Date.UTC(p.year, p.month + 2, 0))
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d = new Date(d.getTime() - 86_400_000)
  return stamp(d.toISOString().slice(0, 10), time)
}

/* ---------- Default path (Back, links) ---------- */

/** How the default path signs a card */
export function viaFor(card: ActionCard): ApprovalVia {
  switch (card.approval) {
    case 'pin':
      return 'pin'
    case 'tap':
      return 'tap'
    case 'none':
      return 'rule'
    case 'member-consent':
      return 'member'
  }
}

/** Approve every proposed card, skip every hold, finish every run now. Scheduled cards wait. */
export function settleDefault() {
  const st = () => useMunim.getState()
  for (const a of st().actions) if (a.status === 'proposed') st().approveAction(a.id, viaFor(a))
  st().skipWait()
  for (const a of st().actions) {
    if (a.status === 'running' || (a.status === 'approved' && !a.scheduledFor)) st().completeAction(a.id)
  }
}

/* ---------- Guided mode: what the demo may do for the viewer ---------- */

/**
 * Chip messages (by message id) whose first chip is the moment's primary step. In guided
 * mode (not Free explore) the demo taps it for the viewer when they press Next, or after a
 * few idle seconds (demo/autoplay.ts). Moments register their ids on import.
 */
export const autoChips = new Set<string>()

/**
 * Chips that themselves advance the story (moment 1's "Show me" plays moment 2). Next never
 * taps these, since Next advances anyway; the idle timer may.
 */
export const advancingChips = new Set<string>()

/** Called when the runner moves the demo clock forward: (from, to). The weekly brief uses it. */
type ClockHook = (from: ISODateTime, to: ISODateTime) => void
const clockHooks = new Set<ClockHook>()

export function onClockMove(fn: ClockHook): () => void {
  clockHooks.add(fn)
  return () => clockHooks.delete(fn)
}

export function clockMoved(from: ISODateTime, to: ISODateTime) {
  if (new Date(to).getTime() <= new Date(from).getTime()) return
  for (const fn of clockHooks) fn(from, to)
}

/* ---------- Watchers that the runner clears on Back and Reset ---------- */

const watchers = new Set<() => void>()

/**
 * Run fn once when card `id` becomes done (e.g. the buyback split schedules tranches 2 and
 * 3). Runs on the next microtask, outside the store update. Stops if the card is cancelled,
 * and on Back or Reset. Returns a stop function.
 */
export function whenDone(id: string, fn: (card: ActionCard) => void): () => void {
  let stopped = false
  const stop = () => {
    stopped = true
    unsubscribe()
    watchers.delete(stop)
  }
  const fire = () =>
    queueMicrotask(() => {
      if (stopped) return
      const card = useMunim.getState().actions.find((a) => a.id === id)
      stop()
      if (card?.status === 'done') fn(card)
    })
  const unsubscribe = useMunim.subscribe((s, prev) => {
    const card = s.actions.find((a) => a.id === id)
    if (!card) return
    if (card.status === 'done' && prev.actions.find((a) => a.id === id)?.status !== 'done') fire()
    else if (card.status === 'cancelled') stop()
  })
  watchers.add(stop)
  if (useMunim.getState().actions.find((a) => a.id === id)?.status === 'done') fire()
  return stop
}

/** Stop every watcher (the runner calls this before it rebuilds) */
export function disposeWatchers() {
  for (const stop of [...watchers]) stop()
}
