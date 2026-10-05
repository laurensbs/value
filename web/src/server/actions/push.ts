'use server'

import { webPushSubscription } from '@/lib/push-endpoint'
import { registerDevice, removeDevice } from '../push'
import { actionViewer } from '../session'

/** The browser's push subscription, as PushSubscription.toJSON() gives it. */
export async function savePushSubscription(sub: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }): Promise<boolean> {
  const viewer = await actionViewer()
  const clean = webPushSubscription(sub)
  if (!clean) return false
  await registerDevice(viewer.userId, { kind: 'web', ...clean })
  return true
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const viewer = await actionViewer()
  if (typeof endpoint === 'string') await removeDevice(viewer.userId, endpoint)
}
