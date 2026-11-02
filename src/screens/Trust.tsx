import { EmptyState } from '../components/EmptyState'
import { ScreenTitle } from '../components/ScreenTitle'
import { screens, tabs } from '../copy/shell'

/** Placeholder: members, ledger, caps, data, plan and delete arrive later. */
export function TrustScreen() {
  return (
    <>
      <ScreenTitle>{tabs.trust}</ScreenTitle>
      <EmptyState>{screens.trust.empty}</EmptyState>
    </>
  )
}
