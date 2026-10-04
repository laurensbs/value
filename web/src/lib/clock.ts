/**
 * The header end-to-end tests use to pin the moment a page is made, so "Eén ding nu" does not
 * depend on the hour the tests happen to run (at night it waits with planning).
 */
export const NOW_HEADER = 'x-rondje-now'

/**
 * A pinned "now" from that header: only on a test server (TEST_CLOCK=1), never in production
 * (VERCEL_ENV=production), and only for a valid date. Otherwise null: the real clock.
 */
export function pinnedNow(value: string | null | undefined, env: { TEST_CLOCK?: string; VERCEL_ENV?: string }): Date | null {
  if (env.TEST_CLOCK !== '1' || env.VERCEL_ENV === 'production' || !value) return null
  const at = new Date(value)
  return Number.isNaN(at.getTime()) ? null : at
}
