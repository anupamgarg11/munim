import { ArrowLeft, BadgeCheck, EllipsisVertical, Phone, Video } from 'lucide-react'
import { whatsapp } from '../copy/shell'

/*
  WhatsApp chat with Munim ji. Item 0: header and an empty chat area only.
  Messages, typing, chips and the composer arrive with the chat engine.
  The header icons are decorative, not controls.
*/
export function WhatsAppSurface() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-[60px] shrink-0 items-center gap-2 bg-wa-header px-2 text-white">
        <ArrowLeft size={22} aria-hidden="true" className="shrink-0" />
        <div aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-[15px] font-semibold ring-2 ring-white/20">
          M
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-1 text-[16px] font-semibold">
            <span className="truncate">{whatsapp.contactName}</span>
            <BadgeCheck size={16} className="shrink-0 fill-white text-wa-header" aria-hidden="true" />
            <span className="sr-only">{whatsapp.verifiedLabel}</span>
          </p>
          <p className="text-[13px] text-white/85">{whatsapp.status}</p>
        </div>
        <span aria-hidden="true" className="flex shrink-0 items-center gap-4 pr-1 text-white/95">
          <Video size={21} />
          <Phone size={19} />
          <EllipsisVertical size={20} />
        </span>
      </header>
      <div className="wa-wallpaper no-scrollbar min-h-0 flex-1 overflow-y-auto" style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}>
        <p className="sr-only">{whatsapp.emptyChat}</p>
      </div>
    </div>
  )
}
