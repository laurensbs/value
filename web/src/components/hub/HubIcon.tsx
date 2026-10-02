import { Icon, type IconName } from '../Icon'

// A few pictures only the hub needs; everything else comes from the app's own icon set.
const EXTRA = {
  mail: 'M4 6.5h16v11H4zM4.5 7l7.5 6 7.5-6',
  chart: 'M5 19V11M10 19V6M15 19v-5M20 19V9M3.5 19.5h17',
  euro: 'M17.5 6.5A6.5 6.5 0 1 0 17.5 17.5M5 10.5h8M5 13.5h8',
  video: 'M4 7h11v10H4zM15 10.5l5-3v9l-5-3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 12h.01',
} as const

export type HubIconName = IconName | keyof typeof EXTRA

export function HubIcon({ name, size = 22 }: { name: HubIconName; size?: number }) {
  if (!(name in EXTRA)) return <Icon name={name as IconName} size={size} />
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3.2 : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="icon"
    >
      <path d={EXTRA[name as keyof typeof EXTRA]} />
    </svg>
  )
}
