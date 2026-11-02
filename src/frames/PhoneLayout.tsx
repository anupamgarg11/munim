import type { CSSProperties } from 'react'
import { useMunim } from '../store'
import { stage } from '../copy/shell'
import { SegmentedControl } from '../components/SegmentedControl'
import { DemoBar } from '../components/DemoBar'
import { CommentarySheet } from '../components/CommentarySheet'
import { WhatsAppSurface } from './WhatsAppSurface'
import { MunimSurface } from './MunimSurface'
import type { Surface } from '../types'

/*
  Under 1024px: one phone-width screen, a "WhatsApp | Munim" switch on top, demo bar below
  (folds to a pill). The commentary is the "i" sheet, over whichever surface is showing.
*/
export function PhoneLayout() {
  const surface = useMunim((s) => s.surface)
  const setSurface = useMunim((s) => s.setSurface)
  const demoCollapsed = useMunim((s) => s.demoCollapsed)

  // With the demo bar open it owns the bottom safe area; collapsed, the surface does.
  const safeBottom = demoCollapsed ? 'env(safe-area-inset-bottom, 0px)' : '0px'

  return (
    <div className="flex h-dvh flex-col overflow-x-hidden bg-stage">
      <header
        className="flex shrink-0 justify-center border-b border-line bg-card px-4 pb-2"
        style={{ paddingTop: 'max(8px, env(safe-area-inset-top, 0px))' }}
      >
        <SegmentedControl<Surface>
          label={stage.surfaceLabel}
          value={surface}
          onChange={setSurface}
          options={[
            { value: 'whatsapp', label: stage.surfaceWhatsapp },
            { value: 'app', label: stage.surfaceApp },
          ]}
        />
      </header>
      <main className="relative mx-auto min-h-0 w-full max-w-[440px] flex-1" style={{ '--safe-bottom': safeBottom } as CSSProperties}>
        {surface === 'whatsapp' ? <WhatsAppSurface /> : <MunimSurface />}
        <CommentarySheet />
      </main>
      <DemoBar variant="phone" />
    </div>
  )
}
