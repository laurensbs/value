const PATHS = {
  paw: 'M12 13.5c-2.6 0-5 2.3-5 4.4 0 1.4 1.1 2.1 2.4 2.1 1 0 1.8-.5 2.6-.5s1.6.5 2.6.5c1.3 0 2.4-.7 2.4-2.1 0-2.1-2.4-4.4-5-4.4ZM6.2 12.4a1.9 2.3 0 1 0 0-.1M17.8 12.4a1.9 2.3 0 1 0 0-.1M9.4 8.4a1.9 2.4 0 1 0 0-.1M14.6 8.4a1.9 2.4 0 1 0 0-.1',
  route: 'M6 19a2 2 0 1 0 0-.01M18 5a2 2 0 1 0 0-.01M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5.6 5.6l4 4M14.4 14.4l4 4M18.4 5.6l-4 4M9.6 14.4l-4 4',
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11ZM12 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6Z',
  shield: 'M12 3l7 3v5.5c0 4.4-3 8.1-7 9.5-4-1.4-7-5.1-7-9.5V6l7-3ZM9 12l2.2 2.2L15.5 10',
  home: 'M4 11l8-6.5 8 6.5M6.5 9.5V19h11V9.5',
  phone: 'M7.5 3.5h3l1.5 4-2 1.5a10 10 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 3.5 5.5a2 2 0 0 1 2-2Z',
  chat: 'M4.5 18.5V7a2.5 2.5 0 0 1 2.5-2.5h10A2.5 2.5 0 0 1 19.5 7v6.5A2.5 2.5 0 0 1 17 16H8l-3.5 2.5Z',
  play: 'M8 5.5v13l10-6.5-10-6.5Z',
  lock: 'M6.5 11h11v9h-11zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  leaf: 'M5 19c0-8 5.5-13 14-14-.5 8.5-5.5 14-13 14M5 19l7-7',
  sparkle: 'M12 4v4M12 16v4M4 12h4M16 12h4M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  copy: 'M9 9h10v10H9zM5 15V5h10',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
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
