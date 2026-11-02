import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Check, CircleCheck, Eye, Landmark, LoaderCircle, Lock, Mail, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { useMunim } from '../store'
import * as P from '../data/persona'
import { consentMonths } from '../screens/screenData'
import { onboarding as copy } from '../copy/moments'
import { completeOnboarding } from './runner'
import { ONBOARDING_STEPS, useDemo, type OnboardingStep } from './state'
import type { DataSource } from '../types'

/*
  Moment 1 onboarding (SPEC 5.1), inside the Munim app surface: phone number, OTP (any six
  digits), what Munim does and the trust promise, the Account Aggregator consent, Gmail
  (read-only), then a 2 second "putting it together" with the sources ticking, then Money.
  Shown at moments 0 and 1 until connected; Free explore hides it. Step state lives in the
  demo store so switching surfaces on a phone does not lose it.
*/

/** The app shows the onboarding instead of its tabs */
export const useShowOnboarding = () => useMunim((s) => s.moment <= 1 && !s.connected && !s.freeExplore)

const REVEAL_MS = 2000
const AA_BLUE = 'bg-[#1E3A5F]'
const BTN = 'w-full rounded-button bg-accent py-3 text-[15px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45'
const INPUT = 'num block w-full rounded-button border border-line bg-card px-3 py-2.5 text-[17px] font-medium text-ink focus:border-accent'

const reducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const digits = (s: string) => s.replace(/\D/g, '')
/** "9876543210" -> "98765 43210" */
const spaced = (d: string) => (d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d)

/* ---------- Sources on the consent ---------- */

type Group = keyof typeof copy.aa.groups

/** Nikhil's Account Aggregator sources, grouped as an AA consent lists them */
function aaSources(): { group: Group; source: DataSource; label: string; sub: string }[] {
  return P.dataSources
    .filter((s) => s.via === 'Account Aggregator' && !s.memberId)
    .map((s) => {
      const bank = P.banks.find((b) => b.sourceId === s.id)
      if (bank) return { group: 'banks' as Group, source: s, label: `${bank.bank} ****${bank.mask}`, sub: s.covers }
      const group: Group = /mutual/i.test(s.covers) ? 'funds' : /stock/i.test(s.covers) ? 'stocks' : /nps/i.test(s.covers) ? 'nps' : 'epf'
      return { group, source: s, label: s.name, sub: s.covers }
    })
}

/* ---------- Shell ---------- */

export function Onboarding({ wide = false }: { wide?: boolean }) {
  const step = useDemo((s) => s.step)
  const setStep = useDemo((s) => s.setStep)
  const index = ONBOARDING_STEPS.indexOf(step)
  const counted = ONBOARDING_STEPS.length - 1 // the reveal is not a step you take
  const canGoBack = index > 0 && step !== 'reveal'
  // Guided mode plays these steps itself; a click or key inside hands them back to the viewer.
  const takeOver = () => {
    if (useDemo.getState().autoplay) useDemo.getState().setAutoplay(false)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg" onPointerDownCapture={takeOver} onKeyDownCapture={takeOver}>
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-card px-4 py-2.5">
        {canGoBack ? (
          <button
            type="button"
            onClick={() => setStep(ONBOARDING_STEPS[index - 1])}
            aria-label={copy.back}
            className="-ml-1.5 rounded-button p-1.5 text-muted hover:bg-bg hover:text-ink"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
        ) : null}
        <p className="text-[17px] font-semibold tracking-tight text-accent">{copy.brand}</p>
        {step !== 'reveal' && (
          <p className="num ml-auto text-xs text-muted" aria-live="polite">
            {copy.stepOf(index + 1, counted)}
          </p>
        )}
      </header>
      {step !== 'reveal' && (
        <div className="h-1 shrink-0 bg-line" aria-hidden="true">
          <div className="h-full bg-accent transition-all" style={{ width: `${((index + 1) / counted) * 100}%` }} />
        </div>
      )}
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div key={step} className={`animate-fade-in mx-auto flex min-h-full flex-col px-5 py-6 ${wide ? 'max-w-[440px]' : ''}`}>
          <StepBody step={step} next={() => setStep(ONBOARDING_STEPS[Math.min(index + 1, ONBOARDING_STEPS.length - 1)])} />
        </div>
      </main>
    </div>
  )
}

function StepBody({ step, next }: { step: OnboardingStep; next: () => void }) {
  switch (step) {
    case 'phone':
      return <PhoneStep next={next} />
    case 'otp':
      return <OtpStep next={next} />
    case 'promise':
      return <PromiseStep next={next} />
    case 'aa':
      return <AaStep next={next} />
    case 'gmail':
      return <GmailStep next={next} />
    case 'reveal':
      return <RevealStep />
  }
}

function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-ink">{children}</h1>
      {sub && <p className="mt-1.5 text-sm leading-relaxed text-muted">{sub}</p>}
    </div>
  )
}

