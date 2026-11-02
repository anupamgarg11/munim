import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useMunim } from '../store'
import { found as copy } from '../copy/cards'
import { fmtINR } from '../lib/format'

const COUNT_MS = 600

const reducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Counts from the value on screen to the target over `ms` (ease-out). Jumps under reduced motion. */
export function useCountUp(target: number, ms = COUNT_MS): number {
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)

  useEffect(() => {
    const from = shownRef.current
    if (from === target) return
    if (reducedMotion()) {
      shownRef.current = target
      setShown(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const frame = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      const eased = 1 - (1 - p) ** 3
      const v = Math.round(from + (target - from) * eased)
      shownRef.current = v
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])

  return shown
}

interface Props {
  /** 'card' sits on Home; 'plain' drops the card chrome for embedding */
  variant?: 'card' | 'plain'
  className?: string
}

/** "₹82,400 found this year", with "Family: ₹7,200" when family savings exist. Computed from done cards. */
export function FoundCounter({ variant = 'card', className = '' }: Props) {
  const self = useMunim((s) => s.foundThisYear)
  const family = useMunim((s) => s.foundFamily)
  const shownSelf = useCountUp(self)
  const shownFamily = useCountUp(family)
  const chrome = variant === 'card' ? 'rounded-card bg-accent-soft p-4' : ''

  return (
    <section aria-label={copy.title} className={`${chrome} ${className}`}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <Sparkles size={18} aria-hidden="true" className="shrink-0 self-center text-accent" />
        <span aria-hidden="true" className="num text-[28px] font-semibold leading-tight tracking-tight text-ink">
          {fmtINR(shownSelf)}
        </span>
        <span aria-hidden="true" className="text-sm font-medium text-accent">
          {copy.line}
        </span>
        <span className="sr-only" aria-live="polite">
          {copy.full(self)}
        </span>
      </p>
      {family > 0 && (
        <p className="num mt-1 text-sm font-medium text-ink" title={copy.familyHint}>
          <span aria-hidden="true">{copy.family(shownFamily)}</span>
          <span className="sr-only">{copy.family(family)}</span>
        </p>
      )}
    </section>
  )
}
