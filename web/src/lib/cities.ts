import type { Country } from './countries'
import { DIRECTORY } from './directory'

export interface City {
  slug: string
  name: string
  country: Country
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

/**
 * Cities with a public page: every city in the shelter directory plus cities of verified shelters.
 * The first spelling of a slug wins, so one city never gets two pages.
 */
export function cityList(extra: { name: string; country: string }[] = []): City[] {
  const bySlug = new Map<string, City>()
  const add = (name: string | null, country: string) => {
    const clean = name?.trim()
    if (!clean) return
    const slug = citySlug(clean)
    if (slug && !bySlug.has(slug)) bySlug.set(slug, { slug, name: clean, country: country as Country })
  }
  for (const d of DIRECTORY) add(d.city, d.country)
  for (const e of extra) add(e.name, e.country)
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, 'nl'))
}
