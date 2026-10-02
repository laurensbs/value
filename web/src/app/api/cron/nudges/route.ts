import { NextResponse } from 'next/server'
import { sendNudges } from '@/server/nudges'
import { sendAppointmentReminders } from '@/server/reminders'

/**
 * Once a day in the morning (Vercel Cron). First a heads-up about today's and tomorrow's
 * appointments (server/reminders.ts), then the friendly reminders: the next first step, the weekly
 * goal, the town's challenge. At most one per person every few days, and none for someone who just
 * heard about an appointment; the rules are in lib/nudges.ts.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { people, ...reminders } = await sendAppointmentReminders()
  const nudges = await sendNudges(new Date(), new Set(people))
  return NextResponse.json({ ...nudges, reminders })
}
