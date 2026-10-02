import { DIRECTORY, type DirectoryShelter } from './directory'

/** At most this many tips and votes per person per 24 hours. */
export const MAX_TIPS_PER_DAY = 10

/** Handled tips are deleted after this many days; open ones after twice as long. */
export const TIP_RETENTION_DAYS = 365

export const TIP_STATUSES = ['new', 'contacted', 'joined', 'declined', 'duplicate', 'spam'] as const
export type TipStatus = (typeof TIP_STATUSES)[number]

// Words that only say "this is a shelter" (in Dutch, English, Spanish and French): ignored when comparing names.
const GENERIC = new Set([
  'stichting', 'vereniging', 'dierenopvang', 'dierenopvangcentrum', 'dierenasiel', 'asiel', 'opvang', 'dierentehuis',
  'dierenbescherming', 'hondenopvang', 'hondenasiel', 'dieren', 'honden', 'vzw', 'asbl', 'de', 'het', 'van', 'voor', 'en',
  'shelter', 'rescue', 'animal', 'animals', 'dog', 'dogs', 'the', 'of', 'and',
  'protectora', 'asociacion', 'animales', 'perrera', 'refugio', 'centro', 'proteccion', 'albergue', 'la', 'el', 'los', 'las', 'del', 'y',
  'refuge', 'spa', 'association', 'animaux', 'chiens', 'protection', 'le', 'les', 'des', 'du', 'et',
])

const plain = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** "Stichting Dierenasiel Amsterdam" and "dierenasiel amsterdam" both become "amsterdam". */
export function tipKey(name: string): string {
  const words = plain(name).split(/[^a-z0-9]+/).filter(Boolean)
  const specific = words.filter((w) => !GENERIC.has(w))
  return (specific.length ? specific : words).join('')
}

/** The shelter from our public directory that a tip is about, if we can tell for sure. */
export function matchDirectory(name: string, country: string, city?: string): DirectoryShelter | undefined {
  const key = tipKey(name)
  if (key.length < 3) return undefined
  const inCountry = DIRECTORY.filter((d) => d.country === country)
  const exact = inCountry.find((d) => tipKey(d.name) === key)
  if (exact) return exact
  // "Amsterdam" for "Dierenopvangcentrum Amsterdam (DOA)": only when the place matches too.
  const town = city ? plain(city).trim() : ''
  return inCountry.find((d) => {
    const other = tipKey(d.name)
    return other.length >= 5 && key.length >= 5 && (other.includes(key) || key.includes(other)) && town !== '' && plain(d.city ?? '') === town
  })
}
