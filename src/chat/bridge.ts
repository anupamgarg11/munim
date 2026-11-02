/*
  Where the chat meets the action card system (item 3) and the household flow (SPEC 5.7).
  Card buttons call main-store actions by name; a missing one is a safe no-op, and every
  button still does something visible (at worst it deep-links to the card in the app).

  Member approvals: when the store raises memberRequest (a card that needs Dad's OTP), the
  WhatsApp frame flips to Suresh's phone and the Hindi request lands in his chat. When he
  approves, the card is approved by him, listeners hear about it, and the frame flips back.
*/
import { useMunim } from '../store'
import { people } from '../data/persona'
import { chatHi, relationName } from '../copy/chat'
import { assumptions, facts } from './facts'
import { useChat } from './chatStore'
import { appendMessage, callStore, later, openInMunim, play, setDefaultChipHandler, showPhone } from './engine'
import type { ActionCard, ConsentRequestMessage, Member, Scope } from '../types'

/* ---------- Card buttons ---------- */

export type CardCommand = 'approve' | 'approve-in-munim' | 'ask-member' | 'cancel' | 'retry'

/** What a WhatsApp card button does. Pass your own as onAction to override. */
export function runCardCommand(actionId: string, command: CardCommand) {
  switch (command) {
    case 'approve':
      if (!callStore(['approveAction'], actionId, 'tap')) openInMunim(actionId)
      return
    case 'approve-in-munim':
      // PIN never in chat: the app opens at the card with the UPI PIN sheet up.
      openInMunim(actionId)
      callStore(['openPinSheet'], actionId)
      return
    case 'ask-member':
      if (!callStore(['requestMemberApproval'], actionId)) deliverMemberRequest(actionId)
      return
    case 'cancel':
      if (!callStore(['cancelAction'], actionId)) openInMunim(actionId)
      return
    case 'retry':
      if (!callStore(['retryAction'], actionId)) openInMunim(actionId)
      return
  }
}

/* ---------- Member requests (Suresh) ---------- */

const SURESH = people.suresh.id
const SCOPES: Scope[] = ['see', 'suggest', 'act-with-otp']

/** Same key for the request in both threads: the card it approves, else the member invite */
export const consentKey = (m: Pick<ConsentRequestMessage, 'actionId' | 'memberId'>) => m.actionId ?? `member:${m.memberId}`

const fdText = () =>
  chatHi.fdText({
    principal: facts.suresh.fd.principal,
    maturesOn: facts.suresh.fd.maturesOn,
    rate: facts.suresh.fd.rate,
    senior: facts.suresh.seniorFdRate,
    extra: Math.round(facts.suresh.fd.principal * (facts.suresh.seniorFdRate - facts.suresh.fd.rate)),
    medical: assumptions.sureshMedicalReserve,
  })

const hasConsentMessage = (thread: 'nikhil' | 'suresh', key: string) =>
  useMunim.getState().messages.some((m) => m.thread === thread && m.kind === 'consent' && consentKey(m) === key)

/**
 * Send a request to Suresh: "Request sent to Dad" in Nikhil's chat, the flip, then the Hindi
 * request in Suresh's chat (typing first). Without an actionId it is the invite (AA consent).
 * Idempotent: a request already in a thread is not sent twice.
 */
export function deliverMemberRequest(actionId?: string, text?: string) {
  const memberId = SURESH
  const key = consentKey({ actionId, memberId })
  const hindi = text ?? (actionId ? fdText() : chatHi.inviteText)
  if (!hasConsentMessage('nikhil', key)) {
    appendMessage({ kind: 'consent', from: 'munim', memberId, text: hindi, scopes: SCOPES, actionId }, 'nikhil')
  }
  if (!hasConsentMessage('suresh', key)) {
    later(450, () => {
      showPhone('suresh')
      void play([{ message: { kind: 'consent', from: 'munim', memberId, text: hindi, scopes: SCOPES, actionId }, delay: 700 }], { thread: 'suresh' })
    })
  } else {
    showPhone('suresh')
  }
}

/** "Invite Dad": the AA consent request to Suresh, in Hindi */
export function inviteDad() {
  deliverMemberRequest()
}

// The store raises memberRequest when a card needs a member's OTP: flip and deliver.
useMunim.subscribe((s, prev) => {
  const req = (s as unknown as { memberRequest?: { actionId: string } | null }).memberRequest
  const before = (prev as unknown as { memberRequest?: { actionId: string } | null }).memberRequest
  if (req && req !== before) deliverMemberRequest(req.actionId)
})

// Default quick reply for the household moment; a moment can replace it with setChipHandler.
setDefaultChipHandler('Invite Dad', () => inviteDad())

/* ---------- Consent given ---------- */

export interface ConsentEvent {
  messageId: string
  memberId: string
  actionId?: string
}

type ConsentListener = (e: ConsentEvent) => void
const listeners = new Set<ConsentListener>()

/** Hear about every consent Suresh gives (e.g. to play "Dad's in. One thing right away:"). Returns unsubscribe. */
export function onConsentGiven(fn: ConsentListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Default handler for Suresh's approval. The card's approval is his (approveAction with
 * via 'member'); an invite marks him consented in Members. Then the frame flips back.
 */
export function giveConsent(e: ConsentEvent) {
  useChat.getState().markConsent(consentKey(e))
  if (e.actionId) {
    callStore(['approveAction'], e.actionId, 'member')
  } else {
    const st = useMunim.getState()
    const existing = st.members.find((m) => m.id === e.memberId)
    const next: Member = existing
      ? { ...existing, consent: 'consented' }
      : {
          id: e.memberId,
          name: people.suresh.name,
          relation: 'father',
          language: 'hi',
          consent: 'consented',
          scopes: SCOPES,
          accountsLinked: [facts.suresh.savings.id, facts.suresh.fd.id],
          upiCircle: { status: 'none' },
        }
    st.setMembers(existing ? st.members.map((m) => (m.id === e.memberId ? next : m)) : [...st.members, next])
  }
  for (const fn of listeners) fn(e)
  later(1100, () => showPhone('nikhil'))
}

/** How Nikhil refers to a member: "Dad", "Mom", else the name */
export function memberLabel(memberId: string): string {
  const p = (people as Record<string, { name: string; relation: string } | undefined>)[memberId]
  return (p && relationName[p.relation]) ?? p?.name ?? memberId
}

/** Status of a consent request, from Suresh's approval, the card, or the member record */
export function consentStatus(
  m: Pick<ConsentRequestMessage, 'actionId' | 'memberId'>,
  ctx: { actions: readonly ActionCard[]; members: readonly Member[]; given: Record<string, true> },
): 'waiting' | 'given' {
  if (ctx.given[consentKey(m)]) return 'given'
  if (m.actionId) {
    const a = ctx.actions.find((x) => x.id === m.actionId)
    return a && !['proposed', 'cancelled', 'failed'].includes(a.status) ? 'given' : 'waiting'
  }
  return ctx.members.some((x) => x.id === m.memberId && x.consent === 'consented') ? 'given' : 'waiting'
}
