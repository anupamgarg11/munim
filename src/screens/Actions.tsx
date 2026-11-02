import { useEffect, useMemo } from 'react'
import { EmptyState } from '../components/EmptyState'
import { ScreenTitle } from '../components/ScreenTitle'
import { ScreenShell } from '../components/ScreenShell'
import { tabs } from '../copy/shell'
import { actionsCopy, actionTypeLabel } from '../copy/screens'
import { useMunim } from '../store'
import type { ActionCard, ActionType } from '../types'
import { GROUP_ORDER, groupOf, type ActionGroup } from './selectors'
import { useUi } from './uiStore'
// The full card: approve (tap or the UPI PIN sheet), Cancel with the live countdown, Retry,
// View receipt; it scrolls into view and pulses itself on a deep link.
import { ActionCard as ActionRowView } from '../components/ActionCard'

const lastAt = (a: ActionCard) => a.timeline[a.timeline.length - 1]?.at ?? a.createdAt

/** Within a group: held by the soonest run, the rest by their latest event, newest first. */
function sortGroup(group: ActionGroup, xs: ActionCard[]): ActionCard[] {
  if (group === 'held') return [...xs].sort((a, b) => (a.holdEndsAt ?? Infinity) - (b.holdEndsAt ?? Infinity))
  return [...xs].sort((a, b) => lastAt(b).localeCompare(lastAt(a)))
}

/** SPEC 3.3: the timeline of action cards, grouped, with type filters. */
export function ActionsScreen() {
  const actions = useMunim((s) => s.actions)
  const highlighted = useMunim((s) => s.highlightedActionId)
  const filter = useUi((s) => s.actionsFilter)
  const setFilter = useUi((s) => s.setActionsFilter)

  const types = useMemo(() => {
    const present = new Set(actions.map((a) => a.type))
    return (Object.keys(actionTypeLabel) as ActionType[]).filter((t) => present.has(t))
  }, [actions])
  const active = filter !== 'all' && !types.includes(filter) ? 'all' : filter
  const shown = active === 'all' ? actions : actions.filter((a) => a.type === active)

  // A deep link must never land on a card the filter hides.
  useEffect(() => {
    if (highlighted && active !== 'all' && !shown.some((a) => a.id === highlighted)) setFilter('all')
  }, [highlighted, active, shown, setFilter])

  return (
    <ScreenShell>
      <ScreenTitle>{tabs.actions}</ScreenTitle>
      {actions.length === 0 ? (
        <EmptyState>{actionsCopy.empty}</EmptyState>
      ) : (
        <>
          <div role="group" aria-label={actionsCopy.filterLabel} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {(['all', ...types] as const).map((t) => {
              const on = t === active
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(t)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    on ? 'border-accent bg-accent text-white' : 'border-line bg-card text-muted hover:text-ink'
                  }`}
                >
                  {t === 'all' ? actionsCopy.all : actionTypeLabel[t]}
                </button>
              )
            })}
          </div>
          {shown.length === 0 && <EmptyState>{actionsCopy.emptyFilter}</EmptyState>}
          {GROUP_ORDER.map((g) => {
            const xs = sortGroup(
              g,
              shown.filter((a) => groupOf(a) === g),
            )
            if (xs.length === 0) return null
            return (
              <section key={g} aria-labelledby={`group-${g}`} className="flex flex-col gap-2 pt-1">
                <div className="px-1">
                  <h2 id={`group-${g}`} className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {actionsCopy.groups[g]}
                    <span className="num rounded-full bg-card px-2 text-xs font-medium text-muted shadow-soft">{xs.length}</span>
                  </h2>
                  <p className="text-xs text-muted">{actionsCopy.groupNotes[g]}</p>
                </div>
                {xs.map((a) => (
                  <ActionRowView key={a.id} card={a} />
                ))}
              </section>
            )
          })}
        </>
      )}
    </ScreenShell>
  )
}
