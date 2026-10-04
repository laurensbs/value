import { Icon, type IconName } from '@/components/Icon'

// A few extra icons for the progress pages, drawn in the same 24×24 line style as Icon.
// Kept here (not in Icon.tsx) so this package stays self-contained.
const EXTRA = {
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4',
  moon: 'M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1ZM17 3.5v3M15.5 5h3',
  book: 'M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2V5ZM5 20a2 2 0 0 0 2 2h12v-4M9 7.5h6',
  breathe: 'M3 9h10.5a3 3 0 1 0-3-3M3 15h14a3 3 0 1 1-3 3M3 12h6',
  chevron: 'M9.5 5.5 16 12l-6.5 6.5',
  award: 'M12 14.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM8.6 13.4 7.2 21l4.8-2.6 4.8 2.6-1.4-7.6',
  wave: 'M7 13V7.5a1.5 1.5 0 0 1 3 0V12M10 11V5.5a1.5 1.5 0 0 1 3 0V11M13 11V6.5a1.5 1.5 0 0 1 3 0V13M16 10.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-12.5 4.3L4.3 15a1.6 1.6 0 0 1 2.5-2l.2.2',
  walker: 'M13 4.5a1.5 1.5 0 1 0 0-.01M9.5 21l2.5-6 2.5 2.5V21M12 15l-1-5 3.5 1 2 3M11 10l-3.5 2V15',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3.5Z',
  // An open book: the Hondenschool.
  school: 'M3 6.5c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5V6.5ZM12 7v12.5',
} as const

export type ProgressIconName = IconName | keyof typeof EXTRA

export function ProgressIcon({ name, size = 22 }: { name: ProgressIconName; size?: number }) {
  if (!(name in EXTRA)) return <Icon name={name as IconName} size={size} />
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
      <path d={EXTRA[name as keyof typeof EXTRA]} />
    </svg>
  )
}
