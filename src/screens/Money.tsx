import { Card } from '../components/Card'
import { ScreenTitle } from '../components/ScreenTitle'
import { screens, tabs } from '../copy/shell'
import { AS_OF } from '../data/persona'
import { selectNetWorth } from '../data/derived'
import { fmtAsOf, fmtINR } from '../lib/format'
import { useMunim } from '../store'

// Persona data is static, so the breakdown is computed once.
const nw = selectNetWorth()

const ROWS: { label: string; amount: number }[] = [
  { label: screens.money.cash, amount: nw.cash },
  { label: screens.money.investments, amount: nw.investments },
  { label: screens.money.loans, amount: -nw.loans },
  { label: screens.money.cardDues, amount: -nw.cardDues },
]

/** Placeholder: computed net worth with its "as of" line and the four parts. */
export function MoneyScreen() {
  const setTab = useMunim((s) => s.setTab)
  return (
    <>
      <ScreenTitle>{tabs.money}</ScreenTitle>
      <Card>
        <p className="text-sm font-medium text-muted">{screens.money.netWorth}</p>
        <p className="num text-[32px] font-semibold leading-tight tracking-tight text-ink">{fmtINR(nw.total)}</p>
        <p className="num mt-1 text-xs text-muted">
          {fmtAsOf(AS_OF)} ·{' '}
          <button type="button" onClick={() => setTab('trust')} className="font-medium text-accent underline-offset-2 hover:underline">
            {screens.money.sources}
          </button>
        </p>
      </Card>
      <Card className="p-0">
        <ul className="divide-y divide-line">
          {ROWS.map((r) => (
            <li key={r.label} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-ink">{r.label}</span>
              <span className={`num font-medium ${r.amount < 0 ? 'text-negative' : 'text-ink'}`}>{fmtINR(r.amount)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
