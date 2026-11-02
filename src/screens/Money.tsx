import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { MoneyRow } from '../components/MoneyRow'
import { ScreenTitle } from '../components/ScreenTitle'
import { ScreenShell } from '../components/ScreenShell'
import { ScreenButton, ScreenCallout, ScreenCard, ScreenSection, ScreenSubhead, ScreenTag } from '../components/ScreenParts'
import { tabs } from '../copy/shell'
import { common, moneyCopy } from '../copy/screens'
import { SWEEP_STEP, fundGain, fundValue, selectEsop, selectInvestments, selectNetWorth } from '../data/derived'
import { useMunim } from '../store'
import { fmtAsOf, fmtDate, fmtINR, fmtLakh, fmtPct } from '../lib/format'
import { MoneyDetail } from './MoneyDetail'
import { CategorySheet, MoneySpending } from './MoneySpending'
import type { SpendTxn } from './screenData'
import { freshAsOf, idleCallout, regularCostPerYear, sipFor, spareAfterCommitments, termLine, usePersona, type PersonaData } from './selectors'
import { openTrustData, useUi, type HoldingRef } from './uiStore'

/** SPEC 3.2 and 9.3: net worth, then Cash, Investments, Protection, Loans, Spending; every holding drills in. */
export function MoneyScreen() {
  // The live persona (item 4): balances move as cards complete and money lands.
  const P = usePersona()
  const nw = selectNetWorth(P)
  const inv = selectInvestments(P)
  const esop = selectEsop(P)
  const clock = useMunim((s) => s.clock)
  const detail = useUi((s) => s.moneyDetail)
  const openHolding = useUi((s) => s.openHolding)
  const savedScroll = useUi((s) => s.moneyScrollTop)
  const [editing, setEditing] = useState<SpendTxn | null>(null)
  const closeSheet = useCallback(() => setEditing(null), [])
  const listRef = useRef<HTMLDivElement>(null)
  const wasDetail = useRef(detail !== null)

  // Back from a detail: return to where the list was.
  useLayoutEffect(() => {
    if (wasDetail.current && !detail) listRef.current?.closest('main')?.scrollTo({ top: savedScroll })
    wasDetail.current = detail !== null
  }, [detail, savedScroll])

  if (detail) {
    return (
      <ScreenShell>
        <MoneyDetail holding={detail} />
      </ScreenShell>
    )
  }

  const open = (ref: HoldingRef) => openHolding(ref, listRef.current?.closest('main')?.scrollTop ?? 0)

  return (
    <ScreenShell overlay={editing && <CategorySheet txn={editing} onClose={closeSheet} />}>
      <div ref={listRef} className="contents">
        <ScreenTitle>{tabs.money}</ScreenTitle>

        {/* Net worth */}
        <ScreenCard>
          <p className="text-sm font-medium text-muted">{moneyCopy.netWorth}</p>
          <p className="num text-[32px] font-semibold leading-tight tracking-tight text-ink">{fmtINR(nw.total)}</p>
          <p className="num mt-1 text-xs text-muted">
            {fmtAsOf(freshAsOf(P.AS_OF, clock))} ·{' '}
            <ScreenButton variant="link" onClick={openTrustData}>
              <span className="text-xs">{moneyCopy.sources}</span>
            </ScreenButton>
          </p>
          <dl className="mt-3 divide-y divide-line border-t border-line text-sm">
            {(
              [
                [moneyCopy.partCash, nw.cash],
                [moneyCopy.partInvestments, nw.investments],
                [moneyCopy.partLoans, -nw.loans],
                [moneyCopy.partCards, -nw.cardDues],
              ] as const
            ).map(([label, amt]) => (
              <div key={label} className="flex items-center justify-between py-2">
                <dt className="text-ink">{label}</dt>
                <dd className={`num font-medium ${amt < 0 ? 'text-negative' : 'text-ink'}`}>{fmtINR(amt)}</dd>
              </div>
            ))}
          </dl>
          <p className="num mt-1 text-xs text-muted">{moneyCopy.esopExcluded(fmtINR(esop.remainingValue))}</p>
        </ScreenCard>

        {/* Cash */}
        <ScreenSection title={moneyCopy.cash} aside={fmtINR(nw.cash)}>
          <ScreenCard flush>
            <ul className="divide-y divide-line">
              {P.banks.map((b) => (
                <li key={b.id}>
                  <MoneyRow
                    title={b.bank}
                    subtitle={`${moneyCopy.accountKind[b.kind]} ${common.mask(b.mask)}`}
                    amount={fmtINR(b.balance)}
                    tags={b.note ? <ScreenTag>{b.note}</ScreenTag> : undefined}
                    lines={
                      b.id === P.buffer.accountId
                        ? [{ text: moneyCopy.bufferLine(fmtINR(P.buffer.amount), fmtINR(Math.max(0, b.balance - P.buffer.amount))) }]
                        : undefined
                    }
                    onOpen={() => open({ kind: 'bank', id: b.id })}
                  />
                </li>
              ))}
            </ul>
          </ScreenCard>
          <CashCallout p={P} />
        </ScreenSection>

        {/* Investments */}
        <ScreenSection title={moneyCopy.investments} aside={fmtINR(inv.total)}>
          <ScreenCard flush>
            <ScreenSubhead aside={fmtINR(inv.mutualFunds)}>{moneyCopy.mutualFunds}</ScreenSubhead>
            <ul className="divide-y divide-line">
              {P.funds.map((f) => {
                const lines: { text: string; tone?: 'warning' | 'negative' }[] = []
                if (f.plan === 'regular') lines.push({ text: moneyCopy.costsYou(fmtINR(regularCostPerYear(f.id, P))), tone: 'warning' })
                if (fundGain(f) < 0) lines.push({ text: moneyCopy.belowCost(fmtINR(-fundGain(f))), tone: 'negative' })
                const sip = sipFor(f.id, P)
                if (sip) lines.push({ text: moneyCopy.sip(fmtINR(sip.amount), common.ordinal(sip.dayOfMonth)) })
                if (f.note) lines.push({ text: f.note })
                return (
                  <li key={f.id}>
                    <MoneyRow
                      title={f.name}
                      subtitle={f.heldVia}
                      amount={fmtINR(fundValue(f))}
                      tags={<ScreenTag tone={f.plan === 'direct' ? 'accent' : 'warning'}>{f.plan === 'direct' ? moneyCopy.direct : moneyCopy.regular}</ScreenTag>}
                      lines={lines}
                      onOpen={() => open({ kind: 'fund', id: f.id })}
                    />
                  </li>
                )
              })}
            </ul>
            <ScreenSubhead aside={fmtINR(inv.stocks)}>{moneyCopy.stocks}</ScreenSubhead>
            <p className="px-4 pt-2 text-xs text-muted">{moneyCopy.stocksVia(P.stocks.broker, P.stocks.holdings.length)}</p>
            <ul className="divide-y divide-line">
              {P.stocks.holdings.map((h) => (
                <li key={h.id}>
                  <MoneyRow title={h.name} amount={fmtINR(h.value)} onOpen={() => open({ kind: 'stock', id: h.id })} />
                </li>
              ))}
            </ul>
            <ScreenSubhead aside={fmtINR(inv.nps + inv.epf)}>{common.dot(moneyCopy.nps(P.nps.tier), moneyCopy.epf)}</ScreenSubhead>
            <ul className="divide-y divide-line">
              <li>
                <MoneyRow title={moneyCopy.nps(P.nps.tier)} amount={fmtINR(inv.nps)} onOpen={() => open({ kind: 'nps', id: 'nps' })} />
              </li>
              <li>
                <MoneyRow title={moneyCopy.epf} subtitle={P.profile.employer} amount={fmtINR(inv.epf)} onOpen={() => open({ kind: 'epf', id: 'epf' })} />
              </li>
            </ul>
          </ScreenCard>
          {/* ESOPs: vested, shown separately, not in net worth */}
          <ScreenCard flush tone="outline">
            <MoneyRow
              title={moneyCopy.esop(P.esop.company)}
              subtitle={moneyCopy.esopVested(esop.remainingUnits.toLocaleString('en-IN'))}
              amount={fmtINR(esop.remainingValue)}
              tags={<ScreenTag>{moneyCopy.esopNotCounted}</ScreenTag>}
              onOpen={() => open({ kind: 'esop', id: 'esop' })}
            />
          </ScreenCard>
        </ScreenSection>

        {/* Protection */}
        <ScreenSection title={moneyCopy.protection}>
          <ScreenCard flush>
            <ul className="divide-y divide-line">
              {P.policies.map((p) => {
                const lines: { text: string; tone?: 'warning' }[] = []
                if (p.premium && p.premiumDue) lines.push({ text: moneyCopy.premiumDue(fmtINR(p.premium), fmtDate(p.premiumDue)) })
                else if (p.premium) lines.push({ text: moneyCopy.premiumYear(fmtINR(p.premium)) })
                if (p.kind === 'term') lines.push({ text: termLine(P), tone: 'warning' })
                return (
                  <li key={p.id}>
                    <MoneyRow
                      title={p.name}
                      subtitle={p.provider ? common.dot(moneyCopy.coverFor(p.covers), p.provider) : moneyCopy.coverFor(p.covers)}
                      amount={fmtLakh(p.cover)}
                      lines={lines}
                      onOpen={() => open({ kind: 'policy', id: p.id })}
                    />
                  </li>
                )
              })}
            </ul>
          </ScreenCard>
        </ScreenSection>

        {/* Loans and card bills */}
        <ScreenSection title={moneyCopy.loans} aside={moneyCopy.owed(fmtINR(nw.loans + nw.cardDues))}>
          <ScreenCard flush>
            <ul className="divide-y divide-line">
              {P.loans.map((l) => (
                <li key={l.id}>
                  <MoneyRow
                    title={common.dot(l.lender, l.kind)}
                    amount={fmtINR(l.outstanding)}
                    lines={[
                      { text: moneyCopy.loanLine(fmtPct(l.rate), moneyCopy.value.rateType[l.rateType], fmtINR(l.emi), l.monthsLeft) },
                      { text: moneyCopy.loanTax(fmtINR(l.interestThisYear), l.taxSection) },
                    ]}
                    onOpen={() => open({ kind: 'loan', id: l.id })}
                  />
                </li>
              ))}
            </ul>
            <ScreenSubhead aside={fmtINR(nw.cardDues)}>{moneyCopy.cardBills}</ScreenSubhead>
            <ul className="divide-y divide-line">
              {P.cards.map((c) => (
                <li key={c.id}>
                  <MoneyRow
                    title={c.name}
                    subtitle={common.dot(common.mask(c.mask), c.statement <= 0 ? moneyCopy.cardPaid(fmtDate(c.asOf)) : moneyCopy.cardDue(fmtDate(c.due)))}
                    amount={fmtINR(c.statement)}
                    onOpen={() => open({ kind: 'card', id: c.id })}
                  />
                </li>
              ))}
            </ul>
          </ScreenCard>
        </ScreenSection>

        <MoneySpending open={open} onEdit={setEditing} />
      </div>
    </ScreenShell>
  )
}

/**
 * Under the cash accounts. Before the salary (moment 3): what sits above the buffer. After
 * it: what is spare once bills, SIPs, Diwali and the buffer are kept (SPEC 5.3), less money
 * already on its way out.
 */
function CashCallout({ p }: { p: PersonaData }) {
  const moment = useMunim((s) => s.moment)
  const actions = useMunim((s) => s.actions)
  const hdfc = p.banks.find((b) => b.id === p.buffer.accountId)
  if (!hdfc) return null
  if (moment < 3) {
    if (hdfc.balance <= p.buffer.amount) return null
    return <ScreenCallout icon={<TriangleAlert size={16} />}>{idleCallout(p)}</ScreenCallout>
  }
  const spare = spareAfterCommitments(p, actions)
  if (spare >= SWEEP_STEP) return <ScreenCallout icon={<TriangleAlert size={16} />}>{moneyCopy.spareCallout(fmtINR(spare))}</ScreenCallout>
  return (
    <ScreenCallout tone="accent" icon={<CircleCheck size={16} />}>
      {spare > 0 ? moneyCopy.spareSmall(fmtINR(spare)) : moneyCopy.spareNone}
    </ScreenCallout>
  )
}
