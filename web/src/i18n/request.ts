import { cookies, headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { fromAcceptLanguage, isLocale, LOCALE_COOKIE, type Locale } from './config'

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

export async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value
  if (isLocale(fromCookie)) return fromCookie
  return fromAcceptLanguage((await headers()).get('accept-language'))
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale()
  // Dutch is the source language; any key missing in a translation falls back to it.
  const messages = locale === 'nl' ? await load('nl') : merge(await load('nl'), await load(locale))
  return { locale, messages, timeZone: 'Europe/Amsterdam' }
})
