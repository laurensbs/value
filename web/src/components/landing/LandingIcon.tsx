// A few extra line icons for the public pages, drawn like the ones in components/Icon.tsx.
const PATHS = {
  walk: 'M13.6 6a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4ZM12.6 8.6l-1.4 5M11.2 13.6l2.4 3 .6 4.4M11.2 13.6l-1.5 3.6-2.1 3.3M12.6 8.6 9.4 11.4M12.6 8.6l2.3 2.7 2.5 1',
  hand: 'M8 12.5V6.8a1.4 1.4 0 0 1 2.8 0V11M10.8 10.5V5.2a1.4 1.4 0 0 1 2.8 0v5.3M13.6 10.5V6.4a1.4 1.4 0 0 1 2.8 0v7.1a7 7 0 0 1-7 7h-.3a6 6 0 0 1-5.2-3l-1.6-2.9a1.3 1.3 0 0 1 2.2-1.4L8 14.6',
  swap: 'M5 8h13M14.5 4.5 18 8l-3.5 3.5M19 16H6M9.5 12.5 6 16l3.5 3.5',
  bolt: 'M13.5 3 6 13.2h5.6L10.5 21 18 10.8h-5.6L13.5 3Z',
  idcard: 'M3.5 6h17v12h-17V6ZM8 12.6a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8ZM5.5 16c.6-1.3 1.5-1.9 2.5-1.9s1.9.6 2.5 1.9M13.5 10h4M13.5 13.5h3',
  chevron: 'M9.5 6l6 6-6 6',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4',
} as const

export type LandingIconName = keyof typeof PATHS

export function LandingIcon({ name, size = 22 }: { name: LandingIconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="icon"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

/** A filled paw print, like the badges in the iPhone app. */
export function PawMark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className="icon">
      <path d="M12 12.6c-2.9 0-5.4 2.6-5.4 4.9 0 1.6 1.2 2.4 2.6 2.4 1.1 0 1.9-.6 2.8-.6s1.7.6 2.8.6c1.4 0 2.6-.8 2.6-2.4 0-2.3-2.5-4.9-5.4-4.9Z" />
      <ellipse cx="5.6" cy="10.6" rx="2" ry="2.5" transform="rotate(-18 5.6 10.6)" />
      <ellipse cx="18.4" cy="10.6" rx="2" ry="2.5" transform="rotate(18 18.4 10.6)" />
      <ellipse cx="9.2" cy="6.4" rx="2" ry="2.6" transform="rotate(-8 9.2 6.4)" />
      <ellipse cx="14.8" cy="6.4" rx="2" ry="2.6" transform="rotate(8 14.8 6.4)" />
    </svg>
  )
}
