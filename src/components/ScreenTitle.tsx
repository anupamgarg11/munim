/** Screen heading inside the Munim app. */
export function ScreenTitle({ children }: { children: string }) {
  return <h1 className="px-1 text-xl font-semibold tracking-tight text-ink">{children}</h1>
}
