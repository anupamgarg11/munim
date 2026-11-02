import type { ComponentType } from 'react'
import { PauseCircle } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { TabBar } from '../components/TabBar'
import { PinSheetHost } from '../components/PinSheet'
import { ToastHost } from '../components/Toast'
import { useMunim } from '../store'
import { HomeScreen } from '../screens/Home'
import { MoneyScreen } from '../screens/Money'
import { ActionsScreen } from '../screens/Actions'
import { RulesScreen } from '../screens/Rules'
import { TrustScreen } from '../screens/Trust'
import { Onboarding, useShowOnboarding } from '../demo/Onboarding'
import { rulesCopy } from '../copy/screens'
import type { Tab } from '../types'

const SCREENS: Record<Tab, ComponentType> = {
  home: HomeScreen,
  money: MoneyScreen,
  actions: ActionsScreen,
  rules: RulesScreen,
  trust: TrustScreen,
}

/*
  The Munim app: top bar, the current tab's screen, bottom tab bar. Before connecting (moment
  0 and 1), the onboarding. The app's own overlays are mounted here once, inside the app frame
  (the phone frame on a laptop, the full width on a phone), never in a chat bubble: the UPI PIN
  sheet and the toasts.
*/
export function MunimSurface({ wide = false }: { wide?: boolean }) {
  const tab = useMunim((s) => s.tab)
  const onboarding = useShowOnboarding()
  const Screen = SCREENS[tab]
  return (
    <div className="relative flex h-full min-h-0 flex-col bg-bg">
      {onboarding ? (
        <Onboarding wide={wide} />
      ) : (
        <>
          <TopBar />
          <KillSwitchStrip />
          <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
            <div key={tab} className={`animate-fade-in mx-auto flex flex-col gap-3 px-4 py-4 ${wide ? 'max-w-[720px]' : ''}`}>
              <Screen />
            </div>
          </main>
          <TabBar />
        </>
      )}
      <ToastHost />
      <PinSheetHost />
    </div>
  )
}

/** SPEC 9.5: while the kill switch is on, every screen says so, one tap from Rules. */
function KillSwitchStrip() {
  const on = useMunim((s) => s.killSwitch)
  const tab = useMunim((s) => s.tab)
  const setTab = useMunim((s) => s.setTab)
  if (!on || tab === 'rules') return null
  return (
    <button
      type="button"
      onClick={() => setTab('rules')}
      className="flex shrink-0 items-center gap-2 border-b border-negative/20 bg-negative/5 px-4 py-2 text-left text-xs font-medium text-negative"
    >
      <PauseCircle size={14} aria-hidden="true" className="shrink-0" />
      <span className="min-w-0 flex-1">{rulesCopy.killStrip}</span>
      <span className="shrink-0 underline underline-offset-2">{rulesCopy.killStripOpen}</span>
    </button>
  )
}
