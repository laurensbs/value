import { isTestServer } from './clock'
import { switchOn } from './support'

/**
 * Live location during walks is off unless it is switched on, from Vercel: LIVE_LOCATION. Privacy by
 * default: unset or empty is off. Only '1', 'true', 'on', 'ja' or 'aan' (any case) switch it on; anything
 * else, a typo included, leaves it off, so live location never starts by accident.
 *
 * Even when it is on, only a walk alone with the dog collects location (lib/rules.ts walkHasLiveLocation):
 * at a first meeting the owner or shelter walks along, and a group walk never starts a walk in the app,
 * so neither ever has GPS.
 *
 * Off means: the server stores no location points (POST /api/walks/<id>/points answers 403
 * `live-location-off`), the walk screens show no live map and say calmly that live location is off for
 * now, and a walk alone with the dog cannot start (lib/rules.ts liveLocationReason). A first meeting
 * still starts and ends as before. The apps read the switch from /api/v1/config as
 * `features.liveLocation`.
 *
 * Privacy art. 14: the DPIA is finished before the first real walk with live location. Until then it
 * stays off (privacy art. 5): leave LIVE_LOCATION unset in production until the DPIA is done.
 */
export function liveLocationOn(env: Record<string, string | undefined> = process.env): boolean {
  return switchOn(env.LIVE_LOCATION, false)
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
