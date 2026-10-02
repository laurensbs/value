import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { cityList } from '@/lib/cities'

/** All cities with a public page, including those of verified shelters (not example shelters). */
export async function publicCities() {
  const db = await getDb()
  const orgs = await db
    .select({ name: s.organization.city, country: s.organization.country, isDemo: s.organization.isDemo })
    .from(s.organization)
    .where(eq(s.organization.status, 'verified'))
  return cityList(orgs.filter((o) => !o.isDemo))
}
