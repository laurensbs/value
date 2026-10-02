import { NextResponse } from 'next/server'
import { apiMember, fail, json } from '@/server/api'
import { addPhoto, walkAccess, walkPhotos } from '@/server/walks'

/** The walk's photos, oldest first. `?after=<ms>` returns only newer ones. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const { id } = await ctx.params
  if (!(await walkAccess(id, viewer))) return fail('forbidden', 403)
  const after = Number(new URL(request.url).searchParams.get('after') ?? 0) || 0
  const photos = await walkPhotos(id, after)
  return json({ photos: photos.map((p) => ({ id: p.id, url: p.url, t: p.t.getTime() })) })
}

/**
 * The walker shares a photo during the walk. Upload the image first (POST /api/upload, which
 * returns { url }), then send { url } here. At most 12 per walk.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const { id } = await ctx.params
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null
  const result = await addPhoto(id, viewer, body?.url)
  if (!result.ok) return fail(result.error ?? 'invalid', result.error === 'forbidden' ? 403 : 400)
  return json({ ok: true, photo: result.photo })
}
