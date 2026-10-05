import { describe, expect, it } from 'vitest'
import { liveLocationFor, liveLocationOn } from './live-location'

describe('LIVE_LOCATION', () => {
  it('is on while unset or empty, and with the words for on', () => {
    expect(liveLocationOn({})).toBe(true)
    expect(liveLocationOn({ LIVE_LOCATION: '' })).toBe(true)
    expect(liveLocationOn({ LIVE_LOCATION: '  ' })).toBe(true)
    for (const on of ['1', 'true', 'on', 'ja', 'aan', 'TRUE', ' Aan ']) expect(liveLocationOn({ LIVE_LOCATION: on }), on).toBe(true)
  })

  it('is off with anything else, a typo included', () => {
    for (const off of ['0', 'false', 'off', 'nee', 'uit', 'of', 'tru']) expect(liveLocationOn({ LIVE_LOCATION: off }), off).toBe(false)
  })
})

describe('switching it off for one test browser', () => {
  const test = { TEST_CLOCK: '1' }

  it('works only on a test server, never in production', () => {
    expect(liveLocationFor(test, 'off')).toBe(false)
    expect(liveLocationFor(test, ' OFF ')).toBe(false)
    expect(liveLocationFor(test, null)).toBe(true)
    expect(liveLocationFor({}, 'off')).toBe(true)
    expect(liveLocationFor({ TEST_CLOCK: '1', VERCEL_ENV: 'production' }, 'off')).toBe(true)
  })

  it('can never switch it on when LIVE_LOCATION says off', () => {
    expect(liveLocationFor({ ...test, LIVE_LOCATION: '0' }, 'on')).toBe(false)
    expect(liveLocationFor({ ...test, LIVE_LOCATION: '0' }, null)).toBe(false)
    expect(liveLocationFor({ LIVE_LOCATION: '0' }, null)).toBe(false)
  })
})
