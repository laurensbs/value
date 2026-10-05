import { describe, expect, it } from 'vitest'
import { liveLocationFor, liveLocationOn } from './live-location'

describe('LIVE_LOCATION', () => {
  it('is off while unset or empty: privacy by default', () => {
    expect(liveLocationOn({})).toBe(false)
    expect(liveLocationOn({ LIVE_LOCATION: '' })).toBe(false)
    expect(liveLocationOn({ LIVE_LOCATION: '  ' })).toBe(false)
  })

  it('is on only with the words for on', () => {
    for (const on of ['1', 'true', 'on', 'ja', 'aan', 'TRUE', ' Aan ']) expect(liveLocationOn({ LIVE_LOCATION: on }), on).toBe(true)
  })

  it('stays off with anything else, a typo included', () => {
    for (const off of ['0', 'false', 'off', 'nee', 'uit', 'of', 'tru', 'yes please']) expect(liveLocationOn({ LIVE_LOCATION: off }), off).toBe(false)
  })
})

describe('switching it off for one test browser', () => {
  const test = { TEST_CLOCK: '1', LIVE_LOCATION: '1' }

  it('works only on a test server, never in production', () => {
    expect(liveLocationFor(test, 'off')).toBe(false)
    expect(liveLocationFor(test, ' OFF ')).toBe(false)
    expect(liveLocationFor(test, null)).toBe(true)
    expect(liveLocationFor({ LIVE_LOCATION: '1' }, 'off')).toBe(true)
    expect(liveLocationFor({ ...test, VERCEL_ENV: 'production' }, 'off')).toBe(true)
  })

  it('can never switch it on when LIVE_LOCATION says off or is unset', () => {
    expect(liveLocationFor({ TEST_CLOCK: '1', LIVE_LOCATION: '0' }, 'on')).toBe(false)
    expect(liveLocationFor({ TEST_CLOCK: '1' }, 'on')).toBe(false)
    expect(liveLocationFor({ TEST_CLOCK: '1' }, null)).toBe(false)
    expect(liveLocationFor({}, null)).toBe(false)
  })
})
