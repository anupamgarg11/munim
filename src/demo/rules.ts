/*
  The Autopilot rules the story runs under (SPEC 4, 5.3, 5.8). The store starts with these
  (and reset() restores them). Caps and thresholds are rule settings, not totals.
  Moment 3 stamps lastRun on the first two; any card that completes under a rule does too.
*/
import { buffer, rates } from '../data/persona'
import { caps } from '../screens/screenData'
import { rulesText } from '../copy/moments'
import { assumptions } from '../chat/facts'
import type { Rule } from '../types'

export const RULE_IDS = {
  payCards: 'pay-cards',
  sweep: 'sweep-spare',
  wallets: 'wallet-top-up',
  harvest: 'march-harvest',
} as const

/** A wallet below this gets topped up */
const WALLET_FLOOR = 200
const WALLET_TOP_UP = 500

export const defaultRules: Rule[] = [
  {
    id: RULE_IDS.payCards,
    name: rulesText.payCards.name,
    trigger: rulesText.payCards.trigger,
    action: rulesText.payCards.action,
    capPerRun: 100_000,
    capPerMonth: 200_000,
    rail: 'BBPS',
    holdMinutes: caps.holdMinutes,
    enabled: true,
  },
  {
    id: RULE_IDS.sweep,
    name: rulesText.sweep.name(buffer.amount),
    trigger: rulesText.sweep.trigger,
    action: rulesText.sweep.action(buffer.amount, rates.liquidFund.name),
    capPerRun: 500_000,
    capPerMonth: 500_000,
    rail: 'bank e-mandate',
    holdMinutes: caps.holdMinutes,
    enabled: true,
  },
  {
    id: RULE_IDS.wallets,
    name: rulesText.wallets.name,
    trigger: rulesText.wallets.trigger(WALLET_FLOOR),
    action: rulesText.wallets.action,
    capPerRun: WALLET_TOP_UP,
    capPerMonth: caps.reservePayMonthly,
    rail: 'UPI Reserve Pay',
    holdMinutes: caps.holdMinutes,
    enabled: true,
  },
  {
    id: RULE_IDS.harvest,
    name: rulesText.harvest.name,
    trigger: rulesText.harvest.trigger,
    action: rulesText.harvest.action,
    capPerRun: assumptions.tax.ltcgExemption,
    capPerMonth: assumptions.tax.ltcgExemption,
    rail: 'MF Central',
    holdMinutes: caps.holdMinutes,
    enabled: true,
    nextExpected: '2027-03-01T10:00:00+05:30',
  },
]
