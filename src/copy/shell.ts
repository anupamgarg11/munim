/*
  Copy for the shell: frames, tabs, demo bar, placeholders.
  Rules: plain words, no em or en dashes, no emoji.
*/
import type { Moment, Tab } from '../types'

export const appName = 'Munim'

export const whatsapp = {
  contactName: 'Munim ji',
  status: 'online',
  verifiedLabel: 'Verified business',
  emptyChat: 'No messages yet.',
}

export const tabs: Record<Tab, string> = {
  home: 'Home',
  money: 'Money',
  actions: 'Actions',
  rules: 'Rules',
  trust: 'Trust',
}

export const tabOrder: Tab[] = ['home', 'money', 'actions', 'rules', 'trust']

/** Titles for the demo bar: "Moment 3 of 8 · Salary lands" */
export const momentTitles: Record<Moment, string> = {
  0: 'Before you start',
  1: 'Connect',
  2: 'Money found',
  3: 'Salary lands',
  4: 'ESOP buyback',
  5: 'Market fall',
  6: 'Ask anything',
  7: 'The household',
  8: 'Trust and plans',
}

export const LAST_MOMENT: Moment = 8

export const demoBar = {
  momentLabel: (m: Moment) => `Moment ${m} of ${LAST_MOMENT} · ${momentTitles[m]}`,
  pillLabel: (m: Moment) => `Moment ${m} of ${LAST_MOMENT}`,
  back: 'Back',
  next: 'Next',
  reset: 'Reset',
  skipWait: 'Skip wait',
  skipWaitIdle: 'Nothing is waiting',
  freeExplore: 'Free explore',
  collapse: 'Hide demo controls',
  expand: 'Show demo controls',
  region: 'Demo controls',
}

export const stage = {
  whatsappCaption: "Nikhil's WhatsApp",
  appCaption: 'Munim app',
  viewPhone: 'Phone',
  viewWide: 'Wide',
  viewLabel: 'Munim app view',
  surfaceLabel: 'Show',
  surfaceWhatsapp: 'WhatsApp',
  surfaceApp: 'Munim',
}

export const commentary = {
  title: 'Commentary',
  show: 'Show commentary',
  hide: 'Hide commentary',
  placeholder:
    'Press Next to play the story. For each moment this panel shows the principle at play, the edge case handled, and the metric we would watch.',
}

export const screens = {
  home: {
    found: 'Found this year',
    upNext: 'Up next',
    upNextEmpty: 'Nothing held or scheduled.',
    threadEmpty: 'Your conversation with Munim ji will show here.',
  },
  money: {
    netWorth: 'Net worth',
    sources: 'Sources',
    cash: 'Cash in banks',
    investments: 'Investments',
    loans: 'Loans',
    cardDues: 'Card dues',
  },
  actions: {
    empty: 'No actions yet. Anything Munim proposes will land here, ready to sign.',
  },
  rules: {
    empty: 'No Autopilot rules yet. Each rule will read as a sentence, with its caps and a switch.',
  },
  trust: {
    empty: 'Members, the ledger, caps, data sources and your plan will live here. We earn ₹0 on every action.',
  },
}
