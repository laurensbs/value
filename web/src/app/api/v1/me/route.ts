import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { ageBand, trustBadges } from '@/lib/rules'
import { apiViewer, fail, json } from '@/server/api'
import { trustSignals, unreadCount } from '@/server/queries'

/** Who is signed in, their profile and their trust signals. */
export async function GET() {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  const p = viewer.profile
  const signals = p ? await trustSignals(viewer.userId) : null
  return json({
    user: { id: viewer.userId, email: viewer.email, name: viewer.name, isAdmin: viewer.isAdmin },
    profile: p && {
      firstName: p.firstName,
      birthDate: p.birthDate,
      ageBand: ageBand(p.birthDate),
      country: p.country,
      city: p.city,
      bio: p.bio,
      experience: p.experience,
      photoUrl: p.photoUrl,
      phone: p.phone,
      wantsToWalk: p.wantsToWalk,
      hasDogs: p.hasDogs,
      weeklyGoal: p.weeklyGoal,
      quizPassed: Boolean(p.quizPassedAt),
      referralCode: p.referralCode,
      emailNotifications: p.emailNotifications,
      reminders: p.reminders,
      banned: Boolean(p.bannedAt),
    },
    trust: signals && { ...signals, badges: trustBadges(signals) },
    orgs: viewer.orgs,
    unread: await unreadCount(viewer.userId),
  })
}

/** Deleting the account from inside the app (App Store rule 5.1.1(v), and the GDPR). Everything cascades. */
export async function DELETE(request: Request) {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as { confirm?: string } | null
  const confirm = String(body?.confirm ?? '').trim().toUpperCase()
  if (confirm !== 'VERWIJDER' && confirm !== 'DELETE') return fail('invalid')
  const db = await getDb()
  await db.delete(s.user).where(eq(s.user.id, viewer.userId))
  return json({ ok: true })
}
