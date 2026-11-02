import { Monitor, Smartphone } from 'lucide-react'
import { useMunim } from '../store'
import { useChat } from '../chat/chatStore'
import { stage } from '../copy/shell'
import { SegmentedControl } from '../components/SegmentedControl'
import { CommentaryPanel } from '../components/CommentaryPanel'
import { DemoBar } from '../components/DemoBar'
import { PhoneFrame } from './PhoneFrame'
import { WhatsAppSurface } from './WhatsAppSurface'
import { MunimSurface } from './MunimSurface'
import type { CentreView } from '../types'

const CAPTION = 'flex h-9 shrink-0 items-center justify-center gap-3 text-xs font-semibold uppercase tracking-wide text-ink/70'

/** ≥1024px: WhatsApp | Munim app | commentary, demo bar across the bottom. */
export function LaptopLayout() {
  const centreView = useMunim((s) => s.centreView)
  const setCentreView = useMunim((s) => s.setCentreView)
  const wide = centreView === 'wide'
  // The caption follows whose phone the WhatsApp frame shows (it flips to Dad's in moment 7).
  const owner = useChat((s) => s.whatsappOwner)
  const waCaption = owner === 'suresh' ? stage.sureshCaption : stage.whatsappCaption

  return (
    <div className="grid h-dvh grid-rows-[minmax(0,1fr)_auto] bg-stage">
      <div
        className="grid min-h-0 gap-6 px-6 pb-4 pt-3"
        style={{ gridTemplateColumns: wide ? 'minmax(0, 420px) minmax(0, 1fr) auto' : 'minmax(0, 1fr) minmax(0, 1fr) auto' }}
      >
        <section aria-label={waCaption} className="flex min-h-0 min-w-0 flex-col">
          <p className={CAPTION} aria-live="polite">
            <span key={owner} className="animate-fade-in">
              {waCaption}
            </span>
          </p>
          <div className="min-h-0 flex-1">
            <PhoneFrame label={waCaption} statusBackground="var(--wa-header)" statusTone="light">
              <WhatsAppSurface />
            </PhoneFrame>
          </div>
        </section>

        <section aria-label={stage.appCaption} className="flex min-h-0 min-w-0 flex-col">
          <div className={CAPTION}>
            <span>{stage.appCaption}</span>
            <SegmentedControl<CentreView>
              label={stage.viewLabel}
              size="sm"
              value={centreView}
              onChange={setCentreView}
              options={[
                { value: 'phone', label: stage.viewPhone, icon: Smartphone },
                { value: 'wide', label: stage.viewWide, icon: Monitor },
              ]}
            />
          </div>
          <div className="min-h-0 flex-1">
            {wide ? (
              <div className="mx-auto h-full w-full max-w-[880px] overflow-hidden rounded-card shadow-device">
                <MunimSurface wide />
              </div>
            ) : (
              <PhoneFrame label={stage.appCaption} statusBackground="var(--m-card)" statusTone="dark">
                <MunimSurface />
              </PhoneFrame>
            )}
          </div>
        </section>

        <CommentaryPanel />
      </div>
      <DemoBar variant="laptop" />
    </div>
  )
}
