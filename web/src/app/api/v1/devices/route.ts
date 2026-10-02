import { NextResponse } from 'next/server'
import { apiViewer, fail, json } from '@/server/api'
import { registerDevice, removeDevice } from '@/server/push'

const TOKEN = /^[0-9a-f]{64,200}$/i

/**
 * The iPhone app registers its APNs device token after the person allowed notifications:
 * { token: "<hex>", sandbox: true } for development builds, sandbox false (or left out) for the App Store.
 */
export async function POST(request: Request) {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as { token?: unknown; sandbox?: unknown } | null
  if (typeof body?.token !== 'string' || !TOKEN.test(body.token)) return fail('invalid')
  await registerDevice(viewer.userId, { kind: 'apns', endpoint: body.token.toLowerCase(), sandbox: body.sandbox === true })
  return json({ ok: true })
}

/** Signing out: { token } stops notifications to this phone. */
export async function DELETE(request: Request) {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null
  if (typeof body?.token === 'string') await removeDevice(viewer.userId, body.token.toLowerCase())
  return json({ ok: true })
}
