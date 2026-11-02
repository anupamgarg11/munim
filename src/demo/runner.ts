/*
  The demo runner (SPEC 9.1): Next, Back, Reset, goTo, Skip wait and the URL hash.

    next()       the next moment, live (typing and delays). Pressed while one is still
                 playing, it first fast-forwards that one (nothing you did is lost).
    goTo(n)      rebuild from scratch: reset, replay moments 1..n-1 instantly on their default
                 path (cards approved, holds skipped), then moment n instantly with its cards
                 left for you. Keeps the surface and tab you were on.
    back()       goTo(moment - 1)
    reset()      moment 0, before onboarding (store.reset and resetChat)
    skipWait()   every held card runs now (store.skipWait)
    completeOnboarding()  the app's onboarding finished: connected, Money tab, the reveal

  Every move sets the demo clock to the moment's date and time and runs the scheduled cards
  that have come due (card bills on their dates). Operations queue, so double clicks are safe.

  URL hash: lib/hash.ts writes #m=4&s=app&t=money from the store and applies a pasted or
  edited one with setMoment. The runner owns the moment: when anything else changes it, the
  runner rebuilds to that moment (so a link opens with the story played up to it).
*/
import { useMunim } from '../store'
import { configureEngine, engineConfig, resetChat, runIntentMatcher, setChipHandler } from '../chat/engine'
import { m1 } from '../copy/moments'
import { disposeWatchers, makeContext, settleDefault, stamp, type MomentDef } from './kit'
import { getMoment, lastMoment, moments, revealSteps } from './moments'
import { useDemo } from './state'

let chain: Promise<unknown> = Promise.resolve()
/** The moment playing live, if any */
let live: Promise<unknown> | null = null
/** The runner is moving the moment itself (so the store subscription below ignores it) */
let moving = false

function enqueue(fn: () => Promise<void>): Promise<void> {
  const p = chain.then(fn, fn).catch((err) => console.error('Demo runner', err))
  chain = p
  return p
}

const st = () => useMunim.getState()

function quietly(fn: () => void) {
  moving = true
  try {
    fn()
  } finally {
    moving = false
  }
}

/** Clock to the moment's time, run what has come due, set the moment */
function enter(def: MomentDef) {
  st().setClock(stamp(def.date, def.time))
  st().runDueActions()
  quietly(() => st().setMoment(def.n))
}

function track(p: Promise<unknown>) {
  live = p
  void p.finally(() => {
    if (live === p) live = null
  })
}

/** Finish the live moment now: no typing, no gaps, then restore the timing. */
async function fastForward() {
  if (!live) return
  const saved = { typingMs: engineConfig.typingMs, gapMs: engineConfig.gapMs }
  configureEngine({ typingMs: 0, gapMs: 0 })
  try {
    await live
  } finally {
    configureEngine(saved)
  }
}

/** Everything back to moment 0, then the story replayed up to `target` */
async function rebuild(target: number) {
  live = null
  disposeWatchers()
  resetChat()
  quietly(() => st().reset())
  useDemo.getState().resetDemo()
  for (const def of moments) {
    if (def.n > target) break
    enter(def)
    const ctx = makeContext(def, true)
    await def.run(ctx)
    if (def.n < target) await (def.settle ?? settleDefault)(ctx)
    // Let watchers (scheduled on microtasks) finish before the next moment reads the store.
    await Promise.resolve()
  }
  quietly(() => st().setMoment(target))
}

/* ---------- Public ---------- */

export function next(): Promise<void> {
  return enqueue(async () => {
    await fastForward()
    const def = getMoment(st().moment + 1)
    if (!def) return
    enter(def)
    track(def.run(makeContext(def, false)).catch((err) => console.error(`Moment ${def.n}`, err)))
  })
}

export function goTo(n: number, opts: { keepView?: boolean } = {}): Promise<void> {
  return enqueue(async () => {
    const keepView = opts.keepView ?? true
    const { surface, tab } = st()
    await rebuild(Math.max(0, Math.min(Math.round(n), lastMoment())))
    if (keepView) {
      st().setSurface(surface)
      st().setTab(tab)
    }
  })
}

export const back = (): Promise<void> => goTo(st().moment - 1)

export const reset = (): Promise<void> => goTo(0, { keepView: false })

export const skipWait = () => st().skipWait()

export const hasNext = (moment: number) => getMoment(moment + 1) !== undefined

/** The onboarding in the app finished: this is moment 1's reveal. */
export function completeOnboarding(): Promise<void> {
  return enqueue(async () => {
    if (st().connected) return
    const def = getMoment(1)
    if (!def) return
    if (st().moment < 1) enter(def)
    st().setConnected(true)
    st().setTab('money')
    track(makeContext(def, false).play(revealSteps()))
  })
}

/* ---------- Wiring ---------- */

// "Show me" after the reveal plays moment 2; anywhere else it is an ordinary question.
setChipHandler(m1.showMe, ({ label, thread }) => {
  if (st().moment === 1) void next()
  else void runIntentMatcher(label, thread)
})

// The hash (or anything else) moved the moment: rebuild the story to it. Deferred so a
// hash applies its surface and tab first, which the rebuild keeps.
useMunim.subscribe((s, prev) => {
  if (moving || s.moment === prev.moment) return
  const target = s.moment
  queueMicrotask(() => void goTo(target))
})
