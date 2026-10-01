import { describe, expect, it } from 'vitest'
import { formatDuration, minutesFromSeconds, moodLabel, walkStats, weeklyLabel, type WalkLog } from './walks'

describe('walkStats', () => {
  it('returns zeros and no mood shift for an empty log', () => {
    expect(walkStats([])).toEqual({ walks: 0, minutes: 0, dogs: 0, moodShift: null, checkedIn: 0 })
  })

  it('counts walks, minutes and distinct dogs', () => {
    const logs: WalkLog[] = [
      { id: 'a', dogId: 'mo', date: '2026-09-01', minutes: 30 },
      { id: 'b', dogId: 'mo', date: '2026-09-03', minutes: 45 },
      { id: 'c', dogId: 'pip', date: '2026-09-04', minutes: 20 },
    ]
    const stats = walkStats(logs)
    expect(stats.walks).toBe(3)
    expect(stats.minutes).toBe(95)
    expect(stats.dogs).toBe(2)
  })

  it('averages mood shift only over walks with both check-ins', () => {
    const logs: WalkLog[] = [
      { id: 'a', dogId: 'mo', date: '2026-09-01', minutes: 30, before: 2, after: 4 },
      { id: 'b', dogId: 'mo', date: '2026-09-02', minutes: 30, before: 3, after: 4 },
      { id: 'c', dogId: 'mo', date: '2026-09-03', minutes: 30, before: 3 },
    ]
    const stats = walkStats(logs)
    expect(stats.checkedIn).toBe(2)
    expect(stats.moodShift).toBe(1.5)
  })
})

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65)).toBe('1:05')
  })

  it('adds hours when needed', () => {
    expect(formatDuration(3725)).toBe('1:02:05')
  })

  it('never goes negative', () => {
    expect(formatDuration(-5)).toBe('0:00')
  })
})

describe('minutesFromSeconds', () => {
  it('logs at least one minute', () => {
    expect(minutesFromSeconds(10)).toBe(1)
    expect(minutesFromSeconds(29 * 60 + 40)).toBe(30)
  })
})

describe('moodLabel', () => {
  it('names each mood and handles a skipped check-in', () => {
    expect(moodLabel(1)).toBe('Zwaar')
    expect(moodLabel(5)).toBe('Top')
    expect(moodLabel(undefined)).toBe('Niet ingevuld')
  })
})

describe('weeklyLabel', () => {
  // 1 October 2026 is a Thursday.
  const today = new Date(2026, 9, 1, 12)

  it('spells out short weekdays', () => {
    expect(weeklyLabel('Di 11:00', today)).toBe('Elke dinsdag 11:00')
    expect(weeklyLabel('Za 10:30', today)).toBe('Elke zaterdag 10:30')
  })

  it('resolves today and tomorrow', () => {
    expect(weeklyLabel('Vandaag 16:30', today)).toBe('Elke donderdag 16:30')
    expect(weeklyLabel('Morgen 09:00', today)).toBe('Elke vrijdag 09:00')
  })
})
