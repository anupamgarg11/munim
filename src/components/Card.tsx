import type { ReactNode } from 'react'

/** White card on the app background: 16px radius, soft shadow. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card bg-card p-4 shadow-soft ${className}`}>{children}</div>
}
