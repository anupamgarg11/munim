/*
  Formatting helpers. Indian number format, IST dates.
  - Amounts are whole rupees; paise are rounded away.
  - Negative amounts use the true minus sign (U+2212), never a dash.
  - The space before "L" / "Cr" is a no-break space (U+00A0) so "₹4.2 L" never wraps.
  - Dates and times are always shown in IST, whatever the viewer's time zone.
*/

const RUPEE = '₹'
const MINUS = '−'
const NBSP = ' '
const IST_OFFSET_MS = 330 * 60 * 1000

/** "1234567" -> "12,34,567" (last three digits, then pairs). */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits
  const last3 = digits.slice(-3)
  let rest = digits.slice(0, -3)
  const pairs: string[] = []
  while (rest.length > 2) {
    pairs.unshift(rest.slice(-2))
    rest = rest.slice(0, -2)
  }
  if (rest) pairs.unshift(rest)
  return `${pairs.join(',')},${last3}`
}

function signOf(rounded: number, signed: boolean): string {
  if (rounded < 0) return MINUS
  if (signed && rounded > 0) return '+'
  return ''
}

/** ₹1,23,456. `signed` adds "+" to positive amounts (for deltas like "+₹18,400"). */
export function fmtINR(n: number, opts: { signed?: boolean } = {}): string {
  const rounded = Math.round(n)
  const sign = signOf(rounded, opts.signed ?? false)
  return `${sign}${RUPEE}${groupIndian(String(Math.abs(rounded)))}`
}

/** Fixed decimals, trailing zeros trimmed: 4.20 -> "4.2", 1.00 -> "1". */
function trimFixed(x: number, digits: number): string {
  const s = x.toFixed(digits)
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s
}

const LAKH = 1e5
const CRORE = 1e7

/**
 * Short form in lakhs or crores: ₹4.18 L, ₹4.2 L (digits = 1), ₹1 L, ₹0.5 L, ₹1.2 Cr.
 * Amounts that round up to 100 L switch to crores (₹99,99,999 -> ₹1 Cr).
 */
export function fmtLakh(n: number, digits = 2): string {
  const abs = Math.abs(n)
  const round = (x: number) => Math.round(x * 10 ** digits) / 10 ** digits
  let value: number
  let unit: 'L' | 'Cr'
  if (abs >= CRORE || round(abs / LAKH) >= 100) {
    value = round(abs / CRORE)
    unit = 'Cr'
  } else {
    value = round(abs / LAKH)
    unit = 'L'
  }
  const sign = n < 0 && value > 0 ? MINUS : ''
  return `${sign}${RUPEE}${trimFixed(value, digits)}${NBSP}${unit}`
}

/** Percent from a rate: 0.068 -> "6.8%", 0.03 -> "3%". */
export function fmtPct(rate: number, digits = 1): string {
  return `${trimFixed(rate * 100, digits)}%`
}

/* ---------- Dates and times (IST) ---------- */

export type DateInput = Date | string | number

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

function toMs(d: DateInput): number {
  if (d instanceof Date) return d.getTime()
  if (typeof d === 'number') return d
  // A bare date ("2026-11-09") means that calendar day in IST, not UTC midnight.
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T12:00:00+05:30`).getTime()
  return new Date(d).getTime()
}

/** Wall-clock parts in IST, independent of the viewer's time zone. */
export function istParts(d: DateInput) {
  const z = new Date(toMs(d) + IST_OFFSET_MS)
  return {
    year: z.getUTCFullYear(),
    month: z.getUTCMonth(),
    day: z.getUTCDate(),
    weekday: z.getUTCDay(),
    hour: z.getUTCHours(),
    minute: z.getUTCMinutes(),
  }
}

/** "Thu 6 Nov" (add the year with { year: true }: "Thu 6 Nov 2026"). */
export function fmtDate(d: DateInput, opts: { year?: boolean } = {}): string {
  const p = istParts(d)
  const base = `${WEEKDAYS[p.weekday]} ${p.day} ${MONTHS[p.month]}`
  return opts.year ? `${base} ${p.year}` : base
}

/**
 * "9:14 am" by default; { clock: '24h' } gives "00:14"; { ampm: false } gives "9:14"
 * (for the phone status bar).
 */
export function fmtTime(d: DateInput, opts: { clock?: '12h' | '24h'; ampm?: boolean } = {}): string {
  const p = istParts(d)
  const mm = String(p.minute).padStart(2, '0')
  if (opts.clock === '24h') return `${String(p.hour).padStart(2, '0')}:${mm}`
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12
  const suffix = opts.ampm === false ? '' : p.hour < 12 ? ' am' : ' pm'
  return `${h12}:${mm}${suffix}`
}

/** "Thu 30 Oct, 9:14 am" */
export function fmtDateTime(d: DateInput): string {
  return `${fmtDate(d)}, ${fmtTime(d)}`
}

/** "as of Thu 30 Oct, 9:14 am" */
export function fmtAsOf(d: DateInput): string {
  return `as of ${fmtDateTime(d)}`
}
