import { TIME_ZONE } from './time'

/** One appointment as an iCalendar file (RFC 5545), so it lands in any calendar app. */
export interface CalendarEvent {
  uid: string
  start: Date
  minutes: number
  title: string
  location?: string
  description?: string
  url?: string
  /** A fixed weekly walk repeats every week at the same time. */
  weekly?: boolean
  /** A reminder this many minutes before the start. */
  alarmMinutes?: number
  stamp?: Date
}

/** 2026-10-02T19:05:00.000Z → 20261002T190500Z */
export function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Wall-clock time in a time zone: 2026-10-03T08:30:00Z in Europe/Amsterdam → 20261003T103000 */
export function localStamp(date: Date, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  )
  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`
}

/**
 * Central European Time with EU summer time (last Sunday of March to last Sunday of October), the
 * zone of every appointment in Rondje (see TIME_ZONE).
 */
function centralEuropeanZone(tzid: string): string[] {
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${tzid}`,
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ]
}

/** Backslashes, semicolons, commas and line breaks are escaped in text values. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

const encoder = new TextEncoder()

/** Lines longer than 75 bytes continue on the next line after one space, never inside a character. */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ''
  let size = 0
  for (const char of line) {
    const bytes = encoder.encode(char).length
    // A continuation line starts with a space, which counts too.
    if (size + bytes > (parts.length ? 74 : 75)) {
      parts.push(current)
      current = ''
      size = 0
    }
    current += char
    size += bytes
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export function calendarFile(event: CalendarEvent, product = 'Rondje'): string {
  const end = new Date(event.start.getTime() + event.minutes * 60_000)
  // A weekly walk repeats at the same local time, also after summer or winter time starts. In UTC
  // every repeat would keep the first one's UTC hour and move an hour on the local clock.
  const zone = event.weekly ? TIME_ZONE : null
  const at = (date: Date) => (zone ? `;TZID=${zone}:${localStamp(date, zone)}` : `:${utcStamp(date)}`)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${product}//NL`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...(zone ? centralEuropeanZone(zone) : []),
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(event.stamp ?? new Date())}`,
    `DTSTART${at(event.start)}`,
    `DTEND${at(end)}`,
    ...(event.weekly ? ['RRULE:FREQ=WEEKLY'] : []),
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    ...(event.alarmMinutes
      ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(event.title)}`, `TRIGGER:-PT${event.alarmMinutes}M`, 'END:VALARM']
      : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/** The file as a download that phones open in their calendar app. Never cached: it is personal. */
export function calendarResponse(file: string): Response {
  return new Response(file, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rondje.ics"',
      'Cache-Control': 'private, no-store',
    },
  })
}
