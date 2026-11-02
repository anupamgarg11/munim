import type { ComponentType, SVGProps } from 'react'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
}

interface Props<T extends string> {
  label: string
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
}

/** Two or more mutually exclusive buttons in a pill (Phone / Wide, WhatsApp | Munim). */
export function SegmentedControl<T extends string>({ label, options, value, onChange, size = 'md' }: Props<T>) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-1.5 text-sm'
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full bg-line/70 p-0.5">
      {options.map((o) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-colors ${pad} ${
              active ? 'bg-card text-ink shadow-soft' : 'text-muted hover:text-ink'
            }`}
          >
            {Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
