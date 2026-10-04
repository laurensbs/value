import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { cleanLessonIds, type LessonId } from '@/lib/lessons'

/**
 * Vercel previews use the production database without migrating it (db/preview.ts). Until 0012 runs
 * in production, lesson_progress is not there yet: then the lessons stay in the browser
 * (localStorage) instead of breaking the page. Any other error is a real one.
 */
function missingTable(error: unknown): boolean {
  let e: unknown = error
  for (let depth = 0; depth < 4 && e && typeof e === 'object'; depth++) {
    if ((e as { code?: unknown }).code === '42P01') return true
    e = (e as { cause?: unknown }).cause
  }
  return false
}

/** The lessons someone finished, in path order. */
export async function lessonsDoneBy(userId: string): Promise<LessonId[]> {
  const db = await getDb()
  try {
    const rows = await db.select({ id: s.lessonProgress.lessonId }).from(s.lessonProgress).where(eq(s.lessonProgress.userId, userId))
    return cleanLessonIds(rows.map((r) => r.id))
  } catch (error) {
    if (missingTable(error)) return []
    throw error
  }
}

/** For the data export (GDPR): which lessons, and when. */
export async function lessonRowsFor(userId: string): Promise<{ lessonId: string; completedAt: Date }[]> {
  const db = await getDb()
  try {
    return await db
      .select({ lessonId: s.lessonProgress.lessonId, completedAt: s.lessonProgress.completedAt })
      .from(s.lessonProgress)
      .where(eq(s.lessonProgress.userId, userId))
  } catch (error) {
    if (missingTable(error)) return []
    throw error
  }
}

/**
 * Marks lessons as finished: real lesson ids only, each once (the first time stays). Nothing else
 * changes: no points, no badge, and the quiz stays the quiz. Returns every finished lesson, or null
 * when they could not be stored (see missingTable).
 */
export async function markLessonsDone(userId: string, ids: unknown): Promise<LessonId[] | null> {
  const lessons = cleanLessonIds(ids)
  const db = await getDb()
  try {
    if (lessons.length) {
      await db
        .insert(s.lessonProgress)
        .values(lessons.map((lessonId) => ({ userId, lessonId })))
        .onConflictDoNothing()
    }
  } catch (error) {
    if (missingTable(error)) return null
    throw error
  }
  return lessonsDoneBy(userId)
}
