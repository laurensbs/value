import { NextResponse } from 'next/server'
import { claimRun } from '@/server/cron'
import { sendNudges } from '@/server/nudges'
import { sendAppointmentReminders } from '@/server/reminders'

/**
 * Once a day in the morning (Vercel Cron). First a heads-up about today's and tomorrow's
 * appointments (server/reminders.ts), for everyone in one. Then the seintjes, only for people who
 * turned them on: the next first step, the town's challenge, a new dog nearby. At most one per
 * person a week, and none for someone who just heard about an appointment; the rules are in
 * lib/nudges.ts.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  // Without the secret anyone can call this; live, it then runs once a day, for whoever calls first.
  if (!secret && process.env.VERCEL_ENV === 'production' && !(await claimRun('nudges'))) {
    return NextResponse.json({ skipped: 'ran-today' })
  }
  const { people, ...reminders } = await sendAppointmentReminders()
  const nudges = await sendNudges(new Date(), new Set(people))
  return NextResponse.json({ ...nudges, reminders })
}
