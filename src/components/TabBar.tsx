import { House, ListChecks, Repeat, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react'
import { useMunim } from '../store'
import { tabOrder, tabs } from '../copy/shell'
import type { Tab } from '../types'

const ICONS: Record<Tab, LucideIcon> = {
  home: House,
  money: Wallet,
  actions: ListChecks,
  rules: Repeat,
  trust: ShieldCheck,
}

/** Bottom tab bar. Pads for the device home indicator via --safe-bottom. */
export function TabBar() {
  const tab = useMunim((s) => s.tab)
  const setTab = useMunim((s) => s.setTab)
  return (
    <nav
      aria-label="Munim sections"
      className="grid shrink-0 grid-cols-5 border-t border-line bg-card"
      style={{ paddingBottom: 'var(--safe-bottom, env(safe-area-inset-bottom, 0px))' }}
    >
      {tabOrder.map((t) => {
        const Icon = ICONS[t]
        const active = t === tab
        return (
          <button
            key={t}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => setTab(t)}
            className={`flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[11px] font-medium transition-colors ${
              active ? 'text-accent' : 'text-muted hover:text-ink'
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
            {tabs[t]}
          </button>
        )
      })}
    </nav>
  )
}
