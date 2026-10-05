import 'server-only'
import { headers } from 'next/headers'
import { LIVE_LOCATION_HEADER, liveLocationFor } from '@/lib/live-location'

/** Whether live location is on for this request: LIVE_LOCATION, or a test browser that switched it off (lib/live-location.ts). */
export async function liveLocationNow(): Promise<boolean> {
  return liveLocationFor(process.env, (await headers()).get(LIVE_LOCATION_HEADER))
}
