// "Hoe voel je je?" after a walk. It stays in this browser only (localStorage), exactly like the
// iPhone app keeps it on the phone: it is for the walker, not for Rondje, and is never sent anywhere.

const KEY = 'rondje:moods'

/** The same five faces as the app, from "zwaar" to "top". */
export const MOOD_FACES = ['😞', '😕', '😐', '🙂', '😄'] as const

interface Entry {
  t: number
  mood: number
  walkId?: string
}

function read(): Entry[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown
    return Array.isArray(list) ? (list as Entry[]) : []
  } catch {
    return []
  }
}

/** The mood picked after this walk, if any (only in this browser). */
export function moodFor(walkId: string): number | null {
  return read().findLast((e) => e.walkId === walkId)?.mood ?? null
}

export function saveMood(mood: number, walkId?: string) {
  try {
    const list = read().filter((e) => !walkId || e.walkId !== walkId)
    list.push({ t: Date.now(), mood, ...(walkId ? { walkId } : {}) })
    localStorage.setItem(KEY, JSON.stringify(list.slice(-200)))
  } catch {
    // Storage can be unavailable (private mode); the check-in still helps in the moment.
  }
}
