import { Receipt as ReceiptIcon } from 'lucide-react'
import { receipt as copy } from '../copy/cards'
import { fmtDateTime, fmtINR } from '../lib/format'
import type { Receipt } from '../types'

/** What ran, rail, reference, time (SPEC 3 receipt). */
export function ReceiptBlock({ receipt, className = '' }: { receipt: Receipt; className?: string }) {
  const rows: { label: string; value: string }[] = [
    { label: copy.what, value: receipt.what },
    ...(receipt.amount !== undefined ? [{ label: copy.amount, value: fmtINR(receipt.amount) }] : []),
    { label: copy.rail, value: receipt.rail },
    { label: copy.reference, value: receipt.reference },
    { label: copy.time, value: fmtDateTime(receipt.at) },
  ]
  return (
    <section aria-label={copy.title} className={`rounded-button border border-dashed border-line bg-bg px-3 py-2.5 ${className}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <ReceiptIcon size={14} aria-hidden="true" />
        {copy.title}
      </p>
      <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-muted">{r.label}</dt>
            <dd className="num min-w-0 break-words text-right font-medium text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