/** Pinned to the bottom of the step */
function Footer({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex flex-col gap-2 pt-6">{children}</div>
}

/* ---------- 1. Phone number ---------- */

function PhoneStep({ next }: { next: () => void }) {
  const phone = useDemo((s) => s.phone)
  const setPhone = useDemo((s) => s.setPhone)
  const id = useId()
  // The demo number is filled in; any ten digits work.
  useEffect(() => {
    if (!useDemo.getState().phone) setPhone(digits(copy.phone.demoNumber))
  }, [setPhone])
  const ready = phone.length === 10
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (ready) next()
  }
  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <p className="mb-6 text-sm font-medium text-accent">{copy.tagline}</p>
      <Title sub={copy.phone.sub}>{copy.phone.title}</Title>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {copy.phone.label}
      </label>
      <div className="mt-1.5 flex items-stretch gap-2">
        <span className="num grid place-items-center rounded-button border border-line bg-card px-3 text-[17px] font-medium text-muted">{copy.phone.prefix}</span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={spaced(phone)}
          onChange={(e) => setPhone(digits(e.target.value).slice(0, 10))}
          className={INPUT}
        />
      </div>
      <Footer>
        <button type="submit" disabled={!ready} className={BTN}>
          {copy.phone.cta}
        </button>
      </Footer>
    </form>
  )
}

/* ---------- 2. OTP ---------- */

function OtpStep({ next }: { next: () => void }) {
  const phone = useDemo((s) => s.phone)
  const otp = useDemo((s) => s.otp)
  const setOtp = useDemo((s) => s.setOtp)
  const id = useId()
  const ready = otp.length === 6
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (ready) next()
  }
  return (
    <form onSubmit={submit} className="flex flex-1 flex-col">
      <Title sub={copy.otp.sub(`${'*'.repeat(6)}${phone.slice(-4)}`)}>{copy.otp.title}</Title>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {copy.otp.label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        autoFocus
        value={otp}
        onChange={(e) => setOtp(digits(e.target.value).slice(0, 6))}
        aria-describedby={`${id}-hint`}
        className={`${INPUT} mt-1.5 text-center text-[24px] tracking-[0.5em]`}
      />
      <p id={`${id}-hint`} className="mt-2 text-xs text-muted">
        {copy.otp.hint}
      </p>
      <Footer>
        <button type="submit" disabled={!ready} className={BTN}>
          {copy.otp.cta}
        </button>
      </Footer>
    </form>
  )
}

/* ---------- 3. What Munim does, and the promise ---------- */

const PROMISE_ICONS = [Eye, Search, Sparkles]

function PromiseStep({ next }: { next: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <Title>{copy.promise.title}</Title>
      <ul className="flex flex-col gap-3">
        {copy.promise.lines.map((line, i) => {
          const Icon = PROMISE_ICONS[i % PROMISE_ICONS.length]
          return (
            <li key={line} className="flex items-start gap-3 rounded-card bg-card p-3.5 shadow-soft">
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <Icon size={18} />
              </span>
              <p className="pt-1.5 text-[15px] leading-snug text-ink">{line}</p>
            </li>
          )
        })}
      </ul>
      <section aria-label={copy.promise.trustTitle} className="mt-5 rounded-card border border-accent/25 bg-accent-soft p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-accent">
          <ShieldCheck size={16} aria-hidden="true" />
          {copy.promise.trustTitle}
        </h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {copy.promise.trust.map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm leading-snug text-ink">
              <Check size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
              {t}
            </li>
          ))}
        </ul>
      </section>
      <Footer>
        <button type="button" onClick={next} className={BTN}>
          {copy.promise.cta}
        </button>
      </Footer>
    </div>
  )
}

/* ---------- 4. Account Aggregator consent ---------- */

