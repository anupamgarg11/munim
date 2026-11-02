import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Compass, FastForward, RotateCcw, type LucideIcon } from 'lucide-react'
import { useMunim } from '../store'
import { demoBar, LAST_MOMENT } from '../copy/shell'

interface Props {
  variant: 'laptop' | 'phone'
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

/*
  Demo bar shell. Buttons only move the store's moment for now; moment playback,
  holds and free-explore behaviour arrive in later items.
*/
export function DemoBar({ variant, collapsed = false, onCollapsedChange }: Props) {
  const moment = useMunim((s) => s.moment)
  const setMoment = useMunim((s) => s.setMoment)
  const reset = useMunim((s) => s.reset)
  const freeExplore = useMunim((s) => s.freeExplore)
  const setFreeExplore = useMunim((s) => s.setFreeExplore)
  const phone = variant === 'phone'

  if (phone && collapsed) {
    return (
      <button
        type="button"
        aria-expanded={false}
        aria-label={demoBar.expand}
        onClick={() => onCollapsedChange?.(false)}
        className="on-dark num fixed right-3 z-40 inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-medium text-white shadow-device"
        style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}
      >
        {demoBar.pillLabel(moment)}
        <ChevronUp size={14} aria-hidden="true" />
      </button>
    )
  }

  const buttons: { key: string; label: string; icon: LucideIcon; onClick?: () => void; disabled?: boolean; pressed?: boolean; primary?: boolean; title?: string }[] = [
    { key: 'back', label: demoBar.back, icon: ChevronLeft, onClick: () => setMoment(moment - 1), disabled: moment === 0 },
    { key: 'next', label: demoBar.next, icon: ChevronRight, onClick: () => setMoment(moment + 1), disabled: moment === LAST_MOMENT, primary: true },
    { key: 'reset', label: demoBar.reset, icon: RotateCcw, onClick: reset },
    { key: 'skip', label: demoBar.skipWait, icon: FastForward, disabled: true, title: demoBar.skipWaitIdle },
    { key: 'free', label: demoBar.freeExplore, icon: Compass, onClick: () => setFreeExplore(!freeExplore), pressed: freeExplore },
  ]

  return (
    <section
      aria-label={demoBar.region}
      className={`on-dark shrink-0 bg-ink text-white ${phone ? 'px-3 pt-2' : 'px-6 py-2.5'}`}
      style={phone ? { paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' } : undefined}
    >
      <div className={phone ? 'flex flex-col gap-2' : 'mx-auto flex max-w-[1600px] items-center justify-between gap-4'}>
        <div className="flex items-center justify-between gap-2">
          <p aria-live="polite" className="num text-sm font-medium">
            {demoBar.momentLabel(moment)}
          </p>
          {phone && (
            <button
              type="button"
              aria-expanded={true}
              aria-label={demoBar.collapse}
              onClick={() => onCollapsedChange?.(true)}
              className="rounded-button p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <ChevronDown size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className={phone ? 'flex items-stretch justify-between gap-1' : 'flex items-center gap-2'}>
          {buttons.map((b) => {
            const Icon = b.icon
            const base = phone
              ? 'flex flex-col items-center gap-0.5 whitespace-nowrap rounded-button px-2 py-1.5 text-[11px]'
              : 'inline-flex items-center gap-1.5 rounded-button px-3 py-1.5 text-sm'
            const tone = b.primary
              ? 'bg-accent text-white hover:brightness-110'
              : b.pressed
                ? 'bg-white text-ink'
                : 'text-white/90 hover:bg-white/10'
            return (
              <button
                key={b.key}
                type="button"
                onClick={b.onClick}
                disabled={b.disabled}
                aria-pressed={b.pressed === undefined ? undefined : b.pressed}
                aria-label={b.label}
                title={b.title}
                className={`${base} ${tone} font-medium transition disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <Icon size={phone ? 18 : 16} aria-hidden="true" />
                {b.label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
