'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { startTransition, useActionState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { QUIZ_LESSON } from '@/lib/lessons'
import { QUIZ } from '@/lib/quiz'
import { freshQuiz, parseQuizProgress, type QuizProgress, readQuizStore, saveQuizProgress, subscribeQuizStore } from '@/lib/quiz-progress'
import { playSound } from '@/lib/sounds'
import { submitQuiz, type FormState } from '@/server/actions/profile'
import { Icon } from './Icon'

type QuizState = FormState & { wrong?: string[] }

/** Without a connection the answers stay where they are, with one plain sentence (onderzoek §3.8). */
async function send(prev: QuizState, data: FormData): Promise<QuizState> {
  try {
    return await submitQuiz(prev, data)
  } catch {
    return { ok: false, error: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'server' }
  }
}

/**
 * The safety quiz, calmly (besluit 4 okt 2026): one question at a time, no clock and no score. After
 * each answer you read why; a question you miss comes back at the end, until every one is right. Only
 * then are the answers sent, and the server checks them again (submitQuiz). Where you are is kept for
 * this tab (lib/quiz-progress.ts), so a detour through a lesson carries on at the same question.
 * `back` is this quiz page's own address.
 */
export function QuizForm({ next, back }: { next: string; back: string }) {
  const t = useTranslations('quiz')
  const ts = useTranslations('school')
  const te = useTranslations('errors')
  const [state, submit, pending] = useActionState<QuizState, FormData>(send, { ok: false })
  // The server renders the start; the browser then picks up where this tab was (if anywhere).
  const raw = useSyncExternalStore(subscribeQuizStore, readQuizStore, () => null)
  const progress = useMemo(() => parseQuizProgress(raw, back) ?? freshQuiz(back), [raw, back])
  const { queue, round, answers, choice, checked } = progress
  const update = (change: Partial<QuizProgress>) => saveQuizProgress({ ...progress, ...change })
  const heading = useRef<HTMLLegendElement>(null)
  const feedback = useRef<HTMLDivElement>(null)
  const done = useRef<HTMLHeadingElement>(null)
  const question = QUIZ.find((q) => q.id === queue[0]) ?? null
  const right = question !== null && choice === question.correct

  // Each new question (not the first, which the page heading introduces) takes the focus.
  useEffect(() => {
    if (round > 0) heading.current?.focus({ preventScroll: true })
  }, [round])

  useEffect(() => {
    if (checked) feedback.current?.focus({ preventScroll: true })
  }, [checked])

  useEffect(() => {
    if (state.ok) {
      // Passed: nothing to come back to.
      saveQuizProgress(null)
      done.current?.focus({ preventScroll: true })
      playSound('success')
    }
  }, [state.ok])

  if (state.ok) {
    return (
      <section className="quiz-done card stack" aria-labelledby="quiz-done-title">
        <span className="quiz-done-mark" aria-hidden="true">
          <Icon name="shield" size={32} />
        </span>
        <h2 id="quiz-done-title" ref={done} tabIndex={-1}>
          {t('done')}
        </h2>
        <p>{t('passed')}</p>
        <Link href={next} className="button primary big wide">
          {t('next')}
        </Link>
      </section>
    )
  }

  function check() {
    if (choice === null || !question) return
    update({ checked: true })
    // A soft sound for a right answer; a miss stays quiet.
    if (choice === question.correct) playSound('select')
  }

  function onward() {
    if (!question || choice === null) return
    const rest = queue.slice(1)
    if (right) {
      const all = { ...answers, [question.id]: choice }
      if (rest.length === 0) {
        update({ answers: all })
        const data = new FormData()
        for (const [id, answer] of Object.entries(all)) data.set(`q-${id}`, String(answer))
        startTransition(() => submit(data))
        return
      }
      update({ answers: all, queue: rest, choice: null, checked: false, round: round + 1 })
    } else {
      // A question you missed comes back once the others are done.
      update({ queue: [...rest, question.id], choice: null, checked: false, round: round + 1 })
    }
  }

  if (!question) return null

  return (
    <div className="quiz-flow stack">
      {/* One paw per question, like the app: green once it was right, the current one a little bigger. Never red. */}
      <div className="quiz-paws" aria-hidden="true">
        {QUIZ.map((q) => (
          <span key={q.id} className={`${q.id in answers ? 'is-right' : ''}${q.id === question.id ? ' is-now' : ''}`}>
            <Icon name="paw" size={20} />
          </span>
        ))}
      </div>
      <p className="muted small" aria-live="polite">
        {t('left', { n: queue.length })}
      </p>
      <form
        key={`${question.id}-${round}`}
        className="quiz-step card stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (checked) onward()
          else check()
        }}
      >
        <fieldset className="field" disabled={checked || pending}>
          <legend className="quiz-question" ref={heading} tabIndex={-1}>
            {t(`q.${question.id}.q`)}
          </legend>
          <div className="stack-s">
            {Array.from({ length: question.options }, (_, i) => (
              <label key={i} className={`check quiz-option${checked && i === question.correct ? ' is-right' : ''}${checked && i === choice && !right ? ' is-wrong' : ''}`}>
                <input type="radio" name="answer" value={i} checked={choice === i} onChange={() => update({ choice: i })} />
                <span>{t(`q.${question.id}.a${i}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {checked ? (
          <div className={`quiz-feedback ${right ? 'right' : 'wrong'}`} ref={feedback} tabIndex={-1} role="status">
            <strong>{right ? t('right') : t('notQuite')}</strong>
            {right ? null : <p>{t('answerWas', { answer: t(`q.${question.id}.a${question.correct}`) })}</p>}
            <p>{t(`q.${question.id}.why`)}</p>
            {right ? null : <p className="muted small">{t('comesBack')}</p>}
            {right || !QUIZ_LESSON[question.id] ? null : (
              // The lesson that teaches this, and from there straight back to the quiz.
              <Link href={`/school/${QUIZ_LESSON[question.id]}?back=${encodeURIComponent(back)}`} className="quiz-lesson-link">
                {t('lessonLink', { title: ts(`lessons.${QUIZ_LESSON[question.id]}.title`) })}
              </Link>
            )}
          </div>
        ) : null}
        {state.error ? (
          <p className="error-text" role="alert">
            {te(state.error === 'offline' ? 'offline' : 'server')}
          </p>
        ) : null}
        <button type="submit" className="button primary big wide" disabled={(!checked && choice === null) || pending} aria-busy={pending}>
          {checked ? t('next') : t('check')}
        </button>
      </form>
    </div>
  )
}
