import { useMunim } from '../store'
import { appName } from '../copy/shell'
import { fmtAsOf } from '../lib/format'
import { freshAsOf } from '../screens/selectors'
import { CommentaryButton } from './CommentarySheet'

/** Munim app top bar: wordmark, the freshness line (live data, demo clock) and, on a phone, the commentary "i". */
export function TopBar() {
  const asOf = useMunim((s) => s.persona.AS_OF)
  const clock = useMunim((s) => s.clock)
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-line bg-card px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-semibold tracking-tight text-accent">{appName}</p>
        <p className="num truncate text-xs text-muted">{fmtAsOf(freshAsOf(asOf, clock))}</p>
      </div>
      <CommentaryButton tone="dark" />
    </header>
  )
}
