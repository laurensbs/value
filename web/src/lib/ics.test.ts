import { describe, expect, it } from 'vitest'
import { calendarFile, escapeText, foldLine, utcStamp } from './ics'

describe('calendar file', () => {
  const event = {
    uid: 'req-1@rondje',
    start: new Date('2026-10-03T08:30:00Z'),
    minutes: 45,
    title: 'Rondje met Bello',
    location: 'Bij de bakker; hoek Oudegracht, Utrecht',
    description: 'Met Sam.\nAlles over deze afspraak: https://rondje.example/requests',
    url: 'https://rondje.example/requests',
    alarmMinutes: 60,
    stamp: new Date('2026-10-02T19:05:00Z'),
  }

  it('writes one event in UTC with an end and a reminder', () => {
    const lines = calendarFile(event).split('\r\n')
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(lines).toContain('UID:req-1@rondje')
    expect(lines).toContain('DTSTAMP:20261002T190500Z')
    expect(lines).toContain('DTSTART:20261003T083000Z')
    expect(lines).toContain('DTEND:20261003T091500Z')
    expect(lines).toContain('TRIGGER:-PT60M')
    expect(lines).not.toContain('RRULE:FREQ=WEEKLY')
    expect(lines.at(-2)).toBe('END:VCALENDAR')
    expect(lines.at(-1)).toBe('')
  })

  it('repeats a fixed weekly walk', () => {
    expect(calendarFile({ ...event, weekly: true })).toContain('\r\nRRULE:FREQ=WEEKLY\r\n')
  })

  it('escapes text and leaves out what is missing', () => {
    expect(escapeText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne')
    const file = calendarFile({ uid: 'x', start: event.start, minutes: 30, title: 'Kennismaken met Pip' })
    expect(file).not.toContain('LOCATION')
    expect(file).not.toContain('VALARM')
    expect(file).toContain('\r\nSUMMARY:Kennismaken met Pip\r\n')
  })

  it('folds long lines at 75 bytes without splitting a character', () => {
    const line = `DESCRIPTION:${'é'.repeat(80)}`
    const folded = foldLine(line).split('\r\n')
    expect(folded.length).toBeGreaterThan(1)
    for (const part of folded) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75)
    expect(folded.slice(1).every((part) => part.startsWith(' '))).toBe(true)
    expect(folded.map((part, i) => (i ? part.slice(1) : part)).join('')).toBe(line)
    expect(foldLine('SUMMARY:kort')).toBe('SUMMARY:kort')
  })

  it('formats UTC stamps', () => {
    expect(utcStamp(new Date('2026-01-05T07:03:09.123Z'))).toBe('20260105T070309Z')
  })
})
