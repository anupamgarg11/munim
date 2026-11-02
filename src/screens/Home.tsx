import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ScreenTitle } from '../components/ScreenTitle'
import { screens, tabs } from '../copy/shell'
import { fmtINR } from '../lib/format'
import { useMunim } from '../store'

/** Placeholder: the Found this year counter (live from the store), Up next, the thread. */
export function HomeScreen() {
  const found = useMunim((s) => s.foundThisYear)
  return (
    <>
      <ScreenTitle>{tabs.home}</ScreenTitle>
      <Card className="bg-accent-soft shadow-none">
        <p className="text-sm font-medium text-accent">{screens.home.found}</p>
        <p className="num text-[28px] font-semibold tracking-tight text-ink">{fmtINR(found)}</p>
      </Card>
      <h2 className="px-1 pt-2 text-sm font-semibold text-ink">{screens.home.upNext}</h2>
      <EmptyState>{screens.home.upNextEmpty}</EmptyState>
      <EmptyState>{screens.home.threadEmpty}</EmptyState>
    </>
  )
}
