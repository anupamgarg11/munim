import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Tone } from '../screens/selectors'

interface Props {
  title: string
  subtitle?: string
  /** Already formatted; omitted when the title carries it */
  amount?: string
  amountTone?: Tone
  tags?: ReactNode
  /** Extra one-liners under the title (buffer line, regular-plan cost, SIP) */
  lines?: { text: string; tone?: Tone }[]
  onOpen?: () => void
}

const lineTone = (t?: Tone) => (t === 'warning' ? 'text-warning' : t === 'negative' ? 'text-negative' : t === 'positive' ? 'text-positive' : 'text-muted')

/** One holding or account in a Money list. Tappable when it has a detail view. */
export function MoneyRow({ title, subtitle, amount, amountTone, tags, lines, onOpen }: Props) {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-sm font-medium text-ink">{title}</span>
          {tags}
        </span>
        {subtitle && <span className="num block text-xs text-muted">{subtitle}</span>}
        {lines?.map((l) => (
          <span key={l.text} className={`num block text-xs ${lineTone(l.tone)}`}>
            {l.text}
          </span>
        ))}
      </span>
      {amount && <span className={`num shrink-0 text-sm font-medium ${amountTone ? lineTone(amountTone) : 'text-ink'}`}>{amount}</span>}
      {onOpen && <ChevronRight size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />}
    </>
  )
  return onOpen ? (
    <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-bg">
      {inner}
    </button>
  ) : (
    <div className="flex items-start gap-3 px-4 py-3">{inner}</div>
  )
}
