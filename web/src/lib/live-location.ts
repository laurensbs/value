import { isTestServer } from './clock'
import { switchOn } from './support'

/**
 * Live location during walks can be switched off for everyone, from Vercel: LIVE_LOCATION. Unset or
 * empty, '1', 'true', 'on', 'ja' or 'aan' (any case): on. Anything else, a typo included, is off, so a
 * switch someone meant to turn off never stays on by accident.
 *
 * Off means: the server stores no location points for walks (POST /api/walks/<id>/points answers 403
 * `live-location-off`), the walk screens show no live map and say calmly that live location is off for
 * now, and a walk alone with the dog cannot start (lib/rules.ts liveLocationReason). A first meeting,
 * with the owner or shelter there, still starts and ends as before. The apps read it from
 * /api/v1/config as `features.liveLocation`.
 *
 * Privacy art. 14: the DPIA is finished before the first real walk with live location. Until then
 * this switch is how live location stays off (privacy art. 5).
 */
export function liveLocationOn(env: Record<string, string | undefined> = process.env): boolean {
  return switchOn(env.LIVE_LOCATION, true)
}

/**
 * End-to-end tests switch it off for one browser with this header ('off'), so one test server can show
 * both. Only on a test server (lib/clock.ts isTestServer), never in production, and it can only switch
 * live location off: never on when LIVE_LOCATION says off.
 */
export const LIVE_LOCATION_HEADER = 'x-rondje-live-location'

export function liveLocationFor(env: Record<string, string | undefined>, header: string | null | undefined): boolean {
  if (!liveLocationOn(env)) return false
  return !(isTestServer(env) && header?.trim().toLowerCase() === 'off')
}
