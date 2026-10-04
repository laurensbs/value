import 'server-only'
import { headers } from 'next/headers'
import { NOW_HEADER, pinnedNow } from '@/lib/clock'

/** The moment a page is made: the real clock, or the one an end-to-end test pinned (lib/clock.ts). */
export async function pageNow(): Promise<Date> {
  const env = { TEST_CLOCK: process.env.TEST_CLOCK, VERCEL_ENV: process.env.VERCEL_ENV }
  return pinnedNow((await headers()).get(NOW_HEADER), env) ?? new Date()
}
