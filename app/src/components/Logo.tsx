/** A dashed round route with a dot: one walk around the block. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="logo">
      <rect width="64" height="64" rx="18" className="logo-bg" />
      <circle cx="32" cy="32" r="15" className="logo-route" />
      <circle cx="32" cy="17" r="5" className="logo-dot" />
    </svg>
  )
}
