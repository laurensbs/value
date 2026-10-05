import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isTestServer } from '@/lib/clock'
import { compareTermsVersions } from '@/lib/rules'
import { TERMS_VERSION } from '@/lib/site'
import { getViewer } from '@/server/session'

/**
 * End-to-end tests only (e2e/terms.spec.ts): the signed-in person's yes goes back to an older version of
 * the terms, as for someone who signed up before they changed. Answers 404 anywhere but a test server
 * (lib/clock.ts isTestServer: TEST_CLOCK=1, never production). It only ever moves your own yes back,
 * never forward: nobody can agree to anything through it.
 */
export async function POST(request: Request) {
  if (!isTestServer(process.env)) return NextResponse.json({ error: 'not-found' }, { status: 404 })
  const viewer = await getViewer()
  if (!viewer?.profile) return NextResponse.json({ error: 'not-signed-in' }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { version?: unknown } | null
  const version = typeof body?.version === 'string' ? body.version : ''
  if (!/^\d+(\.\d+)*$/.test(version) || compareTermsVersions(version, TERMS_VERSION) >= 0) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }
  const db = await getDb()
  await db.update(s.profile).set({ termsVersion: version }).where(eq(s.profile.userId, viewer.userId))
  return NextResponse.json({ ok: true, termsVersion: version })
}
