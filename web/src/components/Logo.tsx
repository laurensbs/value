/**
 * The small brand mark, the same drawing as the favicon: a "j" on forest green whose dot is the
 * tennis ball (the word "rondje mee" itself doesn't read this small). Source: assets/brand/favicon.svg.
 */
export function Logo({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="7.5" fill="#1b4a34" />
      <path d="M14 12H20V22C20 26.6 17.2 29 12.6 29H10V24H12.4C13.6 24 14 23.4 14 22Z" fill="#f4f1e8" />
      <circle cx="17" cy="6.6" r="3.6" fill="#d9f05a" />
    </svg>
  )
}
