'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isWeeklyGoal } from '@/lib/progress'
import { markProgressSeen } from '../progress'
import { actionViewer } from '../session'

/** The celebration was shown: don't show this level or these badges again. */
export async function celebrationSeen(level: number): Promise<void> {
  const viewer = await actionViewer()
  await markProgressSeen(viewer.userId, level)
}

/** Walks a week someone aims for, or null for no goal. */
export async function setWeeklyGoal(goal: number | null): Promise<void> {
  const viewer = await actionViewer()
  if (goal !== null && !isWeeklyGoal(goal)) return
  const db = await getDb()
  await db.update(s.profile).set({ weeklyGoal: goal }).where(eq(s.profile.userId, viewer.userId))
  revalidatePath('/')
}
