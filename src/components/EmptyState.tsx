import type { ReactNode } from 'react'

/** Placeholder body for a screen that has nothing to show yet. */
export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-card border border-dashed border-line bg-card px-4 py-6 text-center text-sm text-muted">{children}</p>
}
