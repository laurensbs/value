import { describe, expect, it } from 'vitest'
import { pinnedNow } from './clock'

describe('the test clock', () => {
  const night = '2026-10-05T23:30:00+02:00'

  it('pins the moment only on a test server', () => {
    expect(pinnedNow(night, { TEST_CLOCK: '1' })?.toISOString()).toBe('2026-10-05T21:30:00.000Z')
    expect(pinnedNow(night, { TEST_CLOCK: '1', VERCEL_ENV: 'preview' })).not.toBeNull()
    expect(pinnedNow(night, {})).toBeNull()
    expect(pinnedNow(night, { TEST_CLOCK: '0' })).toBeNull()
  })

  it('is never honoured in production, whatever is set', () => {
    expect(pinnedNow(night, { TEST_CLOCK: '1', VERCEL_ENV: 'production' })).toBeNull()
  })

  it('ignores an empty or broken value', () => {
    expect(pinnedNow(null, { TEST_CLOCK: '1' })).toBeNull()
    expect(pinnedNow('', { TEST_CLOCK: '1' })).toBeNull()
    expect(pinnedNow('gisteren', { TEST_CLOCK: '1' })).toBeNull()
  })
})
