import 'server-only'
import { and, eq, gte, isNull, max, or } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { citySlug, cityList, type City } from '@/lib/cities'

/** All cities with a public page, including those of verified shelters (not example shelters). */
export async function publicCities(): Promise<City[]> {
  const db = await getDb()
  const orgs = await db
    .select({ name: s.organization.city, country: s.organization.country, lat: s.organization.lat, lng: s.organization.lng, isDemo: s.organization.isDemo })
    .from(s.organization)
    .where(eq(s.organization.status, 'verified'))
  return cityList(orgs.filter((o) => !o.isDemo))
}

/**
 * The cities whose page has something real on it, with when that last changed: at least one active
 * dog, an upcoming group walk or a verified partner shelter. Example content (isDemo) never counts,
 * and neither does a dog of a shelter that is not verified. Other city pages stay for visitors but
 * are kept out of search engines: dozens of near-identical pages would count against the whole site.
 */
export async function indexableCities(): Promise<Map<string, Date>> {
  const db = await getDb()
  const realOrg = and(eq(s.organization.status, 'verified'), eq(s.organization.isDemo, false))
  const [cities, dogs, walks, shelters] = await Promise.all([
    publicCities(),
    db
      .select({ city: s.dog.city, country: s.dog.country, changed: max(s.dog.updatedAt) })
      .from(s.dog)
      .leftJoin(s.organization, eq(s.organization.id, s.dog.orgId))
      .where(and(eq(s.dog.status, 'active'), eq(s.dog.isDemo, false), or(isNull(s.dog.orgId), realOrg)))
      .groupBy(s.dog.city, s.dog.country),
    db
      .select({ city: s.organization.city, country: s.organization.country, changed: max(s.groupWalk.createdAt) })
      .from(s.groupWalk)
      .innerJoin(s.organization, eq(s.organization.id, s.groupWalk.orgId))
      .where(and(eq(s.groupWalk.status, 'scheduled'), gte(s.groupWalk.startsAt, new Date()), realOrg))
      .groupBy(s.organization.city, s.organization.country),
    db
      .select({ city: s.organization.city, country: s.organization.country, changed: max(s.organization.updatedAt) })
      .from(s.organization)
      .where(realOrg)
      .groupBy(s.organization.city, s.organization.country),
  ])
  const country = new Map(cities.map((c) => [c.slug, c.country]))
  const found = new Map<string, Date>()
  for (const row of [...dogs, ...walks, ...shelters]) {
    const slug = citySlug(row.city)
    // Only a city that has a page, in the same country (two countries can share a town name).
    if (country.get(slug) !== row.country) continue
    const changed = row.changed ? new Date(row.changed) : new Date(0)
    const known = found.get(slug)
    if (!known || changed > known) found.set(slug, changed)
  }
  return found
}

/** True when the city's page may be in search engines and in the sitemap (see indexableCities). */
export async function cityIsIndexable(slug: string): Promise<boolean> {
  return (await indexableCities()).has(slug)
}
