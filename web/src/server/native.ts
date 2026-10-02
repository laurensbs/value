import 'server-only'
import { headers } from 'next/headers'

/**
 * True for requests from the iOS and Android apps: the Capacitor shell appends "RondjeApp" to its
 * user agent (capacitor.config.ts). The apps never show ways to give money (App Store and Play rules).
 */
export async function isNativeRequest(): Promise<boolean> {
  return /\bRondjeApp\b/.test((await headers()).get('user-agent') ?? '')
}
