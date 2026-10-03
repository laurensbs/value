import { Icon, type IconName } from '../Icon'

// A few extra line icons for the app-style screens (energy, walking, distance, tips), drawn
// on the same 24px grid and stroke as Icon.tsx. Everything else comes from Icon.
const GLYPHS = {
  bolt: 'M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z',
  walker: 'M14.5 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM12.5 8 11 14l-2 7M11 14l3 3 1 4M12.3 9 9.5 11.5 8.5 14M12.3 9l2.2 2.5 2.5.5',
  navigate: 'M20 4 4 11l7 2 2 7 7-16Z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  award: 'M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM8.7 12.7 7.5 21l4.5-2.6 4.5 2.6-1.2-8.3',
  drop: 'M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z',
  hand: 'M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6.5 7-2.6 0-4.4-1.6-5.5-3.6l-2-3.6a1.5 1.5 0 0 1 2.6-1.5L8 15',
  ear: 'M7 9a5 5 0 0 1 10 0c0 3-2.5 4-3 6.5S12.5 21 10 21a3 3 0 0 1-3-3M10 9a2 2 0 0 1 4 0c0 1.5-1.5 2-2 3',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2.5v2M12 19.5v2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M2.5 12h2M19.5 12h2M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  chevron: 'M9 6l6 6-6 6',
  swap: 'M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4',
} as const

export type SymName = IconName | keyof typeof GLYPHS

export function Sym({ name, size = 22 }: { name: SymName; size?: number }) {
  if (!(name in GLYPHS)) return <Icon name={name as IconName} size={size} />
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
      <path d={GLYPHS[name as keyof typeof GLYPHS]} />
    </svg>
  )
}
