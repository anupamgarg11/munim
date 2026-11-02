/*
  One store for the whole prototype.
  - Plain setters for the shell and the data (item 0).
  - The action card system (item 3): store actions drive the pure transitions in
    lib/actions.ts, run the hold ticker and the 1.5 s run, append the ledger, and keep
    "Found this year" recomputed whenever actions change (it is never set directly).
  - Small UI state other items share: the deep-link highlight, the PIN sheet, a member's
    pending OTP request, and toasts.
*/
import { create } from 'zustand'
import { computeFound } from './data/derived'
import { AS_OF, people } from './data/persona'
import * as A from './lib/actions'
import { approvers, timeline as timelineCopy } from './copy/cards'
import type {
  ActionCard,
  ActionDraft,
  ApprovalVia,
  CentreView,
  CompleteInput,
  ISODateTime,
  LedgerEntry,
  Member,
  MemberRequest,
  Message,
  Moment,
  Rule,
  Surface,
  Tab,
  ToastItem,
  ToastTone,
} from './types'

export interface MunimData {
  /** Which surface the phone layout shows */
  surface: Surface
  tab: Tab
  moment: Moment
  commentaryOpen: boolean
  /** All tabs and cards usable at any time, out of order */
  freeExplore: boolean
  /** Laptop centre column: phone frame or wide view */
  centreView: CentreView
  messages: Message[]
  actions: ActionCard[]
  rules: Rule[]
  members: Member[]
  ledger: LedgerEntry[]
  /** Derived from done actions (scope 'self') */
  foundThisYear: number
  /** Derived from done actions (scope 'family'), shown separately */
  foundFamily: number
  killSwitch: boolean

  /* ----- Item 3 ----- */
  /** Demo clock: the story's "now" in IST. Timeline entries are stamped with it; moments set it. */
  clock: ISODateTime
  /** Card to pulse after an "Open in Munim" deep link; clears itself after 1.2 s */
  highlightedActionId: string | null
  /** Card whose UPI PIN sheet is open (in the app, never in a chat bubble) */
  pinSheetActionId: string | null
  /** A member's OTP approval waiting on their phone; the WhatsApp frame can flip to them */
  memberRequest: MemberRequest | null
  toasts: ToastItem[]
}

export interface MunimSetters {
  setSurface: (surface: Surface) => void
  setTab: (tab: Tab) => void
  setMoment: (moment: number) => void
  setCommentaryOpen: (open: boolean) => void
  setFreeExplore: (on: boolean) => void
  setCentreView: (view: CentreView) => void
  setMessages: (messages: Message[]) => void
  setActions: (actions: ActionCard[]) => void
  setRules: (rules: Rule[]) => void
  setMembers: (members: Member[]) => void
  setLedger: (ledger: LedgerEntry[]) => void
  /** On: pauses rules (the flag) and cancels every held action */
  setKillSwitch: (on: boolean) => void
  /** Back to moment 0 with empty data; keeps layout choices (centre view, commentary) */
  reset: () => void
}

export interface ToastOptions {
  tone?: ToastTone
  /** Default 2600 ms; 0 keeps it until dismissed */
  durationMs?: number
}

