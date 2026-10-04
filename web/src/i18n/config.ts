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

/** The best supported language in an Accept-Language header, or null when it names none of ours. */
export function fromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null
  const wanted = header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
      const weight = q ? Number(q.slice(2)) : 1
      return { lang: tag.trim().toLowerCase().split('-')[0], q: Number.isFinite(weight) ? weight : 0, index }
    })
    // q=0 means "not this one"; equal weights keep the order the browser gave.
    .filter((w) => w.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
  return wanted.find((w) => isLocale(w.lang))?.lang as Locale | undefined ?? null
}

// Where the visitor is, when the browser names none of our languages (Vercel's x-vercel-ip-country).
const DUTCH = ['NL', 'BE', 'SR', 'AW', 'CW', 'SX', 'BQ']
const SPANISH = ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR', 'GQ']
const FRENCH = ['FR', 'LU', 'MC']
// Wallonia (ISO 3166-2:BE), in case the region header says so; the rest of Belgium stays Dutch.
const WALLONIA = ['WAL', 'WBR', 'WHT', 'WLG', 'WLX', 'WNA']

/** The language for a country code: ours where people speak it, English anywhere else; null when unknown. */
export function fromCountry(country: string | null | undefined, region?: string | null): Locale | null {
  const code = country?.trim().toUpperCase()
  if (!code || !/^[A-Z]{2}$/.test(code)) return null
  if (code === 'BE' && region && WALLONIA.includes(region.trim().toUpperCase())) return 'fr'
  if (DUTCH.includes(code)) return 'nl'
  if (SPANISH.includes(code)) return 'es'
  if (FRENCH.includes(code)) return 'fr'
  return 'en'
}

export interface LocaleSignals {
  /** The language someone picked on this device (the NEXT_LOCALE cookie). */
  cookie?: string | null
  /** The language saved on their profile, when signed in. */
  profile?: string | null
  acceptLanguage?: string | null
  country?: string | null
  region?: string | null
}

/**
 * Which language a page is in: an explicit choice (cookie, then profile), else the browser's language
 * when we speak it, else the visitor's country, else Dutch. So an English-speaking expat in the
 * Netherlands gets English, and a visitor from abroad whose browser language we lack gets English too.
 */
export function pickLocale(signals: LocaleSignals): Locale {
  if (isLocale(signals.cookie)) return signals.cookie
  if (isLocale(signals.profile)) return signals.profile
  return fromAcceptLanguage(signals.acceptLanguage) ?? fromCountry(signals.country, signals.region) ?? DEFAULT_LOCALE
}
