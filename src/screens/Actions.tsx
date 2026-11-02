import { EmptyState } from '../components/EmptyState'
import { ScreenTitle } from '../components/ScreenTitle'
import { screens, tabs } from '../copy/shell'

/** Placeholder: the actions timeline (Needs you, Held, Scheduled, Done) arrives later. */
export function ActionsScreen() {
  return (
    <>
      <ScreenTitle>{tabs.actions}</ScreenTitle>
      <EmptyState>{screens.actions.empty}</EmptyState>
    </>
  )
}
