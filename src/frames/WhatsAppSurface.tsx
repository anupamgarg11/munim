import { useMemo, useRef } from 'react'
import { useMunim } from '../store'
import { chat } from '../copy/chat'
import { fmtDate } from '../lib/format'
import { useChat } from '../chat/chatStore'
import { ask, tapChip } from '../chat/engine'
import type { ConsentEvent } from '../chat/bridge'
import { MessageView, type OnCardAction } from '../chat/ui/MessageViews'
import { ChatHeader, Chips, Composer, MessageList, Notice, TypingBubble, useAutoScroll } from '../chat/ui/ChatParts'
import { SureshFrame } from './SureshFrame'
import { CommentaryButton } from '../components/CommentarySheet'
import '../chat/chat.css'

/*
  The WhatsApp surface (SPEC 3, 8, 9.4). Nikhil's chat with Munim ji on the front; Suresh's
  Hindi chat on the back. whatsappOwner (chat store) flips between them.

  Card buttons and Suresh's approval are pluggable: pass onAction / onConsent to override
  the defaults in chat/bridge.ts (which call the main store's card actions by name).
*/

interface Props {
  onAction?: OnCardAction
  onConsent?: (e: ConsentEvent) => void
}

export function WhatsAppSurface({ onAction, onConsent }: Props) {
  const flipped = useChat((s) => s.whatsappOwner === 'suresh')
  return (
    <div className="wa-flip min-h-0 flex-1">
      <div className="wa-flip-inner" data-flipped={flipped}>
        <section className="wa-face" aria-hidden={flipped} inert={flipped}>
          <NikhilChat onAction={onAction} />
        </section>
        <section className="wa-face wa-face-back" aria-hidden={!flipped} inert={!flipped}>
          <SureshFrame onConsent={onConsent} />
        </section>
      </div>
    </div>
  )
}

function NikhilChat({ onAction }: { onAction?: OnCardAction }) {
  const messages = useMunim((s) => s.messages)
  const typing = useChat((s) => s.typing.nikhil)
  const thread = useMemo(() => messages.filter((m) => m.thread === 'nikhil'), [messages])
  const last = thread[thread.length - 1]
  const chips = !typing && last?.kind === 'chips' ? last.chips : []
  const scrollRef = useRef<HTMLDivElement>(null)
  useAutoScroll(scrollRef, `${thread.length}:${typing}:${chips.length}`)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader
        name={chat.contactName}
        avatar={chat.avatar}
        status={typing ? chat.typing : chat.online}
        verifiedLabel={chat.verified}
        action={<CommentaryButton tone="light" />}
      />
      <div className="wa-doodle flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} role="log" aria-label={chat.log} className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
          <Notice>{chat.notice}</Notice>
          <MessageList messages={thread} dateLabel={(at) => fmtDate(at)} render={(m, tail) => <MessageView m={m} tail={tail} onAction={onAction} />} />
          {typing && <TypingBubble label={chat.typingBubble} />}
        </div>
        <Chips chips={chips} label={chat.quickReplies} onTap={(c) => void tapChip(c, 'nikhil')} />
        <Composer placeholder={chat.placeholder} inputLabel={chat.inputLabel} sendLabel={chat.send} onSend={(t) => void ask(t, 'nikhil')} />
      </div>
    </div>
  )
}
