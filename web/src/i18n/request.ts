import { cookies, headers } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'
import { isLocale, LOCALE_COOKIE, pickLocale, type Locale } from './config'

type Messages = Record<string, unknown>

function merge(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base }
  for (const [key, value] of Object.entries(over)) {
    const prev = out[key]
    out[key] =
      value && typeof value === 'object' && !Array.isArray(value) && prev && typeof prev === 'object'
        ? merge(prev as Messages, value as Messages)
        : value
  }
  return out
}

async function load(locale: Locale): Promise<Messages> {
  return (await import(`../../messages/${locale}.json`)).default
}

/**
 * The language saved on the signed-in person's profile. Not for the native app: it signs in with a
 * Bearer token and sends the language the phone shows the app in, so that one wins there.
 */
async function profileLocale(h: Headers): Promise<string | null> {
  if (h.get('authorization')) return null
  try {
    const { getViewer } = await import('@/server/session')
    return (await getViewer())?.profile?.locale ?? null
  } catch (error) {
    // Next.js's own signals go on; a database hiccup only costs the profile's language.
    unstable_rethrow(error)
    return null
  }
}

/** See pickLocale: a choice (cookie, profile) first, then the browser's language, then the country, then Dutch. */
export async function resolveLocale(): Promise<Locale> {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value
  if (isLocale(cookie)) return cookie
  const h = await headers()
  return pickLocale({
    profile: await profileLocale(h),
    acceptLanguage: h.get('accept-language'),
    country: h.get('x-vercel-ip-country'),
    region: h.get('x-vercel-ip-country-region'),
  })
}

export default getRequestConfig(async ({ locale: explicit }) => {
  // An explicit locale (getTranslations({ locale })) wins, e.g. for share images in the sharer's language.
  const locale = isLocale(explicit) ? explicit : await resolveLocale()
  // Dutch is the source language; any key missing in a translation falls back to it.
  const messages = locale === 'nl' ? await load('nl') : merge(await load('nl'), await load(locale))
  return { locale, messages, timeZone: 'Europe/Amsterdam' }
})
