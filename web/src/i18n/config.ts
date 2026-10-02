export const LOCALES = ['nl', 'en', 'es', 'fr'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'nl'
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export const LOCALE_NAMES: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
  es: 'Español',
  fr: 'Français',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** Picks the best supported locale from an Accept-Language header. */
export function fromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE
  const wanted = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=')
      return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)
  return wanted.find((w) => isLocale(w.lang))?.lang as Locale | undefined ?? DEFAULT_LOCALE
}
