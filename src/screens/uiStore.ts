/*
  View state for the five app screens: drilldowns, the Trust section, the Actions filter,
  category corrections, re-consents and the deleted state. Domain data, the deep-link
  highlight and toasts live in the main store (../store).
*/
import { create } from 'zustand'
import { useMunim } from '../store'
import type { ActionType, ISODate } from '../types'
import type { SpendCategoryId } from './screenData'

export type HoldingKind =
  | 'bank'
  | 'card'
  | 'fund'
  | 'stock'
  | 'nps'
  | 'epf'
  | 'esop'
  | 'loan'
  | 'policy'
  | 'wallet'
  | 'subscription'

export interface HoldingRef {
  kind: HoldingKind
  id: string
}

export type TrustSection = 'members' | 'ledger' | 'caps' | 'data' | 'plan'

interface UiState {
  /** Money: the holding whose detail is open, or null for the list */
  moneyDetail: HoldingRef | null
  /** Money list scroll position, restored on Back */
  moneyScrollTop: number
  trustSection: TrustSection
  actionsFilter: ActionType | 'all'
  /** Merchant id to the category the person chose (SPEC 9.5) */
  categoryOverrides: Record<string, SpendCategoryId>
  /** Data source id to its renewed consent expiry */
  renewedConsents: Record<string, ISODate>
  /** "Delete everything" ran: every screen shows the blank state */
  deleted: boolean

  openHolding: (ref: HoldingRef, scrollTop: number) => void
  closeHolding: () => void
  setTrustSection: (s: TrustSection) => void
  setActionsFilter: (f: ActionType | 'all') => void
  setCategory: (merchantId: string, category: SpendCategoryId) => void
  renewConsent: (sourceId: string, until: ISODate) => void
  setDeleted: (on: boolean) => void
  resetUi: () => void
}

const initialUi = {
  moneyDetail: null,
  moneyScrollTop: 0,
  trustSection: 'members' as TrustSection,
  actionsFilter: 'all' as const,
  categoryOverrides: {},
  renewedConsents: {},
  deleted: false,
}

export const useUi = create<UiState>()((set) => ({
  ...initialUi,
  openHolding: (moneyDetail, moneyScrollTop) => set({ moneyDetail, moneyScrollTop }),
  closeHolding: () => set({ moneyDetail: null }),
  setTrustSection: (trustSection) => set({ trustSection }),
  setActionsFilter: (actionsFilter) => set({ actionsFilter }),
  setCategory: (merchantId, category) =>
    set((s) => ({ categoryOverrides: { ...s.categoryOverrides, [merchantId]: category } })),
  renewConsent: (sourceId, until) => set((s) => ({ renewedConsents: { ...s.renewedConsents, [sourceId]: until } })),
  setDeleted: (deleted) => set({ deleted }),
  resetUi: () => set({ ...initialUi }),
}))

/** Go to the Actions tab with one card scrolled into view and pulsed (the store's deep link). */
export function openAction(id: string) {
  useUi.setState({ actionsFilter: 'all' })
  useMunim.getState().openInMunim(id)
}

/** "Sources" from Money: Trust, Data section. */
export function openTrustData() {
  useUi.getState().setTrustSection('data')
  useMunim.getState().setTab('trust')
}

/*
  Keep view state in step with the demo: any moment change leaves the deleted state
  (the demo engine has rebuilt the data), and a return to moment 0 (Reset) clears it all.
*/
useMunim.subscribe((s, prev) => {
  if (s.moment === prev.moment) return
  if (s.moment === 0) useUi.getState().resetUi()
  else if (useUi.getState().deleted) useUi.getState().setDeleted(false)
})
