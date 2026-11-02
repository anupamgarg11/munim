import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useMunim } from '../store'
import { commentary, demoBar } from '../copy/shell'

/** Laptop right column. Collapses to a narrow rail. Content per moment arrives later. */
export function CommentaryPanel() {
  const open = useMunim((s) => s.commentaryOpen)
  const setOpen = useMunim((s) => s.setCommentaryOpen)
  const moment = useMunim((s) => s.moment)

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
          <p className="text-sm leading-relaxed text-muted">{commentary.placeholder}</p>
        </div>
      </div>
    </aside>
  )
}
