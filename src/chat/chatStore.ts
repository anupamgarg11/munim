/*
  Chat-only state that the main store does not carry: who is typing, whose phone the
  WhatsApp frame shows, consents given in Suresh's frame, and the story clock that stamps
  new messages. Kept small on purpose; messages live in the main store (useMunim().messages)
  and the deep-link highlight is the main store's highlightedActionId.
*/
import { create } from 'zustand'
import { useMunim } from '../store'
import { AS_OF } from '../data/persona'
import type { ThreadId } from '../types'

export type WhatsAppOwner = 'nikhil' | 'suresh'

export interface ChatState {
  /** Munim ji is typing in this thread (drives the typing bubble and the header line) */
  typing: Record<ThreadId, boolean>
  /** Whose phone the WhatsApp frame shows; 'suresh' flips the frame (SPEC 5.7, 9.2) */
  whatsappOwner: WhatsAppOwner
  /** Consent request message ids that Suresh approved in his frame */
  consentGiven: Record<string, true>
  /**
   * Story clock: story time = anchor.story + (real now - anchor.real). New messages without
   * an explicit time are stamped with it, so a reply typed 3 minutes later reads 3 minutes
   * later. It follows the main store's demo clock whenever a moment moves that.
   */
  clockAnchor: { story: number; real: number }

  setTyping: (thread: ThreadId, on: boolean) => void
  setWhatsappOwner: (owner: WhatsAppOwner) => void
  markConsent: (messageId: string) => void
  setStoryClock: (at: string | number) => void
  resetChat: () => void
}

/** The main store's demo clock, read loosely so the chat never depends on its exact shape */
const mainClock = (): string => (useMunim.getState() as unknown as { clock?: string }).clock ?? AS_OF

const initial = () => ({
  typing: { nikhil: false, suresh: false } as Record<ThreadId, boolean>,
  whatsappOwner: 'nikhil' as WhatsAppOwner,
  consentGiven: {} as Record<string, true>,
  clockAnchor: { story: new Date(mainClock()).getTime(), real: Date.now() },
})

export const useChat = create<ChatState>()((set) => ({
  ...initial(),
  setTyping: (thread, on) => set((s) => (s.typing[thread] === on ? s : { typing: { ...s.typing, [thread]: on } })),
  setWhatsappOwner: (whatsappOwner) => set({ whatsappOwner }),
  markConsent: (messageId) => set((s) => ({ consentGiven: { ...s.consentGiven, [messageId]: true } })),
  setStoryClock: (at) => set({ clockAnchor: { story: new Date(at).getTime(), real: Date.now() } }),
  resetChat: () => set(initial()),
}))

// When a moment moves the demo clock, new messages follow it.
useMunim.subscribe((s, prev) => {
  const now = (s as unknown as { clock?: string }).clock
  if (now && now !== (prev as unknown as { clock?: string }).clock) useChat.getState().setStoryClock(now)
})

/** Current story time (epoch ms) */
export function storyNow(): number {
  const { story, real } = useChat.getState().clockAnchor
  return story + (Date.now() - real)
}
