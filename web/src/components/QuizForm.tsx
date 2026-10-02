'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useForm } from '@/lib/use-form'
import { QUIZ } from '@/lib/quiz'
import { submitQuiz, type FormState } from '@/server/actions/profile'
import { SubmitButton } from './SubmitButton'

type QuizState = FormState & { wrong?: string[] }

export function QuizForm() {
  const t = useTranslations('quiz')
  const { state, pending, onSubmit } = useForm<QuizState>(submitQuiz, { ok: false })
  const wrong = new Set(state.wrong ?? [])

  if (state.ok) {
    return (
      <div className="notice success stack-s" role="status">
        <p>{t('passed')}</p>
        <Link href="/dogs" className="button primary small">
          {t('toDogs')}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="form quiz">
      <ol className="quiz-list">
        {QUIZ.map((q) => (
          <li key={q.id} className={`quiz-q card${wrong.has(q.id) ? ' wrong' : ''}`}>
            <fieldset className="field">
              <legend>{t(`q.${q.id}.q`)}</legend>
              <div className="stack-s">
                {[0, 1, 2].map((i) => (
                  <label key={i} className="check">
                    <input type="radio" name={`q-${q.id}`} value={i} required />
                    <span>{t(`q.${q.id}.a${i}`)}</span>
                  </label>
                ))}
              </div>
              {wrong.has(q.id) ? <p className="error-text">{t('tryAgain')}</p> : null}
            </fieldset>
          </li>
        ))}
      </ol>
      {state.error ? (
        <p className="notice warn" role="alert">
          {t('failed')}
        </p>
      ) : null}
      <SubmitButton className="button primary wide" pending={pending}>{t('submit')}</SubmitButton>
    </form>
  )
}
