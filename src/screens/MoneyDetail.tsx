import { useLayoutEffect, useRef } from 'react'
import { ChevronLeft, Database } from 'lucide-react'
import { ScreenActionLink } from '../components/ScreenActionLink'
import { ScreenButton, ScreenCard, ScreenFact, ScreenSection } from '../components/ScreenParts'
import { moneyCopy } from '../copy/screens'
import { fmtAsOf, fmtDate, fmtINR } from '../lib/format'
import { useMunim } from '../store'
import { holdingDetail, relatedActions, sourceLabel } from './selectors'
import { openTrustData, useUi, type HoldingRef } from './uiStore'

/** SPEC 9.3: a holding's detail, inside the Money tab: source, freshness, related actions. */
export function MoneyDetail({ holding }: { holding: HoldingRef }) {
  const actions = useMunim((s) => s.actions)
  const close = useUi((s) => s.closeHolding)
  const renewed = useUi((s) => s.renewedConsents)
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    ref.current?.closest('main')?.scrollTo({ top: 0 })
  }, [holding])

  const d = holdingDetail(holding)
  const back = (
    <button type="button" onClick={close} className="-ml-1 flex items-center gap-0.5 self-start rounded-button py-1 pr-2 text-sm font-medium text-accent hover:underline">
      <ChevronLeft size={18} aria-hidden="true" />
      {moneyCopy.detailBack}
    </button>
  )
  if (!d) return <div ref={ref}>{back}</div>

  const related = relatedActions(actions, d.matchers)
  const src = d.source
  const expiry = src ? (renewed[src.id] ?? src.consentExpiry) : undefined

  return (
    <div ref={ref} className="flex flex-col gap-3">
      {back}
      <ScreenCard>
        <h1 className="text-lg font-semibold leading-snug text-ink">{d.title}</h1>
        {d.subtitle && <p className="num text-sm text-muted">{d.subtitle}</p>}
        <p className={`num mt-2 text-[28px] font-semibold leading-tight tracking-tight ${d.owed ? 'text-negative' : 'text-ink'}`}>
          {d.amountText ?? fmtINR(d.owed ? -d.amount : d.amount)}
          {d.amountNote && <span className="ml-2 text-sm font-medium text-muted">{d.amountNote}</span>}
        </p>
      </ScreenCard>

      {d.facts.length > 0 && (
        <ScreenCard flush>
          <dl className="divide-y divide-line">
            {d.facts.map((f) => (
              <ScreenFact key={f.label} label={f.label} value={f.value} tone={f.tone} />
            ))}
          </dl>
        </ScreenCard>
      )}

      <ScreenSection title={moneyCopy.detailSource}>
        <ScreenCard className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Database size={16} className="shrink-0 text-accent" aria-hidden="true" />
            {src ? sourceLabel(src) : moneyCopy.detailSource}
          </p>
          <p className="num text-sm text-muted">{fmtAsOf(d.asOf)}</p>
          {expiry && <p className="num text-sm text-muted">{moneyCopy.detailConsent(fmtDate(expiry, { year: true }))}</p>}
          <div>
            <ScreenButton variant="link" onClick={openTrustData}>
              {moneyCopy.detailManage}
            </ScreenButton>
          </div>
        </ScreenCard>
      </ScreenSection>

      <ScreenSection title={moneyCopy.detailRelated}>
        {related.length === 0 ? (
          <p className="rounded-card bg-card px-4 py-3 text-sm text-muted shadow-soft">{moneyCopy.detailRelatedNone}</p>
        ) : (
          <ScreenCard flush>
            <ul className="divide-y divide-line">
              {related.map((a) => (
                <li key={a.id}>
                  <ScreenActionLink action={a} />
                </li>
              ))}
            </ul>
          </ScreenCard>
        )}
      </ScreenSection>
    </div>
  )
}
