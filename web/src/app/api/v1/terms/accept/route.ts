import { NextResponse } from 'next/server'
import { apiMember, fail, json } from '@/server/api'
import { acceptCurrentTerms } from '@/server/terms'

/**
 * The yes to the current terms, from the app's notice (terms art. 19). Body, optional:
 * `{ "version": "0.3" }`, the version the app showed; any other version is refused with 409
 * `terms-changed` (fetch /api/v1/me again and show the new changes). Answers
 * `{ ok: true, termsVersion, termsAcceptedAt }`. Agreeing again when already up to date changes nothing.
 */
export async function POST(request: Request) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as { version?: unknown } | null
  const result = await acceptCurrentTerms(viewer.userId, viewer.profile, body?.version)
  if (!result.ok) return fail(result.error, 409)
  return json({ ok: true, termsVersion: result.termsVersion, termsAcceptedAt: result.termsAcceptedAt.toISOString() })
}
