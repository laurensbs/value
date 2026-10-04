'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { parseLessonStore, readLessonStore, removeLocalLessons, subscribeLessonStore } from '@/lib/lesson-storage'
import { cleanLessonIds, type LessonId } from '@/lib/lessons'
import { saveLessons } from '@/server/actions/lessons'

/**
 * The finished lessons: what the account has, plus what this browser kept (a guest's lessons, or a
 * lesson the server could not store yet). Signed in, lessons kept here are added to the account once,
 * and then removed from the browser.
 */
export function useLessons(serverDone: readonly LessonId[], signedIn: boolean): LessonId[] {
  const raw = useSyncExternalStore(subscribeLessonStore, readLessonStore, () => null)
  const local = useMemo(() => parseLessonStore(raw), [raw])
  const [saved, setSaved] = useState<string[]>([])

  useEffect(() => {
    if (!signedIn || local.length === 0) return
    const known = new Set([...serverDone, ...saved])
    const extra = local.filter((id) => !known.has(id))
    if (extra.length === 0) {
      // Already with the account: nothing to keep here.
      removeLocalLessons(local)
      return
    }
    let active = true
    saveLessons(extra)
      .then((result) => {
        // Not stored (no table yet on a preview): the browser keeps them. Superseded: the next run sends them again.
        if (!result.ok || !active) return
        setSaved(result.done)
        removeLocalLessons(extra)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [signedIn, local, serverDone, saved])

  return useMemo(() => cleanLessonIds([...serverDone, ...saved, ...local]), [serverDone, saved, local])
}
