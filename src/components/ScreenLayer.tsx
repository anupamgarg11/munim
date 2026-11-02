import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { common } from '../copy/screens'

/*
  Overlays inside the Munim app (sheets and toasts) without touching the frames.
  ScreenLayer is a zero-height sticky anchor at the top of the screen's scroll area;
  its child box is measured to cover exactly the visible part of that area, so a sheet
  or toast sits inside the phone (scaled or not) and inside the wide view alike.
  It must be the first child of the screen (ScreenShell puts it there).
*/
export function ScreenLayer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ left: number; width: number; height: number } | null>(null)

  useLayoutEffect(() => {
    const anchor = ref.current
    const main = anchor?.closest('main')
    if (!anchor || !main) return
    const measure = () => {
      const mr = main.getBoundingClientRect()
      const ar = anchor.getBoundingClientRect()
      // The phone frame scales its contents; rects are scaled, clientWidth is not.
      const scale = main.offsetWidth > 0 ? mr.width / main.offsetWidth : 1
      setBox({ left: (mr.left - ar.left) / (scale || 1), width: main.clientWidth, height: main.clientHeight })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(main)
    return () => ro.disconnect()
  }, [])

  return (
    // -mt-4 cancels the column's top padding; mb-1 plus the column gap restores it for the next child.
    <div ref={ref} className="pointer-events-none sticky top-0 z-30 -mt-4 mb-1 h-0">
      {box && (
        <div className="absolute top-0" style={{ left: box.left, width: box.width, height: box.height }}>
          {children}
        </div>
      )}
    </div>
  )
}

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** Bottom sheet over the visible screen. Escape or the backdrop closes it. */
export function ScreenSheet({ title, onClose, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>('button, [href], input')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onClose])

  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col justify-end bg-ink/40" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in mx-auto w-full max-w-[480px] rounded-t-card bg-card px-4 pb-6 pt-4 shadow-device"
      >
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
    </div>
  )
}
