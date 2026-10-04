'use server'

import { markLessonsDone } from '../lessons'
import { getViewer } from '../session'

export interface LessonsState {
  /** True when the lessons are stored with the account; otherwise they stay in this browser. */
  ok: boolean
  done: string[]
}

/**
 * Stores finished lessons with the account: right after a lesson, and the lessons done as a guest
 * once someone has an account. Without an account (or before the table exists on a preview) it
 * answers ok: false and the browser keeps them.
 */
export async function saveLessons(ids: string[]): Promise<LessonsState> {
  const viewer = await getViewer()
  if (!viewer?.profile || viewer.profile.bannedAt) return { ok: false, done: [] }
  const done = await markLessonsDone(viewer.userId, ids)
  return done ? { ok: true, done } : { ok: false, done: [] }
}
