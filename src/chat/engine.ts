/*
  Chat engine. Plays scripted messages into the main store's messages[] with per-message
  delays and a typing indicator (SPEC 8: typing dots 1.2 s before each Munim message).

    play(script, opts?)   queue a script; resolves true when it finished, false if cancelled
    cancel()              stop everything now: pending steps, timers, typing (Back and Reset)
    resetChat()           cancel() plus clear chat-only state (flip, highlight, clock)
    ask(text)             the person's message plus the intent matcher's scripted answer
    tapChip(label)        a quick reply: echoes the label, then its handler or the matcher

  Scripts run one at a time, in order, so a reply typed mid-moment waits its turn instead of
  interleaving. A step is a message (with optional delay and typing time), a wait, or a
  function that mutates state (it may return more steps, which play inline).
*/
import { useMunim } from '../store'
import { storyNow, useChat, type WhatsAppOwner } from './chatStore'
import { matchIntent, type IntentAnswer, type IntentId } from './intents'
import { chatHi } from '../copy/chat'
import type { Message, Sender, Tab, ThreadId, Ticks } from '../types'

/* ---------- Script types ---------- */

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** A message as a script writes it: id, thread and time are filled in when absent. */
export type MessageInput = DistributiveOmit<Message, 'id' | 'thread' | 'at'> & {
  id?: string
  thread?: ThreadId
  /** ISO time in IST; when absent the story clock stamps it. A given time also moves the clock. */
  at?: string
}

export interface MessageStep {
  message: MessageInput
  /** Pause before this step, ms. Default: engineConfig.gapMs before a Munim message, 0 otherwise. */
  delay?: number
  /** Typing dots before a Munim message, ms. Default engineConfig.typingMs. false or 0: none. */
  typing?: number | false
}

export interface RunStep {
  /** Mutates state. May return more steps, which play inline; may be async. */
  run: () => void | ScriptStep[] | Promise<void | ScriptStep[]>
  /** Pause before running, ms */
  delay?: number
}

export interface WaitStep {
  wait: number
}

export type ScriptStep = MessageStep | RunStep | WaitStep | (() => void)

export interface PlayOptions {
  /** Thread for messages that do not name one. Default 'nikhil'. */
  thread?: ThreadId
  /** No delays and no typing: append everything at once (rebuilding state on Back, Skip). */
  instant?: boolean
}

/** Timing knobs (SPEC 8). Change with configureEngine. */
export const engineConfig = {
  /** Typing dots before each Munim message */
  typingMs: 1200,
  /** Pause before a Munim message, before the dots start */
  gapMs: 350,
  /** A sent message turns from one tick to two after this */
  deliveredMs: 400,
}

export function configureEngine(patch: Partial<typeof engineConfig>) {
  Object.assign(engineConfig, patch)
}

/* ---------- Cancellable timers ---------- */

let generation = 0
let tail: Promise<unknown> = Promise.resolve()
let running = 0
interface Pending {
  timer: ReturnType<typeof setTimeout>
  resolve: (ok: boolean) => void
}
const pending = new Set<Pending>()

/** Resolves true after ms, or false at once if the engine is cancelled meanwhile. */
function sleep(ms: number, gen: number): Promise<boolean> {
  if (gen !== generation) return Promise.resolve(false)
  if (ms <= 0) return Promise.resolve(true)
  return new Promise((resolve) => {
    const entry: Pending = {
      timer: setTimeout(() => {
        pending.delete(entry)
        resolve(gen === generation)
      }, ms),
      resolve,
    }
    pending.add(entry)
  })
}

/** Run fn after ms unless cancel() comes first (timers that Back and Reset must stop) */
export function later(ms: number, fn: () => void) {
  const gen = generation
  void sleep(ms, gen).then((ok) => ok && fn())
}

/** Stop everything now: queued scripts, timers, the typing indicator. Safe to call any time. */
export function cancel() {
  generation++
  for (const p of pending) {
    clearTimeout(p.timer)
    p.resolve(false)
  }
  pending.clear()
  tail = Promise.resolve()
  running = 0
  const chat = useChat.getState()
  chat.setTyping('nikhil', false)
  chat.setTyping('suresh', false)
}

/** cancel() plus chat-only state back to the start: Nikhil's phone, no highlight, clock at the snapshot */
export function resetChat() {
  cancel()
  useChat.getState().resetChat()
}

/** True while a script is playing or queued */
export const isPlaying = () => running > 0

/* ---------- Messages in the store ---------- */

const IST_OFFSET_MS = 330 * 60 * 1000
const pad = (n: number) => String(n).padStart(2, '0')

