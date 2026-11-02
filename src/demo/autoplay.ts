/*
  Guided mode: the demo plays itself unless the viewer is in Free explore.

    settleMoment()     Next: the current moment's default path, visibly, before the next one
                       plays. Its primary chip is tapped (the car question, then "Set up a Car
                       fund"; "Invite Dad"), Dad approves on his own phone, cards he must sign
                       go to him, and every card Nikhil signs flips to Approved then Done, 400 ms
                       apart (PIN cards are approved with the UPI PIN). Held cards run.
    startDirector()    An idle viewer: a moment's primary chip is tapped 3 s after it appears,
                       Dad approves a request 2.5 s after it reaches his phone, and a card for
                       Dad goes to him 3 s after it appears. Any click or key restarts the wait.
    playOnboarding()   Moment 1: the onboarding steps itself (number, OTP, the promise, the AA
                       consent, Gmail, the 2 s progress). A click inside it hands it back.

  Every wait is the chat engine's, so Next pressed mid-way (hurry) rushes it, and Back or
  Reset (cancel) stops it. Nothing here runs in Free explore.
*/
import { useMunim } from '../store'
import { useChat } from '../chat/chatStore'
import { isHurrying, isPlaying, showPhone, tapChip, wait, whenIdle } from '../chat/engine'
import { consentKey, consentStatus, giveConsent, runCardCommand } from '../chat/bridge'
import { onboarding as onboardingCopy } from '../copy/moments'
import { advancingChips, autoChips, viaFor } from './kit'
import { useDemo } from './state'
import type { ActionCard, ChipsMessage, ConsentRequestMessage } from '../types'

/** Cards flip to Approved, then Done, this far apart */
const STAGGER_MS = 400
/** An idle viewer's primary chip is tapped after this */
const IDLE_MS = 3000
/** Dad approves a request this long after it reaches his phone */
const DAD_MS = 2500
/** Dad's frame flips back 1.1 s after he approves (chat/bridge) */
const FLIP_BACK_MS = 1300
/** Onboarding: about this long on each step */
const STEP_MS = 1200

const st = () => useMunim.getState()
const guided = () => !st().freeExplore
const find = (id: string) => st().actions.find((a) => a.id === id)

/** The runner is busy with Next, Back or Reset: the director leaves the story to it */
let runnerBusy = false
export const setRunnerBusy = (busy: boolean) => {
  runnerBusy = busy
}

/* ---------- What is waiting ---------- */

/** The thread's last message, when it is a chip message the demo may tap */
function pendingChip(includeAdvancing: boolean): ChipsMessage | null {
  const thread = st().messages.filter((m) => m.thread === 'nikhil')
  const last = thread[thread.length - 1]
  if (!last || last.kind !== 'chips' || !autoChips.has(last.id) || last.chips.length === 0) return null
  if (!includeAdvancing && advancingChips.has(last.id)) return null
  return last
}

/** The newest request in Dad's chat that he has not approved yet */
function waitingConsent(): ConsentRequestMessage | null {
  const s = st()
  const given = useChat.getState().consentGiven
  for (let i = s.messages.length - 1; i >= 0; i--) {
    const m = s.messages[i]
    if (m.thread === 'suresh' && m.kind === 'consent' && consentStatus(m, { actions: s.actions, members: s.members, given }) === 'waiting') return m
  }
  return null
}

/** A card for a member's OTP that has not gone to them yet ("Send to Dad") */
function unsentMemberCard(): ActionCard | null {
  const s = st()
  return (
    s.actions.find(
      (a) =>
        a.status === 'proposed' &&
        a.approval === 'member-consent' &&
        s.memberRequest?.actionId !== a.id &&
        !s.messages.some((m) => m.thread === 'suresh' && m.kind === 'consent' && m.actionId === a.id),
    ) ?? null
  )
}

/** Autopilot cards wait while the kill switch is on or their rule is off */
function paused(a: ActionCard): boolean {
  const s = st()
  const rule = s.rules.find((r) => r.id === a.ruleId)
  return a.approval === 'none' && (s.killSwitch || (rule !== undefined && !rule.enabled))
}

