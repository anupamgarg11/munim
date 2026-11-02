import { useId } from 'react'
import { Info, X } from 'lucide-react'
import { useMunim } from '../store'
import { commentary, demoBar } from '../copy/shell'
import { commentaryLabels } from '../copy/moments'
import { commentaryFor } from '../demo/moments'
import { LAPTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import { BottomSheet } from './BottomSheet'

/*
  Phone layout (SPEC 3): the commentary is an "i" button in the Munim top bar and the
  WhatsApp header, opening a bottom sheet with the moment's title and its three lines
  (principle, edge case, metric). It shares the store's commentaryOpen with the laptop panel.
*/

/** The "i" button. Renders nothing on the laptop layout, which has the right panel. */
export function CommentaryButton({ tone }: { tone: 'light' | 'dark' }) {
  const laptop = useMediaQuery(LAPTOP_QUERY)
  const open = useMunim((s) => s.commentaryOpen)
  const setOpen = useMunim((s) => s.setCommentaryOpen)
  if (laptop) return null
  const color = tone === 'light' ? 'on-dark text-white/95 hover:bg-white/10' : 'text-muted hover:bg-bg hover:text-ink'
  return (
    <button
      type="button"
      aria-label={commentary.show}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={() => setOpen(true)}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${color}`}
    >
      <Info size={tone === 'light' ? 20 : 19} aria-hidden="true" />
    </button>
  )
}

/** The bottom sheet. Its parent must be position: relative (it covers the parent; see BottomSheet). */
export function CommentarySheet() {
  const open = useMunim((s) => s.commentaryOpen)
  const setOpen = useMunim((s) => s.setCommentaryOpen)
  const moment = useMunim((s) => s.moment)
  const lines = commentaryFor(moment)
  const titleId = useId()

  if (!open) return null
  const close = () => setOpen(false)
  return (
    <BottomSheet onClose={close} labelledBy={titleId} zIndex={60}>
      <div className="px-4 pb-5 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{commentary.title}</p>
            <h2 id={titleId} className="num mt-0.5 text-base font-semibold text-ink">
              {demoBar.momentLabel(moment)}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={commentary.hide}
            className="-mr-1 -mt-1 shrink-0 rounded-button p-1.5 text-muted hover:bg-bg hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {lines ? (
          <dl key={moment} className="mt-3 flex flex-col gap-3.5">
            {(['principle', 'edge', 'metric'] as const).map((k) => (
              <div key={k}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-accent">{commentaryLabels[k]}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-ink">{lines[k]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-muted">{moment === 0 ? commentary.placeholder : commentaryLabels.empty}</p>
        )}
      </div>
    </BottomSheet>
  )
}
