import { describe, expect, it } from 'vitest'
import { dayNumber, partOfDay } from './day'

describe('partOfDay', () => {
  it('follows the clock in Amsterdam, not the server', () => {
    // 2026-10-02 in summer time (UTC+2).
    expect(partOfDay(new Date('2026-10-02T06:30:00Z'))).toBe('morning')
    expect(partOfDay(new Date('2026-10-02T11:00:00Z'))).toBe('afternoon')
    expect(partOfDay(new Date('2026-10-02T17:30:00Z'))).toBe('evening')
    expect(partOfDay(new Date('2026-10-02T23:30:00Z'))).toBe('night')
  })
})

describe('dayNumber', () => {
  it('is the same all day and moves on at local midnight', () => {
    const morning = dayNumber(new Date('2026-10-02T05:00:00Z'))
    expect(dayNumber(new Date('2026-10-02T21:59:00Z'))).toBe(morning)
    expect(dayNumber(new Date('2026-10-02T22:01:00Z'))).toBe(morning + 1)
  })
})
