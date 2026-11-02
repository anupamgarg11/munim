import { useSyncExternalStore } from 'react'

/** True while the media query matches. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Laptop layout breakpoint (SPEC 3: three columns at 1024px and up) */
export const LAPTOP_QUERY = '(min-width: 1024px)'
