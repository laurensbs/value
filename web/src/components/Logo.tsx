/** A dashed round route with a walker on it: one walk around the block. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#1f5a3d" />
      <circle cx="32" cy="32" r="14" fill="none" stroke="#d9f05a" strokeWidth="5" strokeDasharray="4 7" strokeLinecap="round" />
      <circle cx="32" cy="18" r="5.5" fill="#d9f05a" />
    </svg>
  )
}
