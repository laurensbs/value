import type { Country } from './countries'
import { DIRECTORY } from './directory'
import { distanceM } from './geo'

export interface City {
  slug: string
  name: string
  country: Country
  /** The middle of the city's known shelters, or null when none has a location. */
  lat: number | null
  lng: number | null
}

/** "'s-Hertogenbosch" → "s-hertogenbosch", "València" → "valencia". */
export function citySlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type Place = { name: string | null; country: string; lat?: number | null; lng?: number | null }

/**
 * Cities with a public page: every city in the shelter directory plus cities of verified shelters.
 * The first spelling of a slug wins, so one city never gets two pages. Its location is the average
 * of the shelters there that have one.
 */
export function cityList(extra: Place[] = []): City[] {
  const bySlug = new Map<string, City>()
  const located = new Map<string, number>()
  const add = ({ name, country, lat, lng }: Place) => {
    const clean = name?.trim()
    if (!clean) return
    const slug = citySlug(clean)
    if (!slug) return
    const city = bySlug.get(slug) ?? { slug, name: clean, country: country as Country, lat: null, lng: null }
    bySlug.set(slug, city)
    if (lat == null || lng == null || city.country !== country) return
    const n = located.get(slug) ?? 0
    city.lat = ((city.lat ?? 0) * n + lat) / (n + 1)
    city.lng = ((city.lng ?? 0) * n + lng) / (n + 1)
    located.set(slug, n + 1)
  }
  for (const d of DIRECTORY) add({ name: d.city, country: d.country, lat: d.lat, lng: d.lng })
  for (const e of extra) add(e)
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, 'nl'))
}

/**
 * "Other cities" on a city page: the nearest ones in the same country, at most `max`. When some of
 * them have real dogs, walks or a partner shelter (`indexable`), only those are linked, so visitors and
 * search engines are led to pages with something on them. A city's location is where its shelters
 * are (see cityList); a city without any is not "near" anything, so the list is then empty and the
 * page leaves the section out. Other cities without a location are left out for the same reason.
 */
export function nearbyCities(city: City, all: City[], indexable: ReadonlySet<string>, max = 8): City[] {
  if (city.lat == null || city.lng == null) return []
  const from = { lat: city.lat, lng: city.lng }
  const others = all
    .flatMap((c) => (c.country === city.country && c.slug !== city.slug && c.lat != null && c.lng != null ? [{ c, m: distanceM(from, { lat: c.lat, lng: c.lng }) }] : []))
    .sort((a, b) => a.m - b.m || a.c.name.localeCompare(b.c.name, 'nl'))
    .map(({ c }) => c)
  const withContent = others.filter((c) => indexable.has(c.slug))
  return (withContent.length ? withContent : others).slice(0, max)
}
