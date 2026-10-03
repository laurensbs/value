import { TIME_ZONE, toZonedParts } from '@/lib/time'

export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

/** "Goedemorgen" until noon, "Goedemiddag" until six, then "Goedenavond"; after midnight just "Hoi". */
export function partOfDay(now = new Date(), timeZone = TIME_ZONE): PartOfDay {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(now))
  if (hour < 5) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

/** Days since 1970 in local time: the same number all day, so "Tip van vandaag" changes once a day. */
export function dayNumber(now = new Date(), timeZone = TIME_ZONE): number {
  return Math.floor(Date.parse(`${toZonedParts(now, timeZone).date}T00:00:00Z`) / 86_400_000)
}
