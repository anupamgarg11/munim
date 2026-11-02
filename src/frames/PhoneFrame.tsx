import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useElementSize } from '../lib/useElementSize'
import { StatusBar } from '../components/StatusBar'
import { AS_OF } from '../data/persona'
import { fmtTime } from '../lib/format'

/** Screen 390 x 844 (SPEC 8) inside a 12px bezel. */
export const SCREEN_W = 390
export const SCREEN_H = 844
const BEZEL = 12
const OUTER_W = SCREEN_W + BEZEL * 2
const OUTER_H = SCREEN_H + BEZEL * 2
/** Height of the home-indicator zone the content must leave clear */
const HOME_ZONE = 34

interface Props {
  label: string
  statusBackground: string
  statusTone: 'light' | 'dark'
  children: ReactNode
}

/**
 * A phone with a notch, scaled down to fit its parent (never up). The parent must
 * have a definite size; the frame centres itself in it.
 */
export function PhoneFrame({ label, statusBackground, statusTone, children }: Props) {
  const cellRef = useRef<HTMLDivElement>(null)
  const { width, height } = useElementSize(cellRef)
  const scale = width > 0 && height > 0 ? Math.min(1, width / OUTER_W, height / OUTER_H) : 0

  return (
    <div ref={cellRef} className="flex h-full w-full min-h-0 min-w-0 items-center justify-center">
      {scale > 0 && (
        <div className="relative shrink-0" style={{ width: OUTER_W * scale, height: OUTER_H * scale }}>
          <div
            role="group"
            aria-label={label}
            className="absolute left-0 top-0 rounded-[56px] bg-device shadow-device"
            style={{ width: OUTER_W, height: OUTER_H, padding: BEZEL, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <div
              className="relative flex flex-col overflow-hidden rounded-[44px] bg-card"
              style={{ width: SCREEN_W, height: SCREEN_H, '--safe-bottom': `${HOME_ZONE}px` } as CSSProperties}
            >
              <StatusBar time={fmtTime(AS_OF, { ampm: false })} background={statusBackground} tone={statusTone} />
              <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
              {/* Notch */}
              <div aria-hidden="true" className="absolute left-1/2 top-0 h-[30px] w-[160px] -translate-x-1/2 rounded-b-[18px] bg-device" />
              {/* Home indicator */}
              <div aria-hidden="true" className="pointer-events-none absolute bottom-2 left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-ink/85" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
