import { EmptyState } from '../components/EmptyState'
import { ScreenTitle } from '../components/ScreenTitle'
import { screens, tabs } from '../copy/shell'

/** Placeholder: Autopilot rules, caps and the kill switch arrive later. */
export function RulesScreen() {
  return (
    <>
      <ScreenTitle>{tabs.rules}</ScreenTitle>
      <EmptyState>{screens.rules.empty}</EmptyState>
    </>
  )
}
