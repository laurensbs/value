// The push services browsers use. Web push sends to the address a browser hands out, so any
// other address would make Rondje's server call someone else's.
const PUSH_HOSTS = [
  'fcm.googleapis.com', // Chrome, Edge on Android, Samsung Internet, Opera, Brave
  'android.googleapis.com',
  'updates.push.services.mozilla.com', // Firefox
  'web.push.apple.com', // Safari and home-screen apps on iPhone
]
const PUSH_HOST_SUFFIXES = ['.notify.windows.com', '.push.apple.com'] // Edge on Windows, Apple

export interface WebPushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** A browser's push subscription (PushSubscription.toJSON()), checked before it is stored, or null. */
export function webPushSubscription(sub: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null | undefined): WebPushSubscription | null {
  const endpoint = sub?.endpoint
  const p256dh = sub?.keys?.p256dh
  const auth = sub?.keys?.auth
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return null
  if (typeof p256dh !== 'string' || !/^[A-Za-z0-9_+/-]{40,120}={0,2}$/.test(p256dh)) return null
  if (typeof auth !== 'string' || !/^[A-Za-z0-9_+/-]{10,60}={0,2}$/.test(auth)) return null
  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:' || url.port) return null
    const known = PUSH_HOSTS.includes(url.hostname) || PUSH_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))
    return known ? { endpoint, keys: { p256dh, auth } } : null
  } catch {
    return null
  }
}
