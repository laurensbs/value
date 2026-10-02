'use server'

import { registerDevice, removeDevice } from '../push'
import { actionViewer } from '../session'

/** The browser's push subscription, as PushSubscription.toJSON() gives it. */
export async function savePushSubscription(sub: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }): Promise<boolean> {
  const viewer = await actionViewer()
  const { endpoint, keys } = sub ?? {}
  if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || endpoint.length > 1000) return false
  if (typeof keys?.p256dh !== 'string' || typeof keys?.auth !== 'string') return false
  await registerDevice(viewer.userId, { kind: 'web', endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } })
  return true
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const viewer = await actionViewer()
  if (typeof endpoint === 'string') await removeDevice(viewer.userId, endpoint)
}
