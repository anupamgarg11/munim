import { useContext, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { common } from '../copy/screens'
import { BottomSheet, SheetHostContext } from './BottomSheet'

/*
  A screen's own overlay (its open sheet), portalled into the Munim surface's sheet host. The
  sheet then covers the whole app surface, top bar to tab bar, inside the phone frame (scaled or
  not) and inside the wide view alike, exactly like the UPI PIN sheet. ScreenShell mounts it.
*/
export function ScreenLayer({ children }: { children: ReactNode }) {
  const host = useContext(SheetHostContext)
  if (!host || !children) return null
  return createPortal(children, host)
}

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** A titled bottom sheet with a close button. Escape or the backdrop closes it. */
export function ScreenSheet({ title, onClose, children }: SheetProps) {
  const titleId = useId()
  return (
    <BottomSheet onClose={onClose} labelledBy={titleId}>
      <div className="px-4 pb-6 pt-1">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold text-ink">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={common.close} className="-mr-1 -mt-1 rounded-button p-1.5 text-muted hover:bg-bg hover:text-ink">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </BottomSheet>
  )
}