/** Epoch ms -> "2026-10-30T09:14:00+05:30" */
function toIstIso(ms: number): string {
  const z = new Date(ms + IST_OFFSET_MS)
  return `${z.getUTCFullYear()}-${pad(z.getUTCMonth() + 1)}-${pad(z.getUTCDate())}T${pad(z.getUTCHours())}:${pad(z.getUTCMinutes())}:${pad(z.getUTCSeconds())}+05:30`
}

let seq = 0
const nextId = () => `msg-${Date.now().toString(36)}-${(++seq).toString(36)}`

/** Append a message (or replace one with the same id). Fills id, thread and time. */
export function appendMessage(input: MessageInput, thread: ThreadId = 'nikhil'): Message {
  const chat = useChat.getState()
  if (input.at) chat.setStoryClock(input.at)
  const msg = { ...input, id: input.id ?? nextId(), thread: input.thread ?? thread, at: input.at ?? toIstIso(storyNow()) } as Message
  const st = useMunim.getState()
  const exists = st.messages.some((m) => m.id === msg.id)
  st.setMessages(exists ? st.messages.map((m) => (m.id === msg.id ? msg : m)) : [...st.messages, msg])
  return msg
}

/** Patch one message in place */
export function updateMessage(id: string, patch: Partial<Message>) {
  const st = useMunim.getState()
  let changed = false
  const next = st.messages.map((m) => {
    if (m.id !== id) return m
    changed = true
    return { ...m, ...patch } as Message
  })
  if (changed) st.setMessages(next)
}

/** Blue ticks on the person's messages in a thread (Munim has read them) */
function markThreadRead(thread: ThreadId) {
  const st = useMunim.getState()
  if (!st.messages.some((m) => m.thread === thread && m.from !== 'munim' && m.ticks && m.ticks !== 'read')) return
  st.setMessages(st.messages.map((m) => (m.thread === thread && m.from !== 'munim' && m.ticks && m.ticks !== 'read' ? { ...m, ticks: 'read' as Ticks } : m)))
}

/** The sender who owns a thread */
const ownerOf = (thread: ThreadId): Sender => (thread === 'suresh' ? 'suresh' : 'nikhil')

/** The person's own message: one tick now, two shortly after, blue when Munim replies. */
export function appendUserMessage(text: string, thread: ThreadId = 'nikhil'): Message | null {
  const t = text.trim()
  if (!t) return null
  const msg = appendMessage({ kind: 'text', from: ownerOf(thread), text: t, ticks: 'sent' }, thread)
  later(engineConfig.deliveredMs, () => {
    const cur = useMunim.getState().messages.find((m) => m.id === msg.id)
    if (cur?.ticks === 'sent') updateMessage(msg.id, { ticks: 'delivered' })
  })
  return msg
}

/* ---------- Playing scripts ---------- */

const isMessageStep = (s: ScriptStep): s is MessageStep => typeof s === 'object' && 'message' in s
const isRunStep = (s: ScriptStep): s is RunStep => typeof s === 'object' && 'run' in s

async function runSteps(steps: ScriptStep[], gen: number, opts: PlayOptions): Promise<boolean> {
  const thread0 = opts.thread ?? 'nikhil'
  for (const step of steps) {
    if (gen !== generation) return false
    if (typeof step === 'function') {
      step()
      continue
    }
    if (isRunStep(step)) {
      if (!opts.instant && step.delay && !(await sleep(step.delay, gen))) return false
      const out = await step.run()
      if (gen !== generation) return false
      if (Array.isArray(out) && !(await runSteps(out, gen, opts))) return false
      continue
    }
    if (!isMessageStep(step)) {
      if (!opts.instant && !(await sleep(step.wait, gen))) return false
      continue
    }
    const m = step.message
    const thread = m.thread ?? thread0
    if (!opts.instant) {
      const fromMunim = m.from === 'munim'
      if (!(await sleep(step.delay ?? (fromMunim ? engineConfig.gapMs : 0), gen))) return false
      const typingMs = fromMunim ? (step.typing === false ? 0 : (step.typing ?? engineConfig.typingMs)) : 0
      if (typingMs > 0) {
        markThreadRead(thread)
        useChat.getState().setTyping(thread, true)
        const ok = await sleep(typingMs, gen)
        if (!ok) return false
        useChat.getState().setTyping(thread, false)
      }
    } else if (m.from === 'munim') {
      markThreadRead(thread)
    }
    if (gen !== generation) return false
    appendMessage(m, thread)
  }
  return gen === generation
}

/**
 * Queue a script. Resolves true when every step ran, false if cancel() stopped it.
 * Scripts queued before a cancel() never start.
 */
export function play(script: ScriptStep[], opts: PlayOptions = {}): Promise<boolean> {
  const gen = generation
  running++
  const run = async () => {
    try {
      return await runSteps(script, gen, opts)
    } catch (err) {
      console.error('Chat script failed', err)
      return false
    } finally {
      if (gen === generation) running = Math.max(0, running - 1)
    }
  }
  const p = tail.then(run, run)
  tail = p
  return p
}

