import { deletePushSubscription, savePushSubscription } from '@/server/actions/push'
import { isIos, isStandalone } from './install-client'
import { isNativeApp } from './native'

/** Push in this browser: not possible here, blocked by the person, or off or on. */
export type PushState = 'unsupported' | 'blocked' | 'off' | 'on'

function urlBase64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration('/')) ?? navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

/**
 * Whether this browser can get push from Rondje, and whether it does. Never inside the app shell,
 * and on iPhone only after Rondje was added to the home screen.
 */
export async function pushState(): Promise<PushState> {
  if (isNativeApp() || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  // On iPhone and iPad it only works in Rondje on the home screen, whatever a browser there claims.
  if (isIos(navigator.userAgent, navigator.maxTouchPoints) && !isStandalone()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

/**
 * Asks for permission and subscribes this browser. Call it straight from a click: Safari only
 * shows the question during the click itself, so the permission request comes first.
 */
export async function enablePush(publicKey: string): Promise<PushState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  const reg = await registration()
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(publicKey) }))
  return (await savePushSubscription(sub.toJSON())) ? 'on' : 'off'
}

export async function disablePush(): Promise<void> {
  const reg = await registration()
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await deletePushSubscription(sub.endpoint)
    await sub.unsubscribe()
  }
}
