// Netherlands, Belgium and mainland Spain all use Central European Time.
export const TIME_ZONE = 'Europe/Amsterdam'

function offsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - at.getTime()) / 60_000)
}

/** Interprets a local date (YYYY-MM-DD) and time (HH:MM) in `timeZone` and returns the UTC instant. */
export function zonedToUtc(date: string, time: string, timeZone = TIME_ZONE): Date {
  const guess = new Date(`${date}T${time}:00Z`)
  const first = offsetMinutes(guess, timeZone)
  const result = new Date(guess.getTime() - first * 60_000)
  const second = offsetMinutes(result, timeZone)
  return second === first ? result : new Date(guess.getTime() - second * 60_000)
}

/** Local date and time parts of an instant in `timeZone`, for prefilling forms. */
export function toZonedParts(at: Date, timeZone = TIME_ZONE): { date: string; time: string } {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(at)
  const get = (type: string) => f.find((p) => p.type === type)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

/** The next date (from tomorrow on) that falls on ISO weekday 1–7, as YYYY-MM-DD in TIME_ZONE. */
export function nextWeekday(weekday: number, from = new Date()): string {
  const today = toZonedParts(from)
  const base = new Date(`${today.date}T12:00:00Z`)
  const current = ((base.getUTCDay() + 6) % 7) + 1
  let add = (weekday - current + 7) % 7
  if (add === 0) add = 7
  base.setUTCDate(base.getUTCDate() + add)
  return base.toISOString().slice(0, 10)
}

/** A moment relative to now, for server components (keeps impure calls out of render). */
export function fromNow(ms: number): Date {
  return new Date(Date.now() + ms)
}
