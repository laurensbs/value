import 'server-only'
import { headers } from 'next/headers'
import { appPlatform, PLATFORM_HEADER, type AppPlatform } from '@/lib/app-platform'

/**
 * True for requests from the iOS and Android apps: the Capacitor shell appends "RondjeApp" to its
 * user agent (capacitor.config.ts), and the native iPhone app sends "RondjeApp/1 iOS". The apps show
 * no costs, no /support page and no way to pay; the only way to give is "Help ons via Whydonate",
 * which opens the campaign in the phone's browser (components/HelpUsInApp.tsx).
 */
export async function isNativeRequest(): Promise<boolean> {
  return /\bRondjeApp\b/.test((await headers()).get('user-agent') ?? '')
}

/** Which app this request comes from (lib/app-platform.ts), or null when that is not clear. */
export async function requestPlatform(): Promise<AppPlatform | null> {
  const h = await headers()
  return appPlatform(h.get('user-agent'), h.get(PLATFORM_HEADER))
}
