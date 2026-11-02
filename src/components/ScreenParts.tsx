import type { ReactNode } from 'react'
import type { Tone } from '../screens/selectors'

/* Small building blocks shared by the five app screens. */

const CARD_TONE = {
  default: 'bg-card shadow-soft',
  soft: 'bg-accent-soft',
  outline: 'border border-dashed border-line bg-card',
  danger: 'border border-negative/30 bg-card',
} as const

/**
 * The screens' card. Variants instead of className overrides: Tailwind orders p-0 before
 * p-4 (and bg-accent-soft before bg-card), so overriding the shared Card does not take.
 * `flush` drops the padding for edge-to-edge row lists.
 */
export function ScreenCard({
  children,
  flush = false,
  tone = 'default',
  className = '',
}: {
  children: ReactNode
  flush?: boolean
  tone?: keyof typeof CARD_TONE
  className?: string
}) {
  return <div className={`rounded-card ${CARD_TONE[tone]} ${flush ? 'overflow-hidden' : 'p-4'} ${className}`}>{children}</div>
}

/** Section heading with an optional figure on the right. */
export function ScreenSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 pt-2">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {aside && <span className="num text-sm font-medium text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

/** Sub-heading inside a card list. */
export function ScreenSubhead({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 bg-bg/60 px-4 py-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{children}</p>
      {aside && <p className="num text-xs font-medium text-muted">{aside}</p>}
    </div>
  )
}

const TAG_TONE = {
  neutral: 'border-line bg-card text-muted',
  accent: 'border-accent/30 bg-accent-soft text-accent',
  warning: 'border-warning/40 bg-card text-warning',
  negative: 'border-negative/40 bg-card text-negative',
  positive: 'border-positive/40 bg-card text-positive',
} as const

/** Small pill: Direct, Regular, Unused 11 weeks, Consented. Tinted only where contrast allows. */
export function ScreenTag({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof TAG_TONE }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 ${TAG_TONE[tone]}`}>
      {children}
    </span>
  )
}

export const toneText = (tone?: Tone) =>
  tone === 'warning' ? 'text-warning' : tone === 'negative' ? 'text-negative' : tone === 'positive' ? 'text-positive' : 'text-ink'

interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
}

/** On/off switch (role="switch"). */
export function ScreenToggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-accent' : 'bg-muted/75'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-[3px] h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${checked ? 'translate-x-[18px]' : ''}`}
      />
    </button>
  )
}

/** Callout line inside a card: icon on the left, ink text (tints would break contrast). */
export function ScreenCallout({ icon, children, tone = 'warning' }: { icon: ReactNode; children: ReactNode; tone?: 'warning' | 'accent' | 'negative' }) {
  const bar = tone === 'warning' ? 'border-warning text-warning' : tone === 'negative' ? 'border-negative text-negative' : 'border-accent text-accent'
  return (
    <div className={`flex items-start gap-2 rounded-button border-l-4 bg-card px-3 py-2.5 shadow-soft ${bar}`}>
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <p className="text-sm leading-snug text-ink">{children}</p>
    </div>
  )
}

/** Label and value row inside a card. */
export function ScreenFact({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className={`num text-right font-medium ${toneText(tone)}`}>{value}</dd>
    </div>
  )
}

/** Primary and secondary buttons used in sheets and cards. */
export function ScreenButton({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'link'
  disabled?: boolean
}) {
  const style = {
    primary: 'bg-accent text-white hover:brightness-110 px-4 py-2.5',
    secondary: 'bg-bg text-ink hover:bg-line px-4 py-2.5',
    danger: 'bg-negative text-white hover:brightness-110 px-4 py-2.5',
    link: 'text-accent underline-offset-2 hover:underline px-0 py-0',
  }[variant]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-button text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${style}`}
    >
      {children}
    </button>
  )
}
