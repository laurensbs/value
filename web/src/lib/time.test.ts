import { describe, expect, it } from 'vitest'
import { nextWeekday, toZonedParts, zonedToUtc } from './time'

describe('zonedToUtc', () => {
  it('handles summer time (UTC+2)', () => {
    expect(zonedToUtc('2026-07-01', '10:00').toISOString()).toBe('2026-07-01T08:00:00.000Z')
  })

  it('handles winter time (UTC+1)', () => {
    expect(zonedToUtc('2026-12-01', '10:00').toISOString()).toBe('2026-12-01T09:00:00.000Z')
  })

  it('round-trips with toZonedParts', () => {
    const at = zonedToUtc('2026-10-24', '09:30')
    expect(toZonedParts(at)).toEqual({ date: '2026-10-24', time: '09:30' })
  })
})

describe('nextWeekday', () => {
  it('finds the next Tuesday after a Thursday', () => {
    // 1 October 2026 is a Thursday.
    expect(nextWeekday(2, new Date('2026-10-01T10:00:00Z'))).toBe('2026-10-06')
  })

  it('skips to next week for the same weekday', () => {
    expect(nextWeekday(4, new Date('2026-10-01T10:00:00Z'))).toBe('2026-10-08')
  })
})
