import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useMunim } from '../store'
import { commentary, demoBar } from '../copy/shell'
import { commentaryLabels } from '../copy/moments'
import { commentaryFor } from '../demo/moments'

/** Laptop right column: the current moment's principle, edge case and metric (SPEC 7). Collapses to a narrow rail. */
export function CommentaryPanel() {
  const open = useMunim((s) => s.commentaryOpen)
  const setOpen = useMunim((s) => s.setCommentaryOpen)
  const moment = useMunim((s) => s.moment)
  const lines = commentaryFor(moment)

  if (!open) {
    return (
      <aside aria-label={commentary.title} className="flex w-11 flex-col items-center pt-9">
        <button
          type="button"
          aria-expanded={false}
          aria-label={commentary.show}
          onClick={() => setOpen(true)}
          className="rounded-button bg-card p-2 text-muted shadow-soft hover:text-ink"
        >
          <PanelRightOpen size={18} aria-hidden="true" />
        </button>
      </aside>
    )
  }

  return (
    <aside aria-label={commentary.title} className="flex w-[320px] min-h-0 flex-col pt-9">
      <div className="flex min-h-0 flex-1 flex-col rounded-card bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">{commentary.title}</h2>
            <p className="num text-xs text-muted">{demoBar.momentLabel(moment)}</p>
          </div>
          <button
            type="button"
            aria-expanded={true}
            aria-label={commentary.hide}
            onClick={() => setOpen(false)}
            className="rounded-button p-1.5 text-muted hover:bg-bg hover:text-ink"
          >
            <PanelRightClose size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {lines ? (
            <dl key={moment} className="animate-fade-in flex flex-col gap-4">
              {(['principle', 'edge', 'metric'] as const).map((k) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-accent">{commentaryLabels[k]}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink">{lines[k]}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm leading-relaxed text-muted">{moment === 0 ? commentary.placeholder : commentaryLabels.empty}</p>
          )}
        </div>
      </div>
    </aside>
  )
}