function AaStep({ next }: { next: () => void }) {
  const unticked = useDemo((s) => s.unticked)
  const toggle = useDemo((s) => s.toggleSource)
  const sources = aaSources()
  const chosen = sources.filter((s) => !unticked[s.source.id]).length
  const groups = (Object.keys(copy.aa.groups) as Group[]).filter((g) => sources.some((s) => s.group === g))
  const a = copy.aa

  return (
    <div className="-mx-5 -my-6 flex flex-1 flex-col">
      <div className={`${AA_BLUE} on-dark flex items-center justify-between px-4 py-2.5 text-white`}>
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <Lock size={14} aria-hidden="true" />
          {a.header}
        </p>
        <p className="text-[12px] text-white/80">{a.partner}</p>
      </div>
      <div className="flex flex-1 flex-col px-5 py-5">
        <h1 className="text-[19px] font-semibold leading-snug text-ink">{a.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {a.requestedBy}: <span className="font-medium text-ink">{a.requester}</span>
        </p>

        <fieldset className="mt-4 rounded-card border border-line bg-card">
          <legend className="sr-only">{a.accounts}</legend>
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <p className="text-sm font-semibold text-ink">{a.accounts}</p>
            <p className="num text-xs text-muted">{a.selected(chosen, sources.length)}</p>
          </div>
          {groups.map((g) => (
            <div key={g} className="border-b border-line last:border-b-0">
              <p className="px-3.5 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{a.groups[g]}</p>
              <ul>
                {sources
                  .filter((s) => s.group === g)
                  .map((s) => (
                    <li key={s.source.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2 hover:bg-bg">
                        <input
                          type="checkbox"
                          checked={!unticked[s.source.id]}
                          onChange={() => toggle(s.source.id)}
                          className="h-4.5 w-4.5 shrink-0 accent-[#1E3A5F]"
                        />
                        <span className="min-w-0">
                          <span className="num block text-sm font-medium text-ink">{s.label}</span>
                          <span className="block text-xs text-muted">{s.sub}</span>
                        </span>
                      </label>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </fieldset>

        <dl className="mt-4 divide-y divide-line rounded-card border border-line bg-card text-sm">
          {[
            [a.purposeLabel, a.purpose],
            [a.durationLabel, a.duration(consentMonths)],
            [a.frequencyLabel, a.frequency],
            [a.dataLabel, a.data],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-3.5 py-2.5">
              <dt className="shrink-0 text-muted">{k}</dt>
              <dd className="num text-right font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <Footer>
          {chosen === 0 && (
            <p role="alert" className="text-center text-xs text-warning">
              {a.noneSelected}
            </p>
          )}
          <button
            type="button"
            onClick={next}
            disabled={chosen === 0}
            className={`w-full rounded-button ${AA_BLUE} py-3 text-[15px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45`}
          >
            {a.approve}
          </button>
          <p className="text-center text-xs text-muted">{a.revoke}</p>
        </Footer>
      </div>
    </div>
  )
}

/* ---------- 5. Gmail, read-only ---------- */

function GmailStep({ next }: { next: () => void }) {
  const g = copy.gmail
  return (
    <div className="flex flex-1 flex-col">
      <span aria-hidden="true" className="mb-4 grid h-12 w-12 place-items-center rounded-card bg-card text-accent shadow-soft">
        <Mail size={24} />
      </span>
      <Title sub={g.sub}>{g.title}</Title>
      <div className="rounded-card bg-card p-4 shadow-soft">
        <p className="flex items-start gap-2 text-sm font-semibold text-ink">
          <Lock size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
          {g.scope}
        </p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {g.reads.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm text-ink">
              <Check size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
              {r}
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-line pt-3 text-xs text-muted">{g.never}</p>
      </div>
      <p className="mt-3 text-xs text-muted">{g.account}</p>
      <Footer>
        <button type="button" onClick={next} className={BTN}>
          {g.cta}
        </button>
      </Footer>
    </div>
  )
}

/* ---------- 6. Putting it together ---------- */

function RevealStep() {
  const unticked = useDemo((s) => s.unticked)
  const sources = P.dataSources.filter((s) => !s.memberId && !unticked[s.id])
  const total = sources.length
  const [ticked, setTicked] = useState(0)

  // Sources tick one by one over 2 s (all at once under reduced motion), then the Money screen.
  useEffect(() => {
    let finish: ReturnType<typeof setTimeout> | undefined
    let timer: ReturnType<typeof setInterval> | undefined
    if (reducedMotion()) {
      setTicked(total)
      finish = setTimeout(() => void completeOnboarding(), 400)
    } else {
      let n = 0
      timer = setInterval(() => {
        n += 1
        setTicked(n)
        if (n >= total) {
          clearInterval(timer)
          finish = setTimeout(() => void completeOnboarding(), 200)
        }
      }, REVEAL_MS / Math.max(1, total))
    }
    return () => {
      clearInterval(timer)
      clearTimeout(finish)
    }
  }, [total])

  const r = copy.reveal
  return (
    <div className="flex flex-1 flex-col">
      <Title sub={r.sub}>{r.title}</Title>
      <div
        role="progressbar"
        aria-label={r.progress}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={ticked}
        className="h-1.5 w-full overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${(ticked / Math.max(1, total)) * 100}%` }} />
      </div>
      <ul className="mt-4 flex flex-col divide-y divide-line rounded-card bg-card shadow-soft" aria-live="polite">
        {sources.map((s, i) => {
          const done = i < ticked
          return (
            <li key={s.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                {s.via === 'Account Aggregator' ? <Landmark size={14} /> : <Mail size={14} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{s.name}</span>
                <span className="block truncate text-xs text-muted">{s.covers}</span>
              </span>
              {done ? (
                <CircleCheck size={18} className="shrink-0 text-positive" aria-label={r.ready} />
              ) : (
                <LoaderCircle size={18} className="shrink-0 animate-spin text-muted" aria-hidden="true" />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
