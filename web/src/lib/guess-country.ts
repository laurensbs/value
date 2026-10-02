import 'server-only'
import { headers } from 'next/headers'
import { getLocale } from 'next-intl/server'
import { isCountry, type Country } from './countries'

/** A sensible default country for forms: the browser's region (nl-BE → BE), else the language. */
export async function guessCountry(): Promise<Country> {
  const accept = (await headers()).get('accept-language') ?? ''
  for (const part of accept.split(',')) {
    const region = part.split(';')[0].trim().split('-')[1]?.toUpperCase()
    if (isCountry(region)) return region
  }
  const locale = await getLocale()
  return locale === 'es' ? 'ES' : locale === 'fr' ? 'BE' : 'NL'
}

/** The latest birth date that makes someone 18 today, as YYYY-MM-DD. */
export function adultBirthDateLimit(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()))
  return d.toISOString().slice(0, 10)
}
