/**
 * "Net aangemeld" on the home page: the newest real dogs, Netherlands first (besluit 5 okt 2026:
 * "eerst Nederland"). Only what /dogs would show too: active dogs, never examples (isDemo), and
 * shelter dogs only once their shelter is verified. The result carries the town and nothing else
 * about where a dog lives: no coordinates, no meeting place.
 */

/** The country whose dogs come first. */
export const FIRST_COUNTRY = 'NL'
/** How many dogs the home page shows. */
export const NEWEST_DOGS_LIMIT = 6

export interface NewestDogRow {
  id: string
  name: string
  breed: string
  city: string
  country: string
  photos: string[]
  avatar: unknown
  energy: string
  walkMinutes: number
  status: string
  isDemo: boolean
  orgId: string | null
  orgStatus: string | null
  orgIsDemo: boolean | null
  createdAt: Date | string
}

export interface NewestDog {
  id: string
  name: string
  breed: string
  /** The town only. */
  city: string
  country: string
  /** The first photo, or null: then the dog's drawn portrait is shown. */
  photo: string | null
  avatar: unknown
  energy: string
  walkMinutes: number
  host: 'owner' | 'shelter'
}

/** True for a dog anyone may see on /dogs: active, real, and (for a shelter dog) from a verified, real shelter. */
export function isListable(row: NewestDogRow): boolean {
  if (row.status !== 'active' || row.isDemo || !row.name.trim()) return false
  if (row.orgId) return row.orgStatus === 'verified' && !row.orgIsDemo
  return true
}

const time = (d: Date | string) => new Date(d).getTime() || 0

/** The newest listable dogs, dogs from the Netherlands first, then the rest; newest first within each. */
export function newestDogs(rows: NewestDogRow[], limit = NEWEST_DOGS_LIMIT): NewestDog[] {
  return rows
    .filter(isListable)
    .sort((a, b) => Number(b.country === FIRST_COUNTRY) - Number(a.country === FIRST_COUNTRY) || time(b.createdAt) - time(a.createdAt))
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      name: r.name,
      breed: r.breed,
      city: r.city,
      country: r.country,
      photo: r.photos.find((p) => p.trim()) ?? null,
      avatar: r.avatar ?? null,
      energy: r.energy,
      walkMinutes: r.walkMinutes,
      host: r.orgId ? 'shelter' : 'owner',
    }))
}
