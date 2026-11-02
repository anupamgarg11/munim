import { useCallback, useState, type ReactNode } from 'react'
import { BadgeIndianRupee, CircleCheck, Clock, Gauge, Lock, OctagonPause, RefreshCw, TriangleAlert, UserPlus, Users, Wallet } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { ScreenTitle } from '../components/ScreenTitle'
import { ScreenShell } from '../components/ScreenShell'
import { ScreenSheet } from '../components/ScreenLayer'
import { ScreenButton, ScreenCard, ScreenSubhead, ScreenTag } from '../components/ScreenParts'
import { tabs } from '../copy/shell'
import {
  common,
  consentLabel,
  languageLabel,
  relationLabel,
  scopeLabel,
  trustCopy,
  trustSectionLabel,
} from '../copy/screens'
import * as P from '../data/persona'
import { sum } from '../data/derived'
import { fmtAsOf, fmtDate, fmtDateTime, fmtINR, fmtLakh, fmtPct } from '../lib/format'
import { useMunim } from '../store'
import type { DataSource, Member } from '../types'
import { caps, consentMonths, consentWarnDays, currentPlan, plans } from './screenData'
import { consentRenewal, daysBetween, sourceLabel } from './selectors'
import { openAction, useUi, type TrustSection } from './uiStore'

const SECTIONS: TrustSection[] = ['members', 'ledger', 'caps', 'data', 'plan']

type PersonId = keyof typeof P.people
const person = (id: string) => (P.people as Record<string, { name: string; fullName?: string; relation: Member['relation']; language: Member['language'] }>)[id]

