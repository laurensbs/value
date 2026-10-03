import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { getViewer } from '@/server/session'

const MAX_BYTES = 4 * 1024 * 1024
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/**
 * Photo upload. The browser resizes photos first (max ~1200 px). With a Vercel Blob
 * store the photo is stored there; without one it is kept inline as a data URL.
 */
export async function POST(request: Request) {
  const viewer = await getViewer()
  if (!viewer) return NextResponse.json({ error: 'not-signed-in' }, { status: 401 })
  if (viewer.profile?.bannedAt) return NextResponse.json({ error: 'banned' }, { status: 403 })
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const ext = TYPES[file.type]
  if (!ext || file.size > MAX_BYTES) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`photos/${viewer.userId}/${crypto.randomUUID()}.${ext}`, file, {
      access: 'public',
      contentType: file.type,
    })
    return NextResponse.json({ url: blob.url })
  }
  if (file.size > 450_000) return NextResponse.json({ error: 'too-large' }, { status: 413 })
  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
  return NextResponse.json({ url: `data:${file.type};base64,${base64}` })
}