/** Cards Nikhil signs (tap or PIN) or Autopilot runs, and held cards */
const signable = (): ActionCard[] =>
  st().actions.filter((a) => (a.status === 'proposed' && a.approval !== 'member-consent' && !paused(a)) || a.status === 'held')

/* ---------- Doing it ---------- */

/** Let the chat finish, including follow-ups queued on timers (Dad's frame, the chip after an answer) */
async function quiet(): Promise<boolean> {
  await whenIdle()
  if (!(await wait(600))) return false
  await whenIdle()
  return true
}

/** Running cards finish (after their 1.5 s run, or at once when hurried) */
async function finishRuns(): Promise<boolean> {
  for (let i = 0; i < 60; i++) {
    const running = st().actions.filter((a) => a.status === 'running')
    if (running.length === 0) return true
    if (isHurrying()) {
      for (const a of running) st().completeAction(a.id)
      return true
    }
    if (!(await wait(100))) return false
  }
  return true
}

/** Sign every waiting card, one every 400 ms, then let each run to Done */
async function signAll(cards: ActionCard[]): Promise<boolean> {
  for (const [i, c] of cards.entries()) {
    if (i > 0 && !(await wait(STAGGER_MS))) return false
    const a = find(c.id)
    if (a?.status === 'proposed') st().approveAction(a.id, viaFor(a))
    if (find(c.id)?.status === 'held') st().skipWait(c.id)
  }
  return finishRuns()
}

/** Requests Dad is approving right now (Next and the idle timer share one approval) */
const approving = new Map<string, Promise<boolean>>()

/** Dad approves on his own phone: the request opens, his OTP fills in, then the frame flips back */
function dadApproves(m: ConsentRequestMessage, afterMs: number): Promise<boolean> {
  const running = approving.get(m.id)
  if (running) return running
  const p = approve(m, afterMs).finally(() => approving.delete(m.id))
  approving.set(m.id, p)
  return p
}

async function approve(m: ConsentRequestMessage, afterMs: number): Promise<boolean> {
  if (!(await wait(afterMs))) return false
  if (waitingConsent()?.id !== m.id) return true
  const key = consentKey(m)
  const event = { messageId: m.id, memberId: m.memberId, actionId: m.actionId }
  const given = () => Boolean(useChat.getState().consentGiven[key]) || waitingConsent()?.id !== m.id
  if (isHurrying()) giveConsent(event)
  else {
    // Make sure his phone is the one on screen (the phone layout may be on the app).
    showPhone('suresh')
    useChat.getState().setAutoConsent(m.id)
    for (let i = 0; i < 50 && !given(); i++) {
      if (!(await wait(100))) return false
      if (isHurrying() && !given()) giveConsent(event)
    }
    // His frame was not there to play it: hand it over directly.
    if (!given()) giveConsent(event)
  }
  return wait(FLIP_BACK_MS)
}

/** One step of the default path. False when nothing is left to do. */
async function step(): Promise<boolean> {
  const chip = pendingChip(false)
  if (chip) {
    await tapChip(chip.chips[0])
    return quiet()
  }
  const consent = waitingConsent()
  if (consent) {
    if (!(await dadApproves(consent, DAD_MS))) return false
    return quiet()
  }
  const member = unsentMemberCard()
  if (member) {
    runCardCommand(member.id, 'ask-member')
    return quiet()
  }
  const cards = signable()
  if (cards.length > 0) {
    const before = cards.map((a) => a.status).join()
    if (!(await signAll(cards))) return false
    return cards.map((a) => find(a.id)?.status).join() !== before
  }
  return false
}

/** Next, in guided mode: play the current moment's default path through, visibly. */
export async function settleMoment(): Promise<void> {
  if (!guided()) return
  for (let i = 0; i < 12; i++) {
    if (!guided() || !(await step())) break
  }
  await finishRuns()
  await whenIdle()
}

/* ---------- The director: an idle viewer ---------- */

let lastInteraction = 0
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function clearTimers() {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
}

