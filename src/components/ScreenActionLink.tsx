import { ChevronRight } from 'lucide-react'
import type { ActionCard } from '../types'
import { openAction } from '../screens/uiStore'
import { useActionStatusLine } from '../screens/useNow'
import { common } from '../copy/screens'

/** Compact, tappable action row (Home's Up next, Money's related actions). Opens the card on Actions. */
export function ScreenActionLink({ action }: { action: ActionCard }) {
  const status = useActionStatusLine(action)
  return (
    <button
      type="button"
      onClick={() => openAction(action.id)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{action.title}</span>
        <span className={`num block truncate text-xs ${status.tone}`}>{status.text}</span>
      </span>
      <span className="flex shrink-0 items-center text-xs font-medium text-accent">
        {common.view}
        <ChevronRight size={14} aria-hidden="true" />
      </span>
    </button>
  )
}