/* ---------- Free typing and quick replies ---------- */

/** Script for an intent answer: the text bubbles, then a card if one applies, then chips. */
export function answerScript(answer: IntentAnswer): ScriptStep[] {
  const steps: ScriptStep[] = answer.lines.map((text) => ({ message: { kind: 'text', from: 'munim', text } }))
  if (answer.actionId) steps.push({ message: { kind: 'action', from: 'munim', actionId: answer.actionId } })
  if (answer.chips?.length) steps.push({ message: { kind: 'chips', from: 'munim', chips: answer.chips }, typing: false, delay: 150 })
  return steps
}

/** Run the intent matcher on some text and play its answer. Returns the intent id and the run. */
export function runIntentMatcher(text: string, thread: ThreadId = 'nikhil'): { intent: IntentId | 'suresh-fallback'; done: Promise<boolean> } {
  if (thread === 'suresh') {
    return { intent: 'suresh-fallback', done: play([{ message: { kind: 'text', from: 'munim', text: chatHi.fallback } }], { thread }) }
  }
  const answer = matchIntent(text)
  return { intent: answer.id, done: play(answerScript(answer), { thread }) }
}

/** The person types and sends: their message, then Munim's scripted answer. */
export function ask(text: string, thread: ThreadId = 'nikhil'): Promise<boolean> {
  if (!appendUserMessage(text, thread)) return Promise.resolve(false)
  return runIntentMatcher(text, thread).done
}

export type ChipHandler = (ctx: { label: string; thread: ThreadId }) => void | ScriptStep[]

const chipHandlers = new Map<string, ChipHandler>()
/** Built-in behaviours (chat/bridge.ts); a handler set with setChipHandler always wins */
const chipDefaults = new Map<string, ChipHandler>()
const chipKey = (label: string) => label.trim().toLowerCase()

/** Give a quick reply its own behaviour (e.g. "Invite Dad" flips to Suresh's phone). null removes it. */
export function setChipHandler(label: string, handler: ChipHandler | null) {
  if (handler) chipHandlers.set(chipKey(label), handler)
  else chipHandlers.delete(chipKey(label))
}

/** The chat's own fallback behaviour for a quick reply, used only when no handler is set */
export function setDefaultChipHandler(label: string, handler: ChipHandler) {
  chipDefaults.set(chipKey(label), handler)
}

/** A tapped quick reply: echoed as the person's message, then its handler, else the intent matcher. */
export function tapChip(label: string, thread: ThreadId = 'nikhil'): Promise<boolean> {
  appendUserMessage(label, thread)
  const handler = chipHandlers.get(chipKey(label)) ?? chipDefaults.get(chipKey(label))
  if (!handler) return runIntentMatcher(label, thread).done
  const out = handler({ label, thread })
  return Array.isArray(out) ? play(out, { thread }) : Promise.resolve(true)
}

/* ---------- Surfaces: flip and deep links ---------- */

/** Flip the WhatsApp frame to a phone. On the phone layout this also shows the WhatsApp surface. */
export function showPhone(owner: WhatsAppOwner) {
  const st = useMunim.getState()
  if (owner === 'suresh' && st.surface !== 'whatsapp') st.setSurface('whatsapp')
  useChat.getState().setWhatsappOwner(owner)
}

/** Call a main-store function by the first name that exists; a missing one is a safe no-op. */
export function callStore(names: readonly string[], ...args: unknown[]): boolean {
  const st = useMunim.getState() as unknown as Record<string, unknown>
  for (const name of names) {
    const fn = st[name]
    if (typeof fn === 'function') {
      ;(fn as (...a: unknown[]) => unknown)(...args)
      return true
    }
  }
  return false
}

/**
 * "Open in Munim ›": the app surface, the tab, and a short highlight pulse on the card
 * (the main store's openInMunim / highlightedActionId). Other tabs (e.g. Trust for a member
 * consent) switch without a highlight.
 */
export function openInMunim(actionId?: string, tab: Tab = 'actions') {
  if (actionId && tab === 'actions' && callStore(['openInMunim'], actionId)) return
  const st = useMunim.getState()
  st.setSurface('app')
  st.setTab(tab)
  if (actionId) callStore(['setHighlightedActionId'], actionId)
}

/* ---------- Safety net ---------- */

// A full reset of the main store (no messages and no cards left) also resets the chat:
// nothing keeps playing, and the frame is back on Nikhil's phone.
useMunim.subscribe((s, prev) => {
  const emptied = s.messages.length === 0 && s.actions.length === 0
  const wasFull = prev.messages.length > 0 || prev.actions.length > 0
  if (emptied && wasFull) resetChat()
})
