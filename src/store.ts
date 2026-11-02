/*
  One store for the whole prototype. Plain setters only; demo logic (moments,
  approvals, holds) arrives in later items and drives these setters.
  "Found this year" is never set directly: it is recomputed whenever actions change.
*/
import { create } from 'zustand'
import { computeFound } from './data/derived'
import type {
  ActionCard,
  CentreView,
  LedgerEntry,
  Member,
  Message,
  Moment,
  Rule,
  Surface,
  Tab,
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
  setKillSwitch: (on: boolean) => void
  /** Back to moment 0 with empty data; keeps layout choices (centre view, commentary) */
  reset: () => void
}

export type MunimState = MunimData & MunimSetters

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
}

export const useMunim = create<MunimState>()((set) => ({
  ...initialData,
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
  },
  setRules: (rules) => set({ rules }),
  setMembers: (members) => set({ members }),
  setLedger: (ledger) => set({ ledger }),
  setKillSwitch: (killSwitch) => set({ killSwitch }),
  reset: () =>
    set((s) => ({
      ...initialData,
      centreView: s.centreView,
      commentaryOpen: s.commentaryOpen,
    })),
}))