/** Run fn once the viewer has been idle `idleMs` (and at least `afterMs` from now), unless it is no longer wanted */
function schedule(key: string, afterMs: number, idleMs: number, stillWanted: () => boolean, fn: () => void) {
  if (timers.has(key)) return
  const due = Date.now() + afterMs
  const tick = () => {
    timers.delete(key)
    if (!guided() || !stillWanted()) return
    const idleUntil = lastInteraction + idleMs
    const busy = runnerBusy || isPlaying() || useDemo.getState().autoplay
    const at = Math.max(due, idleUntil, busy ? Date.now() + 500 : 0)
    if (at > Date.now()) {
      timers.set(key, setTimeout(tick, at - Date.now()))
      return
    }
    fn()
  }
  timers.set(key, setTimeout(tick, afterMs))
}

/** Look at the story and queue whatever an idle viewer would get done for them */
function direct() {
  if (!guided()) return
  const chip = pendingChip(true)
  if (chip) {
    schedule(`chip:${chip.id}`, IDLE_MS, IDLE_MS, () => pendingChip(true)?.id === chip.id, () => void tapChip(chip.chips[0]))
  }
  const consent = waitingConsent()
  if (consent) {
    // 2.5 s after it reaches his phone, unless the viewer is doing it by hand.
    schedule(`consent:${consent.id}`, DAD_MS, DAD_MS, () => waitingConsent()?.id === consent.id, () => void dadApproves(consent, 0))
  }
  const member = unsentMemberCard()
  if (member) {
    schedule(`member:${member.id}`, IDLE_MS, IDLE_MS, () => unsentMemberCard()?.id === member.id, () => runCardCommand(member.id, 'ask-member'))
  }
}

let directing = false

/** Start the director (once). Clicks and keys anywhere count as the viewer being active. */
export function startDirector() {
  if (directing || typeof window === 'undefined') return
  directing = true
  const touch = () => {
    lastInteraction = Date.now()
  }
  window.addEventListener('pointerdown', touch, true)
  window.addEventListener('keydown', touch, true)
  useMunim.subscribe((s, prev) => {
    if (s.messages.length === 0 && prev.messages.length > 0) {
      clearTimers()
      return
    }
    if (s.freeExplore && !prev.freeExplore) {
      clearTimers()
      return
    }
    if (s.messages !== prev.messages || s.actions !== prev.actions || s.freeExplore !== prev.freeExplore) direct()
  })
}

/* ---------- Moment 1: the onboarding plays itself ---------- */

let driver = 0

const digits = (s: string) => s.replace(/\D/g, '')

/** Step through the onboarding at about 1.2 s a step. Stops when the viewer clicks inside it. */
export async function playOnboarding(): Promise<void> {
  const token = ++driver
  const d = useDemo.getState
  d().setAutoplay(true)
  const alive = () => token === driver && d().autoplay && guided() && !st().connected && st().moment === 1 && !isHurrying()
  const pause = async (ms: number) => (await wait(ms)) && alive()
  const type = async (value: string, set: (v: string) => void, perDigitMs: number) => {
    for (let i = 1; i <= value.length; i++) {
      if (!(await pause(perDigitMs))) return false
      set(value.slice(0, i))
    }
    return true
  }
  try {
    if (!(await pause(700))) return
    d().setStep('phone')
    d().setPhone('')
    if (!(await type(digits(onboardingCopy.phone.demoNumber), d().setPhone, 70))) return
    if (!(await pause(STEP_MS))) return
    d().setStep('otp')
    d().setOtp('')
    if (!(await pause(400))) return
    if (!(await type('739214', d().setOtp, 110))) return
    if (!(await pause(STEP_MS))) return
    d().setStep('promise')
    if (!(await pause(STEP_MS + 600))) return
    d().setStep('aa')
    if (!(await pause(STEP_MS + 300))) return
    d().setStep('gmail')
    if (!(await pause(STEP_MS))) return
    // The reveal runs its own 2 s progress, then hands over to the runner (completeOnboarding).
    d().setStep('reveal')
  } finally {
    if (token === driver) d().setAutoplay(false)
  }
}

/** Stop the onboarding driver (Back, Reset) */
export function stopOnboarding() {
  driver++
  useDemo.getState().setAutoplay(false)
}
