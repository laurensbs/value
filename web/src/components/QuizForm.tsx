'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { startTransition, useActionState, useEffect, useRef, useState } from 'react'
import { QUIZ } from '@/lib/quiz'
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
 * then are the answers sent, and the server checks them again (submitQuiz).
 */
export function QuizForm({ next }: { next: string }) {
  const t = useTranslations('quiz')
  const te = useTranslations('errors')
  const [state, submit, pending] = useActionState<QuizState, FormData>(send, { ok: false })
  const [queue, setQueue] = useState<string[]>(() => QUIZ.map((q) => q.id))
  const [round, setRound] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [choice, setChoice] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
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
    setChecked(true)
    // A soft sound for a right answer; a miss stays quiet.
    if (choice === question.correct) playSound('select')
  }

  function onward() {
    if (!question || choice === null) return
    const rest = queue.slice(1)
    if (right) {
      const all = { ...answers, [question.id]: choice }
      setAnswers(all)
      if (rest.length === 0) {
        const data = new FormData()
        for (const [id, answer] of Object.entries(all)) data.set(`q-${id}`, String(answer))
        startTransition(() => submit(data))
        return
      }
      setQueue(rest)
    } else {
      // A question you missed comes back once the others are done.
      setQueue([...rest, question.id])
    }
    setChoice(null)
    setChecked(false)
    setRound((n) => n + 1)
  }

  if (!question) return null

  return (
    <div className="quiz-flow stack">
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
                <input type="radio" name="answer" value={i} checked={choice === i} onChange={() => setChoice(i)} />
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
