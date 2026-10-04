import { cleanLessonIds, type LessonId } from './lessons'

// Lessons finished in this browser: a guest's lessons until they have an account, and a member's
// lessons for as long as the server could not store them yet. Once stored with the account they are
// removed here. Storage can be blocked (private mode, a strict browser): then nothing is kept here and
// nothing breaks.

const KEY = 'rondje.lessons'
const EVENT = 'rondje:lessons'

/** The raw stored value, for useSyncExternalStore (a string compares by value, so no extra renders). */
export function readLessonStore(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function parseLessonStore(raw: string | null): LessonId[] {
  if (!raw) return []
  try {
    return cleanLessonIds(JSON.parse(raw))
  } catch {
    return []
  }
}

function write(ids: LessonId[]) {
  try {
    if (ids.length) localStorage.setItem(KEY, JSON.stringify(ids))
    else localStorage.removeItem(KEY)
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}

export function addLocalLesson(id: LessonId) {
  write(cleanLessonIds([...parseLessonStore(readLessonStore()), id]))
}

export function removeLocalLessons(ids: readonly string[]) {
  const gone = new Set(ids)
  write(parseLessonStore(readLessonStore()).filter((id) => !gone.has(id)))
}

/** Re-render when the lessons change here or in another tab. */
export function subscribeLessonStore(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}
