import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { useMunim } from '../store'
import { useUi } from '../screens/uiStore'
import { trustCopy } from '../copy/screens'
import { reset } from '../demo/runner'
import { ScreenLayer } from './ScreenLayer'
import { ScreenButton } from './ScreenParts'

/*
  Wraps every app screen: the screen's open sheet (portalled into MunimSurface's sheet host, so
  it covers the whole app surface), then either the screen or, after "Delete everything", the
  blank state. Toasts and the UPI PIN sheet are mounted once for the whole app, in MunimSurface.
*/
export function ScreenShell({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) {
  const deleted = useUi((s) => s.deleted)
  return (
    <>
      <ScreenLayer>{overlay}</ScreenLayer>
      {deleted ? <DeletedState /> : children}
    </>
  )
}

/** SPEC 9.5: after Delete everything, a blank state with "Start again" (back to the start, in the app). */
function DeletedState() {
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
          void reset().then(() => useMunim.getState().setSurface('app'))
        }}
      >
        {trustCopy.startAgain}
      </ScreenButton>
    </div>
  )
}
