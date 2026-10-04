import { QUIZ } from './quiz'

// Where someone is in the safety quiz, for this browser tab only (sessionStorage). A miss links to the
// lesson that teaches it; coming back, the quiz carries on where it was instead of at question 1.
// Cleared once the quiz is passed. Storage can be blocked: then it lives in memory while the tab is
// open on the site, and nothing breaks.

export interface QuizProgress {
  /** The quiz page this belongs to (with its `next`): another way into the quiz starts fresh. */
  at: string
  /** The questions still to go, the current one first. */
  queue: string[]
  /** The answers that were right. */
  answers: Record<string, number>
  round: number
  choice: number | null
  checked: boolean
}

const KEY = 'rondje.quiz'
const EVENT = 'rondje:quiz'
let memory: string | null | undefined

export function freshQuiz(at: string): QuizProgress {
  return { at, queue: QUIZ.map((q) => q.id), answers: {}, round: 0, choice: null, checked: false }
}

/** The stored progress as a string, for useSyncExternalStore (compares by value). */
export function readQuizStore(): string | null {
  if (memory === undefined) {
    try {
      memory = sessionStorage.getItem(KEY)
    } catch {
      memory = null
    }
  }
  return memory
}

export function saveQuizProgress(progress: QuizProgress | null) {
  memory = progress ? JSON.stringify(progress) : null
  try {
    if (memory) sessionStorage.setItem(KEY, memory)
    else sessionStorage.removeItem(KEY)
  } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT))
}

export function subscribeQuizStore(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  return () => window.removeEventListener(EVENT, onChange)
}

const isIndex = (value: unknown, below: number) => Number.isInteger(value) && (value as number) >= 0 && (value as number) < below

/**
 * The stored progress for this quiz page, or null when there is none or it does not add up (another
 * page, an old version, edited by hand). Only answers that are right are kept; the server checks
 * everything again anyway.
 */
export function parseQuizProgress(raw: string | null, at: string): QuizProgress | null {
  if (!raw) return null
  let p: Partial<QuizProgress>
  try {
    p = JSON.parse(raw)
  } catch {
    return null
  }
  if (!p || typeof p !== 'object' || p.at !== at) return null
  const byId = new Map(QUIZ.map((q) => [q.id, q]))
  const queue = p.queue
  if (!Array.isArray(queue) || queue.length === 0 || new Set(queue).size !== queue.length || !queue.every((id) => byId.has(id))) return null
  const answers = p.answers
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return null
  for (const [id, answer] of Object.entries(answers)) if (byId.get(id)?.correct !== answer) return null
  // Every question is either still to go or answered right.
  if (!QUIZ.every((q) => queue.includes(q.id) || q.id in answers)) return null
  if (!Number.isInteger(p.round) || (p.round as number) < 0) return null
  const current = byId.get(queue[0])!
  if (p.choice !== null && !isIndex(p.choice, current.options)) return null
  if (typeof p.checked !== 'boolean' || (p.checked && p.choice === null)) return null
  return { at, queue, answers: { ...answers }, round: p.round as number, choice: p.choice ?? null, checked: p.checked }
}
