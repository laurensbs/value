import { NextResponse } from 'next/server'
import { sendNudges } from '@/server/nudges'

/**
 * Friendly reminders, once a day in the morning (Vercel Cron): the next first step, the weekly
 * goal, the town's challenge. At most one per person every few days; the rules are in lib/nudges.ts.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return NextResponse.json(await sendNudges())
}
