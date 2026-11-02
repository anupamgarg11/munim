import { AS_OF } from '../data/persona'
import { appName } from '../copy/shell'
import { fmtAsOf } from '../lib/format'

/** Munim app top bar: wordmark and the freshness line. */
export function TopBar() {
  return (
    <header className="shrink-0 border-b border-line bg-card px-4 py-2.5">
      <p className="text-[17px] font-semibold tracking-tight text-accent">{appName}</p>
      <p className="num text-xs text-muted">{fmtAsOf(AS_OF)}</p>
    </header>
  )
}
