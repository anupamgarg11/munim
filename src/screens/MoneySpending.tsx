import { Check, Sparkles, TriangleAlert } from 'lucide-react'
import { MoneyRow } from '../components/MoneyRow'
import { ScreenCallout, ScreenCard, ScreenSection, ScreenSubhead, ScreenTag } from '../components/ScreenParts'
import { ScreenSheet } from '../components/ScreenLayer'
import { common, moneyCopy } from '../copy/screens'
import * as P from '../data/persona'
import { selectWallets, sum } from '../data/derived'
import { fmtDate, fmtINR } from '../lib/format'
import { useMunim } from '../store'
import { caps, recentSpends, type SpendCategoryId, type SpendTxn } from './screenData'
import { diwaliBudget, diwaliSpent, monthName, spendThisMonth, txnCategory } from './selectors'
import { useUi, type HoldingRef } from './uiStore'

function Bar({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
      <div className={`h-full rounded-full ${spent > budget ? 'bg-warning' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** SPEC 9.3 Spending: this month against budget, Diwali, recent (with corrections), wallets, subscriptions. */
export function MoneySpending({ open, onEdit }: { open: (ref: HoldingRef) => void; onEdit: (t: SpendTxn) => void }) {
  const overrides = useUi((s) => s.categoryOverrides)
  const moment = useMunim((s) => s.moment)
  const rows = spendThisMonth(overrides)
  const spent = sum(rows.map((r) => r.spent))
  const budget = sum(rows.map((r) => r.budget))
  const dSpent = diwaliSpent()
  const unused = P.subscriptions.filter((s) => s.unusedFor)

  return (
    <ScreenSection title={moneyCopy.spending} aside={moneyCopy.spentOf(fmtINR(spent), fmtINR(budget))}>
      <ScreenCard flush>
        <ScreenSubhead>{moneyCopy.thisMonth(monthName(P.AS_OF))}</ScreenSubhead>
        <ul className="divide-y divide-line">
          {rows.map((r) => {
            const over = r.spent - r.budget
            return (
              <li key={r.id} className="px-4 py-2.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink">{r.label}</span>
                  <span className="num text-ink">{moneyCopy.spentOf(fmtINR(r.spent), fmtINR(r.budget))}</span>
                </div>
                <Bar spent={r.spent} budget={r.budget} />
                <p className={`num mt-1 text-xs ${over > 0 ? 'text-warning' : 'text-muted'}`}>
                  {over > 0 ? moneyCopy.over(fmtINR(over)) : moneyCopy.left(fmtINR(-over))}
                </p>
              </li>
            )
          })}
        </ul>
      </ScreenCard>

      <ScreenCard>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">{moneyCopy.diwali}</h3>
          <span className="num text-sm text-ink">{moneyCopy.spentOf(fmtINR(dSpent), fmtINR(diwaliBudget.amount))}</span>
        </div>
        <p className="num text-xs text-muted">{moneyCopy.diwaliFor(fmtDate(diwaliBudget.date))}</p>
        <Bar spent={dSpent} budget={diwaliBudget.amount} />
        <p className="mt-1 text-xs text-muted">
          {moment >= diwaliBudget.earmarkedAtMoment ? moneyCopy.diwaliEarmarked : moneyCopy.diwaliPending}
        </p>
      </ScreenCard>

      <ScreenCard flush>
        <ScreenSubhead>{moneyCopy.recent}</ScreenSubhead>
        <p className="px-4 pt-2 text-xs text-muted">{moneyCopy.recentHint}</p>
        <ul className="divide-y divide-line">
          {recentSpends.map((t) => {
            const cat = txnCategory(t, overrides)
            const corrected = overrides[t.merchantId] !== undefined
            return (
              <li key={t.id}>
                <MoneyRow
                  title={common.dot(`${t.merchant} ${fmtINR(t.amount)}`, moneyCopy.spendCategory[cat])}
                  subtitle={fmtDate(t.at)}
                  tags={corrected ? <ScreenTag tone="accent">{moneyCopy.correctedTag}</ScreenTag> : undefined}
                  onOpen={() => onEdit(t)}
                />
              </li>
            )
          })}
        </ul>
      </ScreenCard>

      <ScreenCard flush>
        <ScreenSubhead aside={fmtINR(selectWallets())}>{moneyCopy.wallets}</ScreenSubhead>
        <ul className="divide-y divide-line">
          {P.wallets.map((w) => (
            <li key={w.id}>
              <MoneyRow title={w.name} amount={fmtINR(w.balance)} onOpen={() => open({ kind: 'wallet', id: w.id })} />
            </li>
          ))}
        </ul>
        <p className="num border-t border-line px-4 py-2.5 text-xs text-muted">{moneyCopy.walletsNote(fmtINR(caps.reservePayMonthly))}</p>
      </ScreenCard>

      <ScreenCard flush>
        <ScreenSubhead aside={common.perMonth(fmtINR(sum(P.subscriptions.map((s) => s.monthly))))}>{moneyCopy.subscriptions}</ScreenSubhead>
        <ul className="divide-y divide-line">
          {P.subscriptions.map((s) => (
            <li key={s.id}>
              <MoneyRow
                title={s.name}
                amount={common.perMonth(fmtINR(s.monthly))}
                tags={s.unusedFor ? <ScreenTag tone="warning">{moneyCopy.unusedFor(s.unusedFor)}</ScreenTag> : undefined}
                onOpen={() => open({ kind: 'subscription', id: s.id })}
              />
            </li>
          ))}
        </ul>
      </ScreenCard>
      {unused.length > 0 && (
        <ScreenCallout icon={<TriangleAlert size={16} />}>
          {moneyCopy.unusedCallout(
            common.list(unused.map((s) => s.name)),
            fmtINR(sum(unused.map((s) => s.monthly))),
          )}
        </ScreenCallout>
      )}
    </ScreenSection>
  )
}

/** SPEC 9.5: fix a merchant's category once; it applies from now on. */
export function CategorySheet({ txn, onClose }: { txn: SpendTxn; onClose: () => void }) {
  const overrides = useUi((s) => s.categoryOverrides)
  const setCategory = useUi((s) => s.setCategory)
  const showToast = useMunim((s) => s.showToast)
  const current = txnCategory(txn, overrides)
  const choose = (cat: SpendCategoryId) => {
    if (cat !== current) {
      setCategory(txn.merchantId, cat)
      showToast(moneyCopy.categoryToast(txn.merchant, moneyCopy.spendCategory[cat]), { tone: 'success' })
    }
    onClose()
  }
  return (
    <ScreenSheet title={moneyCopy.categorySheetTitle(txn.merchant)} onClose={onClose}>
      <p className="flex items-start gap-2 text-sm text-muted">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
        {moneyCopy.categorySheetNote}
      </p>
      <ul role="radiogroup" aria-label={moneyCopy.categorySheetTitle(txn.merchant)} className="mt-3 flex flex-col divide-y divide-line rounded-button border border-line">
        {(Object.keys(moneyCopy.spendCategory) as SpendCategoryId[]).map((c) => {
          const on = c === current
          return (
            <li key={c}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(c)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-ink hover:bg-bg"
              >
                <span className={on ? 'font-semibold' : ''}>{moneyCopy.spendCategory[c]}</span>
                {on && <Check size={16} className="text-accent" aria-hidden="true" />}
              </button>
            </li>
          )
        })}
      </ul>
    </ScreenSheet>
  )
}
