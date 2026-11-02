import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { useMunim } from '../store'
import { useUi } from '../screens/uiStore'
import { trustCopy } from '../copy/screens'
import { ScreenLayer } from './ScreenLayer'
import { ToastHost } from './Toast'
import { ScreenButton } from './ScreenParts'

/*
  Wraps every app screen: the overlay layer first (toasts, plus the screen's open sheet),
  then either the screen or, after "Delete everything", the blank state.
  ToastHost (item 3) is mounted here because MunimSurface does not mount it yet; if the
  surface starts mounting it, drop it from here so toasts do not show twice.
*/
export function ScreenShell({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) {
  const deleted = useUi((s) => s.deleted)
  return (
    <>
      <ScreenLayer>
        <ToastHost bottom="16px" />
        {overlay}
      </ScreenLayer>
      {deleted ? <DeletedState /> : children}
    </>
  )
}

/** SPEC 9.5: after Delete everything, a blank state with "Start again". */
function DeletedState() {
  const reset = useMunim((s) => s.reset)
  const resetUi = useUi((s) => s.resetUi)
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-muted shadow-soft" aria-hidden="true">
        <Trash2 size={22} />
      </span>
      <h1 className="text-lg font-semibold text-ink">{trustCopy.deletedTitle}</h1>
      <p className="max-w-[280px] text-sm leading-relaxed text-muted">{trustCopy.deletedBody}</p>
      <ScreenButton
        onClick={() => {
          resetUi()
          reset()
        }}
      >
        {trustCopy.startAgain}
      </ScreenButton>
    </div>
  )
}
