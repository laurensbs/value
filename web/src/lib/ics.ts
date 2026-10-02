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
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${product}//NL`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(event.stamp ?? new Date())}`,
    `DTSTART:${utcStamp(event.start)}`,
    `DTEND:${utcStamp(end)}`,
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
