import { createContext, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'

/*
  One container for every bottom sheet: the UPI PIN pad, the commentary, the category fix,
  the kill switch confirm, Delete everything and Dad's Account Aggregator page. It covers its
  nearest positioned parent (the Munim surface, or the phone layout's screen): a dim backdrop,
  then an opaque white panel anchored to the bottom with a 16px top radius, at most 85% of the
  parent's height, a drag handle and its own scroll. Backdrop tap and Escape close it.

  The look lives in plain CSS (index.css, .m-sheet-*) with literal colours, so it never depends
  on a utility class being generated, and the panel is opaque from its first frame: the enter
  motion only moves it a little, it never fades it.
*/

/** Open sheets, oldest first: Escape closes only the newest. */
const openSheets: symbol[] = []

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea'

/**
 * Screens portal their sheets into this element (mounted once in the Munim surface), so a
 * screen's sheet covers the whole app surface the way the UPI PIN sheet does.
 */
export const SheetHostContext = createContext<HTMLElement | null>(null)

interface Props {
  onClose: () => void
  /** id of the sheet's visible title; or pass `label` when it has none */
  labelledBy?: string
  label?: string
  /** On open, focus the panel itself (key handling on the panel) or the first match of `focusSelector` (default) */
  initialFocus?: 'panel' | 'first'
  focusSelector?: string
  /** Stacking within the parent: screen sheets 50, the PIN pad 55, the commentary 60 */
  zIndex?: number
  onKeyDown?: (e: ReactKeyboardEvent<HTMLDivElement>) => void
  children: ReactNode
}

export function BottomSheet({
  onClose,
  labelledBy,
  label,
  initialFocus = 'first',
  focusSelector = FOCUSABLE,
  zIndex = 50,
  onKeyDown,
  children,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  // Mount: focus inside, take Escape while newest; unmount: give focus back.
  const focusRef = useRef({ initialFocus, focusSelector })
  useEffect(() => {
    const id = Symbol('sheet')
    openSheets.push(id)
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current
    const { initialFocus: how, focusSelector: selector } = focusRef.current
    const target = how === 'panel' ? panel : (panel?.querySelector<HTMLElement>(selector) ?? panel)
    target?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || openSheets[openSheets.length - 1] !== id) return
      e.preventDefault()
      closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      const i = openSheets.indexOf(id)
      if (i >= 0) openSheets.splice(i, 1)
      if (prev?.isConnected) prev.focus({ preventScroll: true })
    }
  }, [])

  return (
    <div className="m-sheet-layer" style={{ zIndex }}>
      <div className="m-sheet-backdrop" aria-hidden="true" onClick={() => closeRef.current()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="m-sheet-panel"
      >
        <div className="m-sheet-handle" aria-hidden="true" />
        <div className="m-sheet-body no-scrollbar">{children}</div>
      </div>
    </div>
  )
}
