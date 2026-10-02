import { toZonedParts, zonedToUtc } from './time'

// A heads-up about an appointment the day before and on the day itself, from the morning run of
// the reminders job: "Morgen om 10:00: kennismaken met Bello."

function addDays(date: string, days: number): string {
  const day = new Date(`${date}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() + days)
  return day.toISOString().slice(0, 10)
}

/** From now until the end of tomorrow, in the app's time zone. */
export function reminderWindow(now: Date): { from: Date; to: Date } {
  return { from: now, to: zonedToUtc(addDays(toZonedParts(now).date, 2), '00:00') }
}

/** "today" or "tomorrow" and the local time, for the reminder's text; null when it is neither. */
export function reminderMoment(startsAt: Date, now: Date): { day: 'today' | 'tomorrow'; time: string } | null {
  if (startsAt.getTime() < now.getTime()) return null
  const today = toZonedParts(now).date
  const at = toZonedParts(startsAt)
  if (at.date === today) return { day: 'today', time: at.time }
  if (at.date === addDays(today, 1)) return { day: 'tomorrow', time: at.time }
  return null
}
