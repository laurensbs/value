/**
 * The header end-to-end tests use to pin the moment a page is made, so "Eén ding nu" does not
 * depend on the hour the tests happen to run (at night it waits with planning).
 */
export const NOW_HEADER = 'x-rondje-now'

/**
 * A server for end-to-end tests: TEST_CLOCK=1, and never production (VERCEL_ENV=production), whatever
 * is set. Only there do test headers count, like the pinned "now" below or switching live location off
 * for one browser (lib/live-location.ts).
 */
export function isTestServer(env: Record<string, string | undefined>): boolean {
  return env.TEST_CLOCK === '1' && env.VERCEL_ENV !== 'production'
}

/**
 * A pinned "now" from that header: only on a test server (TEST_CLOCK=1), never in production
 * (VERCEL_ENV=production), and only for a valid date. Otherwise null: the real clock.
 */
export function pinnedNow(value: string | null | undefined, env: { TEST_CLOCK?: string; VERCEL_ENV?: string }): Date | null {
  if (!isTestServer(env) || !value) return null
  const at = new Date(value)
  return Number.isNaN(at.getTime()) ? null : at
}
