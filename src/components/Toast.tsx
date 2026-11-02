import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import { useMunim, type ToastOptions } from '../store'
import { toasts as copy } from '../copy/cards'
import type { ToastTone } from '../types'

/** Show a toast from anywhere (components, moments, the chat engine). Returns its id. */
export function toast(text: string, opts?: ToastOptions): string {
  return useMunim.getState().showToast(text, opts)
}

const TONE: Record<ToastTone, { icon: LucideIcon; color: string }> = {
  info: { icon: Info, color: 'text-white/80' },
  success: { icon: CircleCheck, color: 'text-[#86efac]' },
  warning: { icon: TriangleAlert, color: 'text-[#fcd34d]' },
  error: { icon: CircleAlert, color: 'text-[#fca5a5]' },
}

/**
 * Toast viewport. Mount once inside the Munim surface (its parent must be position: relative);
 * toasts sit near the bottom, newest last, and leave on their own. `bottom` defaults to clearing
 * the tab bar; pass '16px' when mounted inside a layer that already ends above it.
 */
export function ToastHost({ bottom = 'calc(72px + var(--safe-bottom, 0px))' }: { bottom?: string }) {
  const items = useMunim((s) => s.toasts)
  const dismiss = useMunim((s) => s.dismissToast)
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={copy.region}
      className="pointer-events-none absolute inset-x-0 z-40 flex flex-col items-center gap-2 px-4"
      style={{ bottom }}
    >
      {items.map((t) => {
        const { icon: Icon, color } = TONE[t.tone]
        return (
          <div
            key={t.id}
            className="on-dark animate-fade-in pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-ink py-2 pl-3.5 pr-1.5 text-sm text-white shadow-device"
          >
            <Icon size={16} aria-hidden="true" className={`shrink-0 ${color}`} />
            <span className="min-w-0">{t.text}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label={copy.dismiss}
              className="shrink-0 rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
