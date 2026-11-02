import type { ComponentType } from 'react'
import { TopBar } from '../components/TopBar'
import { TabBar } from '../components/TabBar'
import { useMunim } from '../store'
import { HomeScreen } from '../screens/Home'
import { MoneyScreen } from '../screens/Money'
import { ActionsScreen } from '../screens/Actions'
import { RulesScreen } from '../screens/Rules'
import { TrustScreen } from '../screens/Trust'
import { Onboarding, useShowOnboarding } from '../demo/Onboarding'
import type { Tab } from '../types'

const SCREENS: Record<Tab, ComponentType> = {
  home: HomeScreen,
  money: MoneyScreen,
  actions: ActionsScreen,
  rules: RulesScreen,
  trust: TrustScreen,
}

/** The Munim app: top bar, the current tab's screen, bottom tab bar. Before connecting (moment 0 and 1), the onboarding. */
export function MunimSurface({ wide = false }: { wide?: boolean }) {
  const tab = useMunim((s) => s.tab)
  const onboarding = useShowOnboarding()
  const Screen = SCREENS[tab]
  if (onboarding) return <Onboarding wide={wide} />
  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <TopBar />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div key={tab} className={`animate-fade-in mx-auto flex flex-col gap-3 px-4 py-4 ${wide ? 'max-w-[720px]' : ''}`}>
          <Screen />
        </div>
      </main>
      <TabBar />
    </div>
  )
}