/** SPEC 3.5 and 5.8: members, ledger, caps, data, plan, delete everything, and the footer. */
export function TrustScreen() {
  const section = useUi((s) => s.trustSection)
  const setSection = useUi((s) => s.setTrustSection)
  const [deleting, setDeleting] = useState(false)
  const closeDelete = useCallback(() => setDeleting(false), [])

  const sheet = deleting && <DeleteSheet onClose={closeDelete} />

  return (
    <ScreenShell overlay={sheet}>
      <ScreenTitle>{tabs.trust}</ScreenTitle>
      <div role="group" aria-label={trustCopy.sectionsLabel} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {SECTIONS.map((s) => {
          const on = s === section
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => setSection(s)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                on ? 'border-accent bg-accent text-white' : 'border-line bg-card text-muted hover:text-ink'
              }`}
            >
              {trustSectionLabel[s]}
            </button>
          )
        })}
      </div>

      <div key={section} className="animate-fade-in flex flex-col gap-3">
        {section === 'members' && <Members />}
        {section === 'ledger' && <Ledger />}
        {section === 'caps' && <Caps />}
        {section === 'data' && <Data />}
        {section === 'plan' && <Plan />}
      </div>

      <ScreenCard tone="danger" className="mt-2">
        <h2 className="text-sm font-semibold text-negative">{trustCopy.deleteTitle}</h2>
        <p className="mt-1 text-sm leading-snug text-muted">{trustCopy.deleteNote}</p>
        <div className="mt-3">
          <ScreenButton variant="danger" onClick={() => setDeleting(true)}>
            {trustCopy.deleteButton}
          </ScreenButton>
        </div>
      </ScreenCard>

      <p className="px-1 pb-2 pt-1 text-xs leading-relaxed text-muted">{trustCopy.footer}</p>
    </ScreenShell>
  )
}

/* ---------- Members ---------- */

const INVITABLE: PersonId[] = ['suresh', 'kavita', 'shreya']

function Members() {
  const members = useMunim((s) => s.members)
  const setMembers = useMunim((s) => s.setMembers)
  const showToast = useMunim((s) => s.showToast)

  const ownSources = P.dataSources.filter((d) => !d.memberId).length
  const self: Member = members.find((m) => m.relation === 'self') ?? {
    id: 'nikhil',
    name: P.people.nikhil.name,
    relation: 'self',
    language: 'en',
    consent: 'consented',
    scopes: ['see', 'suggest', 'act-with-otp'],
    accountsLinked: P.dataSources.filter((d) => !d.memberId).map((d) => d.id),
    upiCircle: { status: 'none' },
  }
  const others = members.filter((m) => m.relation !== 'self')
  const toInvite = INVITABLE.filter((id) => !members.some((m) => m.id === id))

  const inviteName = (id: PersonId) => {
    const p = person(id)
    return p.relation === 'father' || p.relation === 'mother' ? relationLabel[p.relation] : p.name
  }

  const invite = (id: PersonId) => {
    const p = person(id)
    const m: Member = {
      id,
      name: p.name,
      relation: p.relation,
      language: p.language,
      consent: 'invited',
      scopes: ['see', 'suggest', 'act-with-otp'],
      accountsLinked: [],
      upiCircle: { status: 'none' },
    }
    setMembers([...useMunim.getState().members, m])
    showToast(trustCopy.invitedToast(inviteName(id), languageLabel[p.language]), { tone: 'success' })
  }

  return (
    <>
      <p className="px-1 text-sm leading-relaxed text-muted">{trustCopy.membersIntro}</p>
      <MemberCard m={self} sources={self.accountsLinked.length || ownSources} payer={P.people.nikhil.name} />
      {others.map((m) => (
        <MemberCard key={m.id} m={m} sources={m.accountsLinked.length} payer={P.people.nikhil.name} />
      ))}
      {toInvite.length > 0 && (
        <ScreenCard flush>
          <ul className="divide-y divide-line">
            {toInvite.map((id) => (
              <li key={id}>
                <button type="button" onClick={() => invite(id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
                    <UserPlus size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-accent">{trustCopy.inviteLabel(inviteName(id))}</span>
                    <span className="block text-xs text-muted">{trustCopy.inviteNote(languageLabel[person(id).language])}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </ScreenCard>
      )}
    </>
  )
}

function MemberCard({ m, sources, payer }: { m: Member; sources: number; payer: string }) {
  const p = person(m.id)
  const tone = m.consent === 'consented' ? 'positive' : m.consent === 'invited' ? 'warning' : 'negative'
  const circle = m.upiCircle
  return (
    <ScreenCard>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-white" aria-hidden="true">
            {m.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-ink">{p?.fullName ?? m.name}</h3>
            <p className="text-xs text-muted">
              {relationLabel[m.relation]} · {languageLabel[m.language]}
            </p>
          </div>
        </div>
        <ScreenTag tone={tone}>{consentLabel[m.consent]}</ScreenTag>
      </div>
      {m.relation === 'self' && <p className="mt-2 text-sm text-ink">{trustCopy.owner}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {m.scopes.map((s) => (
          <ScreenTag key={s}>{scopeLabel[s]}</ScreenTag>
        ))}
      </div>
      <p className="num mt-2 text-xs text-muted">{trustCopy.accountsLinked(sources)}</p>
      {circle.status === 'active' && circle.monthlyCap !== undefined && circle.perPaymentCap !== undefined && (
        <p className="num mt-2 border-t border-line pt-2 text-sm text-ink">
          {trustCopy.upiCircle(payer, m.name, fmtINR(circle.monthlyCap), fmtINR(circle.perPaymentCap))}
        </p>
      )}
    </ScreenCard>
  )
}

/* ---------- Ledger ---------- */

function Ledger() {
  const ledger = useMunim((s) => s.ledger)
  const rows = [...ledger].sort((a, b) => b.at.localeCompare(a.at))
  const earned = sum(ledger.map((e) => e.earned))
  return (
    <>
      <p className="px-1 text-sm leading-relaxed text-muted">{trustCopy.ledgerIntro}</p>
      {rows.length === 0 ? (
        <EmptyState>{trustCopy.ledgerEmpty}</EmptyState>
      ) : (
        <ScreenCard flush>
          <ScreenSubhead>{trustCopy.ledgerSummary(rows.length, fmtINR(earned))}</ScreenSubhead>
          <ul className="divide-y divide-line">
            {rows.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-medium text-ink">{e.action}</p>
                  <p className="num shrink-0 text-sm font-medium text-ink">{fmtINR(e.amount)}</p>
                </div>
                <p className="text-xs text-muted">{trustCopy.ledgerApprover(e.approver, e.rail)}</p>
                <p className="num text-xs text-muted">{trustCopy.ledgerWhen(fmtDateTime(e.at), e.reference)}</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="num flex items-center gap-1 text-xs font-medium text-positive">
                    <BadgeIndianRupee size={14} aria-hidden="true" />
                    {common.earned(fmtINR(e.earned))}
                  </p>
                  {e.actionId && <LedgerLink id={e.actionId} />}
                </div>
              </li>
            ))}
          </ul>
        </ScreenCard>
      )}
    </>
  )
}

function LedgerLink({ id }: { id: string }) {
  return (
    <ScreenButton variant="link" onClick={() => openAction(id)}>
      <span className="text-xs">{common.view}</span>
    </ScreenButton>
  )
}

/* ---------- Caps ---------- */

function Caps() {
  const rules = useMunim((s) => s.rules)
  const members = useMunim((s) => s.members)
  const killSwitch = useMunim((s) => s.killSwitch)
  const setTab = useMunim((s) => s.setTab)
  const circles = members.filter((m) => m.upiCircle.status === 'active' && m.upiCircle.monthlyCap !== undefined)
  const enabled = rules.filter((r) => r.enabled)
  const walletList = common.list(P.wallets.map((w) => w.name))

  return (
    <>
      <p className="px-1 text-sm leading-relaxed text-muted">{trustCopy.capsIntro}</p>

      <ScreenCard flush>
        <ScreenSubhead aside={enabled.length ? trustCopy.capsTotal(fmtINR(sum(enabled.map((r) => r.capPerMonth)))) : undefined}>
          {trustCopy.capsAutopilot}
        </ScreenSubhead>
        {rules.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted">{trustCopy.capsNoRules}</p>
        ) : (
          <ul className="divide-y divide-line">
            {rules.map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-ink">{r.name}</span>
                <span className="num text-right font-medium text-ink">{trustCopy.capsRule(fmtINR(r.capPerRun), fmtINR(r.capPerMonth))}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="flex items-start gap-2 border-t border-line px-4 py-2.5 text-xs text-muted">
          <Clock size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
          {trustCopy.capsHold(caps.holdMinutes)}
        </p>
      </ScreenCard>

      <CapCard icon={<Wallet size={18} />} title={trustCopy.capsReservePay} value={trustCopy.capsReservePayValue(fmtINR(caps.reservePayMonthly))}>
        {trustCopy.capsReservePayNote(walletList)}
      </CapCard>
      <CapCard icon={<Gauge size={18} />} title={trustCopy.capsCooling} value={trustCopy.capsCoolingValue(caps.newPayeeCoolingHours)}>
        {trustCopy.capsCoolingNote}
      </CapCard>
      <CapCard icon={<Users size={18} />} title={trustCopy.capsCircle}>
        {circles.length === 0
          ? trustCopy.capsCircleNone
          : circles.map((m) => (
              <span key={m.id} className="num block">
                {trustCopy.upiCircle(P.people.nikhil.name, m.name, fmtINR(m.upiCircle.monthlyCap ?? 0), fmtINR(m.upiCircle.perPaymentCap ?? 0))}
              </span>
            ))}
      </CapCard>
      <CapCard icon={<OctagonPause size={18} />} title={trustCopy.capsKill}>
        <span className="block">{killSwitch ? trustCopy.capsKillOn : trustCopy.capsKillOff}</span>
        <span className="mt-1 block">
          <ScreenButton variant="link" onClick={() => setTab('rules')}>
            {trustCopy.capsKillManage}
          </ScreenButton>
        </span>
      </CapCard>
      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
        <Lock size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
        {trustCopy.capsPin}
      </p>
    </>
  )
}

function CapCard({ icon, title, value, children }: { icon: ReactNode; title: string; value?: string; children: ReactNode }) {
  return (
    <ScreenCard className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-accent" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {value && <span className="num shrink-0 text-sm font-semibold text-ink">{value}</span>}
        </div>
        <div className="mt-0.5 text-sm leading-snug text-muted">{children}</div>
      </div>
    </ScreenCard>
  )
}

/* ---------- Data ---------- */

function Data() {
  const members = useMunim((s) => s.members)
  const renewed = useUi((s) => s.renewedConsents)
  const renewConsent = useUi((s) => s.renewConsent)
  const showToast = useMunim((s) => s.showToast)

  const consentedMember = (id?: string) => !id || members.some((m) => m.id === id && m.consent === 'consented')
  const visible = P.dataSources.filter((d) => consentedMember(d.memberId))
  const aa = visible.filter((d) => d.via === 'Account Aggregator')
  const other = visible.filter((d) => d.via !== 'Account Aggregator')

  const renew = (d: DataSource) => {
    renewConsent(d.id, consentRenewal())
    showToast(trustCopy.dataRenewedToast(d.name, consentMonths), { tone: 'success' })
  }

  return (
    <>
      <p className="px-1 text-sm leading-relaxed text-muted">{trustCopy.dataIntro(consentMonths)}</p>
      <ScreenCard flush>
        <ScreenSubhead>{trustCopy.dataAa}</ScreenSubhead>
        <ul className="divide-y divide-line">
          {aa.map((d) => {
            const expiry = renewed[d.id] ?? d.consentExpiry
            const days = expiry ? daysBetween(P.AS_OF, expiry) : Infinity
            const warn = days <= consentWarnDays
            const owner = d.memberId ? members.find((m) => m.id === d.memberId) : undefined
            return (
              <li key={d.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{sourceLabel(d)}</p>
                    <p className="text-xs text-muted">
                      {d.covers}
                      {owner ? ` · ${trustCopy.dataFor(owner.name)}` : ''}
                    </p>
                  </div>
                  {!warn && (
                    <button type="button" onClick={() => renew(d)} className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline">
                      <RefreshCw size={12} aria-hidden="true" />
                      {trustCopy.dataReconsent}
                    </button>
                  )}
                </div>
                <p className="num mt-1 text-xs text-muted">{fmtAsOf(d.freshness)}</p>
                {expiry &&
                  (warn ? (
                    <p className="num mt-1 flex flex-wrap items-center gap-x-2 text-xs font-medium text-warning">
                      <TriangleAlert size={14} aria-hidden="true" />
                      {trustCopy.dataExpiresIn(days)}
                      <button type="button" onClick={() => renew(d)} className="font-semibold text-warning underline underline-offset-2">
                        {trustCopy.dataRenew}
                      </button>
                    </p>
                  ) : (
                    <p className="num mt-0.5 flex items-center gap-1 text-xs text-muted">
                      {renewed[d.id] && <CircleCheck size={12} className="text-positive" aria-hidden="true" />}
                      {trustCopy.dataConsentUntil(fmtDate(expiry, { year: true }))}
                    </p>
                  ))}
              </li>
            )
          })}
        </ul>
      </ScreenCard>
      <ScreenCard flush>
        <ScreenSubhead>{trustCopy.dataOther}</ScreenSubhead>
        <ul className="divide-y divide-line">
          {other.map((d) => (
            <li key={d.id} className="px-4 py-3">
              <p className="text-sm font-medium text-ink">{sourceLabel(d)}</p>
              <p className="text-xs text-muted">{d.covers}</p>
              <p className="num mt-1 text-xs text-muted">{fmtAsOf(d.freshness)}</p>
              <p className="mt-0.5 text-xs text-muted">{d.via === 'Gmail' ? trustCopy.dataGmail : trustCopy.dataSms}</p>
            </li>
          ))}
        </ul>
      </ScreenCard>
    </>
  )
}

/* ---------- Plan ---------- */

function Plan() {
  const price = (id: (typeof plans)[number]) => {
    switch (id.id) {
      case 'free':
        return trustCopy.planFree(fmtINR(id.pricePerYear ?? 0))
      case 'plus':
        return trustCopy.planPrice(fmtINR(id.pricePerYear ?? 0))
      case 'family':
        return trustCopy.planFamily(fmtINR(id.pricePerYear ?? 0), id.members ?? 0)
      case 'managed':
        return trustCopy.planManaged(fmtLakh(id.minAssets ?? 0), fmtPct(id.feeRate ?? 0))
    }
  }
  return (
    <>
      <p className="px-1 text-sm leading-relaxed text-muted">{trustCopy.planIntro}</p>
      {plans.map((p) => {
        const mine = p.id === currentPlan
        return (
          <ScreenCard key={p.id} className={mine ? 'ring-2 ring-accent' : ''}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">{trustCopy.planName[p.id]}</h3>
              {mine && <ScreenTag tone="accent">{trustCopy.planCurrent}</ScreenTag>}
            </div>
            <p className="num mt-0.5 text-base font-semibold text-ink">{price(p)}</p>
            <p className="mt-1 text-sm leading-snug text-muted">{trustCopy.planWhat[p.id]}</p>
          </ScreenCard>
        )
      })}
      <ScreenCard tone="soft">
        <p className="text-sm font-semibold text-accent">{trustCopy.noCommissions}</p>
        <p className="mt-0.5 text-sm text-ink">{trustCopy.planDirect}</p>
      </ScreenCard>
    </>
  )
}

/* ---------- Delete everything ---------- */

function DeleteSheet({ onClose }: { onClose: () => void }) {
  const setDeleted = useUi((s) => s.setDeleted)
  const confirm = () => {
    const st = useMunim.getState()
    st.setMessages([])
    st.setActions([])
    st.setRules([])
    st.setMembers([])
    st.setLedger([])
    st.setKillSwitch(false)
    useUi.setState({ moneyDetail: null, categoryOverrides: {}, renewedConsents: {} })
    setDeleted(true)
    onClose()
  }
  return (
    <ScreenSheet title={trustCopy.deleteConfirmTitle} onClose={onClose}>
      <p className="text-sm leading-relaxed text-muted">{trustCopy.deleteConfirmBody}</p>
      <div className="mt-4 flex flex-col gap-2">
        <ScreenButton variant="danger" onClick={confirm}>
          {trustCopy.deleteConfirmYes}
        </ScreenButton>
        <ScreenButton variant="secondary" onClick={onClose}>
          {trustCopy.deleteConfirmNo}
        </ScreenButton>
      </div>
    </ScreenSheet>
  )
}
