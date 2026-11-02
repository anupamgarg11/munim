import { useCallback, useState } from 'react'
import { OctagonPause, PauseCircle } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { ScreenTitle } from '../components/ScreenTitle'
import { ScreenShell } from '../components/ScreenShell'
import { ScreenSheet } from '../components/ScreenLayer'
import { ScreenButton, ScreenCallout, ScreenCard, ScreenTag, ScreenToggle } from '../components/ScreenParts'
import { tabs } from '../copy/shell'
import { rulesCopy } from '../copy/screens'
import { ruleSentence } from '../data/derived'
import { fmtDateTime, fmtINR } from '../lib/format'
import { useMunim } from '../store'
import type { Rule } from '../types'

/** SPEC 3.4: Autopilot rules as sentences, with caps, rail, last run, a toggle, and the kill switch. */
export function RulesScreen() {
  const rules = useMunim((s) => s.rules)
  const setRules = useMunim((s) => s.setRules)
  const killSwitch = useMunim((s) => s.killSwitch)
  const setKillSwitch = useMunim((s) => s.setKillSwitch)
  const actions = useMunim((s) => s.actions)
  const showToast = useMunim((s) => s.showToast)
  const [confirming, setConfirming] = useState(false)
  const close = useCallback(() => setConfirming(false), [])

  const heldCount = actions.filter((a) => a.status === 'held').length
  const enabledCount = rules.filter((r) => r.enabled).length

  // The store's kill switch pauses the rules and cancels every held action (SPEC 4).
  const pauseAll = () => {
    setKillSwitch(true)
    setConfirming(false)
    showToast(rulesCopy.pausedToast, { tone: 'warning' })
  }

  const toggle = (id: string, enabled: boolean) => setRules(rules.map((r) => (r.id === id ? { ...r, enabled } : r)))

  const sheet = confirming && (
    <ScreenSheet title={rulesCopy.confirmTitle} onClose={close}>
      <p className="text-sm leading-relaxed text-muted">{rulesCopy.confirmBody(enabledCount, heldCount)}</p>
      <div className="mt-4 flex flex-col gap-2">
        <ScreenButton variant="danger" onClick={pauseAll}>
          {rulesCopy.confirmYes}
        </ScreenButton>
        <ScreenButton variant="secondary" onClick={close}>
          {rulesCopy.confirmNo}
        </ScreenButton>
      </div>
    </ScreenSheet>
  )

  return (
    <ScreenShell overlay={sheet}>
      <ScreenTitle>{tabs.rules}</ScreenTitle>

      {killSwitch ? (
        <div role="status" className="flex flex-col gap-2">
          <ScreenCallout tone="negative" icon={<PauseCircle size={18} />}>
            {rulesCopy.killOnBanner}
          </ScreenCallout>
          <ScreenButton
            variant="secondary"
            onClick={() => {
              setKillSwitch(false)
              showToast(rulesCopy.resumedToast, { tone: 'success' })
            }}
          >
            {rulesCopy.resume}
          </ScreenButton>
        </div>
      ) : (
        <ScreenCard className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-negative/40 text-negative" aria-hidden="true">
            <OctagonPause size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink">{rulesCopy.killTitle}</h2>
            <p className="text-xs leading-snug text-muted">{rulesCopy.killOffNote}</p>
          </div>
          <ScreenButton variant="danger" onClick={() => setConfirming(true)}>
            {rulesCopy.killButton}
          </ScreenButton>
        </ScreenCard>
      )}

      <p className="px-1 text-sm leading-relaxed text-muted">{rulesCopy.intro}</p>

      {rules.length === 0 ? (
        <EmptyState>{rulesCopy.empty}</EmptyState>
      ) : (
        rules.map((r) => <RuleCard key={r.id} rule={r} paused={killSwitch} onToggle={(on) => toggle(r.id, on)} />)
      )}
    </ScreenShell>
  )
}

function RuleCard({ rule, paused, onToggle }: { rule: Rule; paused: boolean; onToggle: (on: boolean) => void }) {
  const facts: [string, string][] = [
    [rulesCopy.capPerRun, fmtINR(rule.capPerRun)],
    [rulesCopy.capPerMonth, fmtINR(rule.capPerMonth)],
    [rulesCopy.rail, rule.rail],
    [rulesCopy.lastRun, rule.lastRun ? fmtDateTime(rule.lastRun) : rulesCopy.never],
    [rulesCopy.nextExpected, rule.nextExpected ? fmtDateTime(rule.nextExpected) : rulesCopy.none],
  ]
  return (
    <article className={`rounded-card bg-card p-4 shadow-soft ${paused ? 'border border-dashed border-line' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{rule.name}</h3>
          {paused ? (
            <ScreenTag tone="warning">{rulesCopy.paused}</ScreenTag>
          ) : (
            !rule.enabled && <ScreenTag>{rulesCopy.off}</ScreenTag>
          )}
        </div>
        <ScreenToggle checked={rule.enabled && !paused} disabled={paused} onChange={onToggle} label={rulesCopy.enabled(rule.name)} />
      </div>
      <p className="mt-2 text-[15px] leading-snug text-ink">{ruleSentence(rule)}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-line pt-3 text-sm">
        {facts.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="num text-right font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
