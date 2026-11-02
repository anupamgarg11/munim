/*
  The demo runner (SPEC 9.1): Next, Back, Reset, goTo, Skip wait and the URL hash.

    next()       the next moment, live (typing and delays). Pressed while one is still
                 playing, it first fast-forwards that one (nothing you did is lost). In guided
                 mode (not Free explore) it first plays the current moment's default path
                 through, visibly (demo/autoplay.ts settleMoment), so a viewer who only
                 presses Next sees every card signed and done. Moment 1 plays its onboarding
                 itself. Pressed again while that is under way, it rushes it.
    goTo(n)      rebuild from scratch: reset, replay moments 1..n-1 instantly on their default
                 path (cards approved, holds skipped), then moment n instantly with its cards
                 left for you. Keeps the surface and tab you were on.
    back()       goTo(moment - 1)
    reset()      moment 0, before onboarding (store.reset and resetChat); leaves Free explore
    skipWait()   every held card runs now (store.skipWait)
    completeOnboarding()  the app's onboarding finished: connected, Money tab, the reveal

  Every move sets the demo clock to the moment's date and time and runs the scheduled cards
  that have come due (card bills on their dates). Operations queue, so double clicks are safe.

  URL hash: lib/hash.ts writes #m=4&s=app&t=money from the store and applies a pasted or
  edited one with setMoment. The runner owns the moment: when anything else changes it, the
  runner rebuilds to that moment (so a link opens with the story played up to it).
*/
import { useMunim } from '../store'
import { resetChat, runIntentMatcher, setChipHandler, setHurry, whenIdle } from '../chat/engine'
import { m1 } from '../copy/moments'
import { clockMoved, disposeWatchers, makeContext, settleDefault, stamp, type MomentDef } from './kit'
import { getMoment, lastMoment, moments, revealSteps } from './moments'
import { playOnboarding, setRunnerBusy, settleMoment, startDirector, stopOnboarding } from './autoplay'
import { useDemo } from './state'

let chain: Promise<unknown> = Promise.resolve()
/** The moment playing live, if any */
let live: Promise<unknown> | null = null
/** The runner is moving the moment itself (so the store subscription below ignores it) */
let moving = false
/** Operations queued or running */
let ops = 0

function enqueue(fn: () => Promise<void>): Promise<void> {
  ops++
  setRunnerBusy(true)
  const run = async () => {
    // A fresh operation plays at normal speed (an earlier one may have been rushed).
    setHurry(false)
    try {
      await fn()
    } finally {
      ops--
      if (ops === 0) setRunnerBusy(false)
    }
  }
  const p = chain.then(run, run).catch((err) => console.error('Demo runner', err))
  chain = p
  return p
}

/** A viewer's request (Next, Back, Reset): rush whatever is under way, then queue it. */
function request(fn: () => Promise<void>): Promise<void> {
  if (ops > 0) setHurry(true)
  return enqueue(fn)
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

/** Clock to the moment's time (Sunday's brief lands if it passed), run what has come due, set the moment */
function enter(def: MomentDef) {
  const from = st().clock
  const to = stamp(def.date, def.time)
  st().setClock(to)
  clockMoved(from, to)
  st().runDueActions()
  quietly(() => st().setMoment(def.n))
}

function track(p: Promise<unknown>) {
  live = p
  void p.finally(() => {
    if (live === p) live = null
  })
}

/** Finish the live moment and anything still typing now: every wait ends at once, nothing is skipped. */
async function fastForward() {
  setHurry(true)
  try {
    if (live) await live
    await whenIdle()
  } finally {
    setHurry(false)
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
  return request(async () => {
    await fastForward()
    const def = getMoment(st().moment + 1)
    if (!def) return
    // Guided mode: the current moment's default path first, so nothing is left unsigned.
    if (!st().freeExplore) await settleMoment()
    enter(def)
    const run = def.run(makeContext(def, false)).catch((err) => console.error(`Moment ${def.n}`, err))
    // Moment 1 in guided mode: the onboarding steps itself until the viewer takes over.
    const onboarding = def.n === 1 && !st().freeExplore && !st().connected ? playOnboarding() : Promise.resolve()
    track(Promise.all([run, onboarding]))
  })
}

export function goTo(n: number, opts: { keepView?: boolean; leaveFreeExplore?: boolean } = {}): Promise<void> {
  stopOnboarding()
  return request(async () => {
    if (opts.leaveFreeExplore) st().setFreeExplore(false)
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

export const reset = (): Promise<void> => goTo(0, { keepView: false, leaveFreeExplore: true })

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

// Guided mode for an idle viewer: primary chips tapped, Dad approving on his phone.
startDirector()

// The hash (or anything else) moved the moment: rebuild the story to it. Deferred so a
// hash applies its surface and tab first, which the rebuild keeps.
useMunim.subscribe((s, prev) => {
  if (moving || s.moment === prev.moment) return
  const target = s.moment
  queueMicrotask(() => void goTo(target))
})
