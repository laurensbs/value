import { z } from 'zod'
import { isCountry } from './countries'
import { PROVIDES, TREATS } from './dog-options'
import { isAllowedPhotoUrl } from './photos'

/** "@rondje.app", "rondje.app" or an instagram.com link → "rondje.app" (or null if it is not a handle). */
export function normalizeInstagram(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  const fromUrl = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?/i.exec(v)
  const handle = (fromUrl ? fromUrl[1] : v).replace(/^@/, '')
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle.toLowerCase() : null
}

/** Adds https:// when someone types "opvang.nl"; rejects anything that is not a plain web address. */
export function normalizeWebsite(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

const optionalText = (max: number) => z.string().trim().max(max).default('')

/** Everything a shelter tells Rondje about itself, shared by sign-up and later edits. */
export const orgDetailsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  country: z.string().refine(isCountry),
  city: z.string().trim().min(1).max(60),
  address: optionalText(200),
  registrationNumber: z.string().trim().min(4).max(40),
  website: optionalText(200),
  instagram: optionalText(120),
  email: z.string().trim().email().max(200),
  phone: optionalText(30),
  description: optionalText(1500),
  dogCount: z.coerce.number().int().min(0).max(2000).optional(),
  openingHours: optionalText(300),
  walkingTimes: optionalText(300),
  coordinatorName: optionalText(80),
  coordinatorEmail: z.union([z.literal(''), z.string().trim().email().max(200)]).default(''),
  coordinatorPhone: optionalText(30),
  treatsPolicy: z.enum(TREATS).default('own'),
  provides: z.array(z.enum(PROVIDES)).default([]),
  defaultWalkMinutes: z.coerce.number().int().min(10).max(180).default(45),
  logoUrl: z.string().max(600_000).refine((v) => v === '' || isAllowedPhotoUrl(v)).default(''),
  coverUrl: z.string().max(600_000).refine((v) => v === '' || isAllowedPhotoUrl(v)).default(''),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  directoryId: z.string().max(80).optional(),
})

export type OrgDetails = z.infer<typeof orgDetailsSchema>

/** Reads the shelter form (sign-up or edit) into the schema's input shape. */
export function readOrgForm(form: FormData) {
  const str = (k: string) => (form.get(k) == null ? undefined : String(form.get(k)))
  return orgDetailsSchema.safeParse({
    name: str('name'),
    country: str('country'),
    city: str('city'),
    address: str('address') ?? '',
    registrationNumber: str('registrationNumber'),
    website: str('website') ?? '',
    instagram: str('instagram') ?? '',
    email: str('email'),
    phone: str('phone') ?? '',
    description: str('description') ?? '',
    dogCount: str('dogCount') || undefined,
    openingHours: str('openingHours') ?? '',
    walkingTimes: str('walkingTimes') ?? '',
    coordinatorName: str('coordinatorName') ?? '',
    coordinatorEmail: str('coordinatorEmail') ?? '',
    coordinatorPhone: str('coordinatorPhone') ?? '',
    treatsPolicy: str('treatsPolicy') ?? 'own',
    provides: form.getAll('provides').map(String),
    defaultWalkMinutes: str('defaultWalkMinutes') || undefined,
    logoUrl: str('logoUrl') ?? '',
    coverUrl: str('coverUrl') ?? '',
    lat: str('lat') || undefined,
    lng: str('lng') || undefined,
    directoryId: str('directoryId') || undefined,
  })
}

/** Where an admin can look up a registration number: the Dutch KvK or the Belgian KBO. Null when there is no public register. */
export function registryLookupUrl(country: string, number: string): string | null {
  const digits = number.replace(/\D/g, '')
  if (country === 'NL' && digits.length === 8) return `https://www.kvk.nl/zoeken/?source=all&q=${digits}`
  if (country === 'BE' && (digits.length === 9 || digits.length === 10)) {
    return `https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=${digits.padStart(10, '0')}&actionLu=Zoek`
  }
  return null
}

/** True when the shelter's email address uses its website's domain: a small sign the sign-up is really from them. */
export function emailMatchesWebsite(email: string | null, website: string | null): boolean {
  const domain = email?.split('@')[1]?.toLowerCase().trim()
  if (!domain || !website) return false
  try {
    const host = new URL(website).hostname.toLowerCase().replace(/^www\./, '')
    return domain === host || domain.endsWith(`.${host}`) || host.endsWith(`.${domain}`)
  } catch {
    return false
  }
}
