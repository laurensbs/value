import { NextResponse } from 'next/server'
import { apiViewer, json } from '@/server/api'
import { myGroupSignups, upcomingGroupWalks } from '@/server/queries'

/** Supervised group walks at verified shelters in your country. */
export async function GET() {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  const [walks, mine] = await Promise.all([
    upcomingGroupWalks({ country: viewer.profile?.country }),
    myGroupSignups(viewer.userId),
  ])
  return json({ groupWalks: walks.map((w) => ({ ...w, mine: mine.has(w.id) })) })
}
