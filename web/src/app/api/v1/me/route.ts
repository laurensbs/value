import { NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'
import { ageBand, trustBadges } from '@/lib/rules'
import { apiViewer, fail, json } from '@/server/api'
import { deleteUserWithFiles } from '@/server/blob-cleanup'
import { dogsChanged } from '@/server/newest-dogs'
import { trustSignals, unreadCount } from '@/server/queries'
import { termsForApp } from '@/server/terms'

/**
 * Who is signed in, their profile and their trust signals, and where they stand with the terms
 * (server/terms.ts termsForApp): `termsVersion`, `termsAccepted`, `termsEffectiveAt`, `termsRequired`
 * and `termsChanges` (only while they still have to agree; then the app shows the notice, and
 * POST /api/v1/terms/accept records the yes). `termsChanges` lists what changed since the version they
 * agreed to: `items` for every version they skipped, newest first, and the same per version in `sections`.
 */
export async function GET() {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  const p = viewer.profile
  const [signals, terms] = await Promise.all([p ? trustSignals(viewer.userId) : null, termsForApp(p, await getLocale())])
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
      localNudges: p.localNudges,
      banned: Boolean(p.bannedAt),
    },
    trust: signals && { ...signals, badges: trustBadges(signals) },
    orgs: viewer.orgs,
    unread: await unreadCount(viewer.userId),
    ...terms,
  })
}

/** Deleting the account from inside the app (App Store rule 5.1.1(v), and the GDPR). Everything cascades; its own photos leave Vercel Blob. */
export async function DELETE(request: Request) {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as { confirm?: string } | null
  const confirm = String(body?.confirm ?? '').trim().toUpperCase()
  if (confirm !== 'VERWIJDER' && confirm !== 'DELETE') return fail('invalid')
  await deleteUserWithFiles(viewer.userId)
  // Their dogs leave the home page at once, not after the cache expires.
  dogsChanged()
  return json({ ok: true })
}
