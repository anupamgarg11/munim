/*
  Hash routing (GitHub Pages friendly). The hash carries the moment, surface and tab:
  #m=4&s=app&t=money. Store changes write the hash with replaceState (no history spam);
  a pasted or edited hash is applied to the store on load and on hashchange.
*/
import { useEffect } from 'react'
import { clampMoment, useMunim } from '../store'
import type { Moment, Surface, Tab } from '../types'

const SURFACES: readonly Surface[] = ['whatsapp', 'app']
const TABS: readonly Tab[] = ['home', 'money', 'actions', 'rules', 'trust']

export interface HashState {
  m?: Moment
  s?: Surface
  t?: Tab
}

export function parseHash(hash: string): HashState {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const out: HashState = {}
  const m = params.get('m')
  if (m !== null && /^\d+$/.test(m)) out.m = clampMoment(Number(m))
  const s = params.get('s')
  if (s && (SURFACES as readonly string[]).includes(s)) out.s = s as Surface
  const t = params.get('t')
  if (t && (TABS as readonly string[]).includes(t)) out.t = t as Tab
  return out
}

export function buildHash(state: Required<HashState>): string {
  return `#m=${state.m}&s=${state.s}&t=${state.t}`
}

/** Apply a hash to the store. Called once before the first render (main.tsx) and on hashchange. */
export function applyHash(hash: string) {
  const h = parseHash(hash)
  const st = useMunim.getState()
  if (h.m !== undefined && h.m !== st.moment) st.setMoment(h.m)
  if (h.s && h.s !== st.surface) st.setSurface(h.s)
  if (h.t && h.t !== st.tab) st.setTab(h.t)
}

/** Keeps window.location.hash and the store in step. Mount once, at the root. */
export function useHashRoute() {
  useEffect(() => {
    const write = () => {
      const { moment, surface, tab } = useMunim.getState()
      const next = buildHash({ m: moment, s: surface, t: tab })
      if (window.location.hash !== next) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`)
      }
    }
    write()

    const onHashChange = () => applyHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    const unsubscribe = useMunim.subscribe((s, prev) => {
      if (s.moment !== prev.moment || s.surface !== prev.surface || s.tab !== prev.tab) write()
    })
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      unsubscribe()
    }
  }, [])
}
