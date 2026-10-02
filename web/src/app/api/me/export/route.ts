import { eq, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { getViewer } from '@/server/session'

/** GDPR data export: everything Rondje stores about the signed-in person, as JSON. */
export async function GET() {
  const viewer = await getViewer()
  if (!viewer) return NextResponse.json({ error: 'not-signed-in' }, { status: 401 })
  const db = await getDb()
  const id = viewer.userId
  const [account] = await db.select({ id: s.user.id, email: s.user.email, name: s.user.name, createdAt: s.user.createdAt }).from(s.user).where(eq(s.user.id, id))
  const data = {
    exportedAt: new Date().toISOString(),
    account,
    profile: viewer.profile,
    dogs: await db.select().from(s.dog).where(eq(s.dog.ownerId, id)),
    requests: await db.select().from(s.walkRequest).where(eq(s.walkRequest.walkerId, id)),
    walks: await db.select().from(s.walk).where(eq(s.walk.walkerId, id)),
    feedbackGiven: await db.select().from(s.feedback).where(eq(s.feedback.fromUserId, id)),
    reportsMade: await db.select().from(s.report).where(eq(s.report.reporterId, id)),
    idChecks: await db.select().from(s.idCheck).where(or(eq(s.idCheck.walkerId, id), eq(s.idCheck.checkedBy, id))),
    notifications: await db.select().from(s.notification).where(eq(s.notification.userId, id)),
  }
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rondje-gegevens.json"',
    },
  })
}
