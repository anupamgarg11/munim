import { BatteryFull, Signal, Wifi } from 'lucide-react'

interface Props {
  time: string
  background: string
  tone: 'light' | 'dark'
}

/** Decorative phone status bar inside the device frame. */
export function StatusBar({ time, background, tone }: Props) {
  const color = tone === 'light' ? '#ffffff' : 'var(--m-ink)'
  return (
    <div
      aria-hidden="true"
      className="num flex h-[47px] shrink-0 items-center justify-between px-8 pt-1 text-[15px] font-semibold"
      style={{ background, color }}
    >
      <span>{time}</span>
      <span className="flex items-center gap-1.5">
        <Signal size={16} strokeWidth={2.25} />
        <Wifi size={16} strokeWidth={2.25} />
        <BatteryFull size={20} strokeWidth={1.75} />
      </span>
    </div>
  )
}