/** The action card system (item 3) */
export interface MunimCardActions {
  /** Move the demo clock (moments call this) */
  setClock: (at: ISODateTime) => void
  /** Add (or replace by id) a card as proposed; returns its id */
  proposeAction: (draft: ActionDraft) => string
  /** Put a card in the store exactly as given (scripted states); replaces by id */
  upsertAction: (card: ActionCard) => void
  /**
   * Approve a proposed card. Then it holds (holdMinutes > 0), waits (scheduledFor in the
   * future), or runs and completes after 1.5 s. A PIN card approved by 'tap' opens the PIN
   * sheet instead; a member card opens the member request. Autopilot cards ('none') take
   * any via and are approved by their rule.
   */
  approveAction: (id: string, via: ApprovalVia) => void
  /** Start the hold of an approved (scheduled) card now */
  holdAction: (id: string) => void
  /** Skip (proposed) or cancel (scheduled or held). Never after it starts running. */
  cancelAction: (id: string, note?: string) => void
  /** Demo: jump the hold clock so the card runs now. No id = every held card. */
  skipWait: (id?: string) => void
  /** Run an approved or held card now; it completes (or fails, if scripted) after 1.5 s */
  runAction: (id: string) => void
  /** Complete now: receipt, done, found, ledger entry */
  completeAction: (id: string, input?: CompleteInput) => void
  failAction: (id: string, reason: string, retryAt: ISODateTime) => void
  /** Run a failed card again; completes after 1.5 s */
  retryAction: (id: string) => void
  /** Real-time ticker: runs held cards whose hold has ended. Idempotent; starts itself on hold. */
  startHoldTicker: () => void
  stopHoldTicker: () => void
  /** Pulse this card for 1.2 s (then it clears itself) */
  setHighlightedActionId: (id: string | null) => void
  /** "Open in Munim": switch to the app's Actions tab and pulse the card */
  openInMunim: (id: string) => void
  /** Open the UPI PIN sheet for a card (switches the phone layout to the app) */
  openPinSheet: (id: string) => void
  closePinSheet: () => void
  /** Ask the card's member for their OTP; sets memberRequest */
  requestMemberApproval: (id: string) => void
  clearMemberRequest: () => void
  showToast: (text: string, opts?: ToastOptions) => string
  dismissToast: (id: string) => void
}

export type MunimState = MunimData & MunimSetters & MunimCardActions

export const clampMoment = (n: number): Moment => Math.min(8, Math.max(0, Math.round(n))) as Moment

export const initialData: MunimData = {
  surface: 'whatsapp',
  tab: 'home',
  moment: 0,
  commentaryOpen: true,
  freeExplore: false,
  centreView: 'phone',
  messages: [],
  actions: [],
  rules: [],
  members: [],
  ledger: [],
  foundThisYear: 0,
  foundFamily: 0,
  killSwitch: false,
  clock: AS_OF,
  highlightedActionId: null,
  pinSheetActionId: null,
  memberRequest: null,
  toasts: [],
}

/* Timers live outside the state: they are not data and must not re-render anything. */
const runTimers = new Map<string, ReturnType<typeof setTimeout>>()
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>()
let highlightTimer: ReturnType<typeof setTimeout> | null = null
let ticker: ReturnType<typeof setInterval> | null = null
let toastSeq = 0

const PEOPLE = people as Record<string, { name: string } | undefined>

