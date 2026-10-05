/** The two apps: the iPhone app and the Android app. */
export type AppPlatform = 'ios' | 'android'

/** The header the native iPhone app sends with every API call (ios/Rondje/Core/APIClient.swift). */
export const PLATFORM_HEADER = 'x-rondje-platform'

/**
 * Which app a request comes from, or null when that is not clear (the website, a crawler).
 *
 * - The native iPhone app names itself: `X-Rondje-Platform: ios` (and its user agent is "RondjeApp/1 iOS").
 * - The Capacitor shells add "RondjeApp" to the phone's own user agent (capacitor.config.ts), so an
 *   iPhone says "iPhone" and an Android phone says "Android". An iPad asks for the desktop site and
 *   says "Macintosh"; there is no Mac app, so "RondjeApp" with "Macintosh" is the iPad.
 *
 * Only for choosing which switch applies (SUPPORT_IN_APP_IOS or _ANDROID), never for security.
 */
export function appPlatform(userAgent: string | null | undefined, header?: string | null): AppPlatform | null {
  const named = header?.trim().toLowerCase()
  if (named === 'ios' || named === 'android') return named
  const ua = userAgent ?? ''
  if (/\bAndroid\b/i.test(ua)) return 'android'
  if (/\b(iPhone|iPad|iPod|iOS)\b/.test(ua)) return 'ios'
  if (/\bRondjeApp\b/.test(ua) && /\bMacintosh\b/.test(ua)) return 'ios'
  return null
}
