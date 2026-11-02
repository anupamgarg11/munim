import { useEffect, useState, type KeyboardEvent } from 'react'
import { Check, CircleCheck, Delete, Landmark, Lock } from 'lucide-react'
import { useMunim } from '../store'
import { BottomSheet } from './BottomSheet'
import { banks } from '../data/persona'
import { pinSheet as copy } from '../copy/cards'
import { fmtINR } from '../lib/format'

const MAX_DIGITS = 6
/** Any 4 or 6 digits work (SPEC 9.2) */
const VALID_LENGTHS = [4, 6]
/** How long "Approved" shows before the sheet closes */
const APPROVED_MS = 900

const salary = banks.find((b) => b.kind === 'salary')

interface Props {
  actionId: string
  onClose: () => void
}

/**
 * Bottom sheet styled like a UPI PIN pad. Lives in the app, never inside a chat bubble.
 * Its parent must be position: relative (it covers the parent; see BottomSheet).
 */
export function PinSheet({ actionId, onClose }: Props) {
  const card = useMunim((s) => s.actions.find((a) => a.id === actionId))
  const approveAction = useMunim((s) => s.approveAction)
  const [pin, setPin] = useState('')
  const [approved, setApproved] = useState(false)
  const canSubmit = VALID_LENGTHS.includes(pin.length) && !approved

  // Close once "Approved" has shown
  useEffect(() => {
    if (!approved) return
    const t = setTimeout(onClose, APPROVED_MS)
    return () => clearTimeout(t)
  }, [approved, onClose])

  // The card moved on elsewhere (cancelled, approved from the other surface): nothing to sign.
  const stale = !card || (card.status !== 'proposed' && !approved)
  useEffect(() => {
    if (stale) onClose()
  }, [stale, onClose])
  if (!card || stale) return null

  const press = (d: string) => {
    if (approved) return
    setPin((p) => (p.length < MAX_DIGITS ? p + d : p))
  }
  const backspace = () => !approved && setPin((p) => p.slice(0, -1))
  // Backdrop, Escape and Cancel; once "Approved" shows, the sheet closes on its own.
  const dismiss = () => !approved && onClose()
  const submit = () => {
    if (!canSubmit) return
    setApproved(true)
    approveAction(actionId, 'pin')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (/^\d$/.test(e.key)) press(e.key)
    else if (e.key === 'Backspace') backspace()
    else if (e.key === 'Enter') submit()
    else return
    e.preventDefault()
  }

  const keyClass =
    'num flex h-14 items-center justify-center rounded-button text-[22px] font-medium text-ink hover:bg-card active:bg-line disabled:opacity-40'

  return (
    <BottomSheet onClose={dismiss} label={copy.dialogLabel} initialFocus="panel" zIndex={55} onKeyDown={onKeyDown}>
      {/* Bank header */}
      <div className="on-dark flex items-center justify-between gap-3 bg-[#0b3d91] px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15">
            <Landmark size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-semibold">{copy.header}</p>
            {salary && <p className="num text-xs text-white/80">{copy.account(salary.mask)}</p>}
          </div>
        </div>
        {!approved && (
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-button px-2.5 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white"
          >
            {copy.cancel}
          </button>
        )}
      </div>

      {/* What is being approved */}
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-line px-4 py-3 text-sm">
        <dt className="text-muted">{copy.forLabel}</dt>
        <dd className="min-w-0 truncate text-right font-medium text-ink">{card.title}</dd>
        {card.amount !== undefined && (
          <>
            <dt className="text-muted">{copy.amountLabel}</dt>
            <dd className="num text-right text-[17px] font-semibold text-ink">{fmtINR(card.amount)}</dd>
          </>
        )}
      </dl>

      {approved ? (
        <div role="status" className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <CircleCheck size={48} className="text-positive" aria-hidden="true" />
          <p className="text-lg font-semibold text-ink">{copy.approved}</p>
          <p className="text-sm text-muted">{copy.approvedSub}</p>
        </div>
      ) : (
        <>
          <div className="px-4 pb-2 pt-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{copy.enter}</p>
            <div className="mt-3 flex justify-center gap-3" aria-label={copy.digitsEntered(pin.length)} role="img">
              {Array.from({ length: MAX_DIGITS }, (_, i) => (
                <span
                  key={i}
                  className={`h-3.5 w-3.5 rounded-full border-2 ${i < pin.length ? 'border-ink bg-ink' : 'border-line bg-card'}`}
                />
              ))}
            </div>
            <p className="mt-3 flex items-center justify-center gap-1 text-xs text-muted">
              <Lock size={12} aria-hidden="true" />
              {copy.trust}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-bg px-3 pb-3 pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} type="button" onClick={() => press(d)} className={keyClass}>
                {d}
              </button>
            ))}
            <button type="button" onClick={backspace} aria-label={copy.deleteDigit} disabled={pin.length === 0} className={keyClass}>
              <Delete size={22} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => press('0')} className={keyClass}>
              0
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              aria-label={copy.submit}
              className="flex h-14 items-center justify-center gap-1.5 rounded-button bg-accent text-sm font-semibold text-white hover:brightness-110 disabled:bg-line disabled:text-muted"
            >
              <Check size={20} aria-hidden="true" />
              {copy.submit}
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  )
}

/** Mount once inside the Munim surface (position: relative); shows the sheet the store asks for. */
export function PinSheetHost() {
  const id = useMunim((s) => s.pinSheetActionId)
  const close = useMunim((s) => s.closePinSheet)
  return id ? <PinSheet key={id} actionId={id} onClose={close} /> : null
}