export const useMunim = create<MunimState>()((set, get) => {
  const find = (id: string) => get().actions.find((a) => a.id === id)

  /** Write one card (insert or replace), recompute the counter, append a ledger entry. */
  const commit = (next: ActionCard, ledger?: LedgerEntry | null) => {
    const s = get()
    const exists = s.actions.some((a) => a.id === next.id)
    const actions = exists ? s.actions.map((a) => (a.id === next.id ? next : a)) : [...s.actions, next]
    const found = computeFound(actions)
    set({
      actions,
      foundThisYear: found.self,
      foundFamily: found.family,
      ...(ledger ? { ledger: [...s.ledger, ledger] } : {}),
    })
  }

  /** Apply a pure transition; returns the new card, or null when it was a no-op. */
  const move = (id: string, fn: (card: ActionCard) => ActionCard): ActionCard | null => {
    const card = find(id)
    if (!card) return null
    const next = fn(card)
    if (next === card) return null
    commit(next)
    return next
  }

  const clearRunTimer = (id: string) => {
    const t = runTimers.get(id)
    if (t) clearTimeout(t)
    runTimers.delete(id)
  }

  /** End of the simulated run: complete, or fail if the card scripts a failure. */
  const finish = (id: string) => {
    runTimers.delete(id)
    const card = find(id)
    if (!card || card.status !== 'running') return
    // Stamp done with the run's own time (the last timeline entry), not the wall clock.
    const at = card.timeline[card.timeline.length - 1]?.at ?? get().clock
    if (card.scriptedFailure) {
      const { reason, retryAt } = card.scriptedFailure
      move(id, (c) => A.fail(c, reason, retryAt, at))
      return
    }
    const { card: done, ledger } = A.complete(card, at)
    if (done !== card) commit(done, ledger)
  }

  const scheduleFinish = (id: string) => {
    clearRunTimer(id)
    runTimers.set(id, setTimeout(() => finish(id), A.RUN_MS))
  }

  const startRun = (id: string) => {
    const next = move(id, (c) => A.run(c, A.runStamp(c, get().clock)))
    if (next) scheduleFinish(id)
  }

  const tick = () => {
    const now = Date.now()
    const held = get().actions.filter((a) => a.status === 'held')
    for (const a of held) if ((a.holdEndsAt ?? 0) <= now) startRun(a.id)
    if (!get().actions.some((a) => a.status === 'held')) get().stopHoldTicker()
  }

  const startHold = (id: string) => {
    const next = move(id, (c) => A.hold(c, Date.now(), get().clock))
    if (next) get().startHoldTicker()
  }

  /** After approval: wait for the date, hold, or run. */
  const afterApproval = (id: string) => {
    const card = find(id)
    if (!card || card.status !== 'approved') return
    const { clock } = get()
    if (card.scheduledFor && A.isAfter(card.scheduledFor, clock)) {
      move(id, (c) => A.schedule(c, card.scheduledFor!, clock))
      return
    }
    if (card.holdMinutes > 0) startHold(id)
    else startRun(id)
  }

  /** Keep a scripted action list self-consistent: running cards finish, held cards tick. */
  const resume = (actions: readonly ActionCard[]) => {
    for (const a of actions) if (a.status === 'running' && !runTimers.has(a.id)) scheduleFinish(a.id)
    if (actions.some((a) => a.status === 'held')) get().startHoldTicker()
  }

  const memberName = (memberId?: string): string => {
    if (!memberId) return approvers.member
    return get().members.find((m) => m.id === memberId)?.name ?? PEOPLE[memberId]?.name ?? approvers.member
  }

  const clearAllTimers = () => {
    for (const t of runTimers.values()) clearTimeout(t)
    runTimers.clear()
    for (const t of toastTimers.values()) clearTimeout(t)
    toastTimers.clear()
    if (highlightTimer) clearTimeout(highlightTimer)
    highlightTimer = null
    get().stopHoldTicker()
  }

  return {
    ...initialData,

    /* ---------- Setters (item 0) ---------- */
    setSurface: (surface) => set({ surface }),
    setTab: (tab) => set({ tab }),
    setMoment: (moment) => set({ moment: clampMoment(moment) }),
    setCommentaryOpen: (commentaryOpen) => set({ commentaryOpen }),
    setFreeExplore: (freeExplore) => set({ freeExplore }),
    setCentreView: (centreView) => set({ centreView }),
    setMessages: (messages) => set({ messages }),
    setActions: (actions) => {
      const found = computeFound(actions)
      set({ actions, foundThisYear: found.self, foundFamily: found.family })
      resume(actions)
    },
    setRules: (rules) => set({ rules }),
    setMembers: (members) => set({ members }),
    setLedger: (ledger) => set({ ledger }),
    setKillSwitch: (killSwitch) => {
      set({ killSwitch })
      if (!killSwitch) return
      const at = get().clock
      for (const a of get().actions) {
        if (a.status === 'held') move(a.id, (c) => A.cancel(c, at, timelineCopy.killSwitch))
      }
    },
    reset: () => {
      clearAllTimers()
      set((s) => ({
        ...initialData,
        centreView: s.centreView,
        commentaryOpen: s.commentaryOpen,
      }))
    },

    /* ---------- Action card system (item 3) ---------- */
    setClock: (clock) => set({ clock }),

    proposeAction: (draft) => {
      clearRunTimer(draft.id)
      commit(A.propose(draft, get().clock))
      return draft.id
    },

    upsertAction: (card) => {
      commit(card)
      resume([card])
    },

    approveAction: (id, via) => {
      const card = find(id)
      if (!card || card.status !== 'proposed') return
      const s = get()
      const at = s.clock
      let next: ActionCard
      if (card.approval === 'none') {
        const rule = s.rules.find((r) => r.id === card.ruleId)
        if (s.killSwitch || (rule && !rule.enabled)) return
        next = A.approveByRule(card, rule?.name ?? approvers.autopilot, at)
      } else if (card.approval === 'pin' && via !== 'pin') {
        // A PIN can never be skipped: open the sheet instead.
        s.openPinSheet(id)
        return
      } else if (card.approval === 'member-consent') {
        if (via !== 'member') {
          s.requestMemberApproval(id)
          return
        }
        next = A.approveByMember(card, memberName(card.approverMemberId), at)
      } else if (via === 'pin') {
        next = A.approveByPin(card, at)
      } else if (via === 'tap') {
        next = A.approveByTap(card, at)
      } else {
        // A rule or a member cannot sign a card that needs Nikhil's tap or PIN.
        return
      }
      if (next === card) return
      commit(next)
      // The PIN sheet closes itself after showing "Approved".
      if (s.memberRequest?.actionId === id) set({ memberRequest: null })
      afterApproval(id)
    },

    holdAction: (id) => {
      const card = find(id)
      if (!card || card.status !== 'approved') return
      if (card.approval === 'none' && get().killSwitch) return
      startHold(id)
    },

    cancelAction: (id, note) => {
      const next = move(id, (c) => A.cancel(c, get().clock, note))
      if (!next) return
      const s = get()
      if (s.pinSheetActionId === id) set({ pinSheetActionId: null })
      if (s.memberRequest?.actionId === id) set({ memberRequest: null })
    },

    skipWait: (id) => {
      const held = get().actions.filter((a) => a.status === 'held' && (id === undefined || a.id === id))
      for (const a of held) startRun(a.id)
    },

    runAction: (id) => startRun(id),

    completeAction: (id, input) => {
      const card = find(id)
      if (!card) return
      const at = card.status === 'running' ? (card.timeline[card.timeline.length - 1]?.at ?? get().clock) : A.runStamp(card, get().clock)
      const { card: done, ledger } = A.complete(card, at, input)
      if (done === card) return
      clearRunTimer(id)
      commit(done, ledger)
    },

    failAction: (id, reason, retryAt) => {
      const next = move(id, (c) => A.fail(c, reason, retryAt, get().clock))
      if (next) clearRunTimer(id)
    },

    retryAction: (id) => {
      const next = move(id, (c) => A.retry(c, get().clock))
      if (next) scheduleFinish(id)
    },

    startHoldTicker: () => {
      if (ticker) return
      ticker = setInterval(tick, 1000)
    },

    stopHoldTicker: () => {
      if (ticker) clearInterval(ticker)
      ticker = null
    },

    setHighlightedActionId: (id) => {
      if (highlightTimer) clearTimeout(highlightTimer)
      highlightTimer = null
      set({ highlightedActionId: id })
      if (id) {
        highlightTimer = setTimeout(() => {
          highlightTimer = null
          if (get().highlightedActionId === id) set({ highlightedActionId: null })
        }, A.HIGHLIGHT_MS)
      }
    },

    openInMunim: (id) => {
      set({ surface: 'app', tab: 'actions' })
      get().setHighlightedActionId(id)
    },

    openPinSheet: (id) => {
      const card = find(id)
      if (!card || card.status !== 'proposed') return
      set({ pinSheetActionId: id, surface: 'app' })
    },

    closePinSheet: () => set({ pinSheetActionId: null }),

    requestMemberApproval: (id) => {
      const card = find(id)
      if (!card || card.status !== 'proposed' || card.approval !== 'member-consent') return
      set({ memberRequest: { actionId: id, memberId: card.approverMemberId } })
    },

    clearMemberRequest: () => set({ memberRequest: null }),

    showToast: (text, opts = {}) => {
      const id = `toast-${++toastSeq}`
      const item: ToastItem = { id, text, tone: opts.tone ?? 'info', durationMs: opts.durationMs ?? 2600 }
      set((s) => ({ toasts: [...s.toasts, item].slice(-3) }))
      if (item.durationMs > 0) toastTimers.set(id, setTimeout(() => get().dismissToast(id), item.durationMs))
      return id
    },

    dismissToast: (id) => {
      const t = toastTimers.get(id)
      if (t) clearTimeout(t)
      toastTimers.delete(id)
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
    },
  }
})
