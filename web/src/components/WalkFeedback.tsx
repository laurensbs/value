'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from '@/lib/use-form'
import type { FormState } from '@/server/actions/profile'
import { submitFeedback } from '@/server/actions/walks'
import { SubmitButton } from './SubmitButton'

function YesNo({ name, label }: { name: string; label: string }) {
  const t = useTranslations('common')
  return (
    <fieldset className="field">
      <legend>{label}</legend>
      <div className="choices">
        <label className="choice">
          <input type="radio" name={name} value="yes" required />
          <span>{t('yes')}</span>
        </label>
        <label className="choice">
          <input type="radio" name={name} value="no" />
          <span>{t('no')}</span>
        </label>
      </div>
    </fieldset>
  )
}

/** Private feedback after a walk. Only Rondje reads it; serious answers go to moderation. */
export function WalkFeedback({ walkId, role, dogName }: { walkId: string; role: 'walker' | 'owner'; dogName: string }) {
  const t = useTranslations('walk')
  const { state, pending, onSubmit } = useForm<FormState>(submitFeedback, { ok: false })

  if (state.ok) {
    return (
      <p className="notice success" role="status">
        {t('thanks')}
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="form card">
      <input type="hidden" name="walkId" value={walkId} />
      <div className="stack-s">
        <h2>{t('feedbackTitle')}</h2>
        <p className="muted small">{t('feedbackPrivate')}</p>
      </div>
      {role === 'walker' ? (
        <>
          <fieldset className="field">
            <legend>{t('dogBehaviour', { name: dogName })}</legend>
            <div className="choices">
              {(['easy', 'pulled', 'reactive', 'aggressive'] as const).map((v) => (
                <label key={v} className="choice">
                  <input type="radio" name="dogBehaviour" value={v} required />
                  <span>{t(`behaviour.${v}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <YesNo name="handoverOk" label={t('handoverOk')} />
          <YesNo name="feltSafe" label={t('feltSafe')} />
        </>
      ) : (
        <>
          <fieldset className="field">
            <legend>{t('dogCondition', { name: dogName })}</legend>
            <div className="choices">
              {(['happy', 'normal', 'stressed', 'injured'] as const).map((v) => (
                <label key={v} className="choice">
                  <input type="radio" name="dogCondition" value={v} required />
                  <span>{t(`condition.${v}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <YesNo name="onTime" label={t('onTime')} />
          <YesNo name="wouldAgain" label={t('wouldAgain')} />
        </>
      )}
      <label className="field">
        <span>{t('note')}</span>
        <textarea className="textarea" name="note" maxLength={1000} />
      </label>
      {state.error ? <p className="error-text">{t('feedbackError')}</p> : null}
      <SubmitButton className="button primary" pending={pending}>
        {t('sendFeedback')}
      </SubmitButton>
    </form>
  )
}

const MOOD_KEY = 'rondje:moods'

function saveMood(mood: number) {
  try {
    const list = JSON.parse(localStorage.getItem(MOOD_KEY) ?? '[]') as { t: number; mood: number }[]
    list.push({ t: Date.now(), mood })
    localStorage.setItem(MOOD_KEY, JSON.stringify(list.slice(-200)))
  } catch {
    // Storage can be unavailable (private mode); the check-in still helps in the moment.
  }
}

/** A private check-in for the walker. It never leaves the phone. */
export function MoodCheck() {
  const t = useTranslations('walk')
  const [mood, setMood] = useState<number | null>(null)

  function pick(value: number) {
    setMood(value)
    saveMood(value)
  }

  return (
    <section className="card flat stack-s mood">
      <h2>{t('moodTitle')}</h2>
      <p className="muted small">{t('moodPrivate')}</p>
      <div className="mood-scale" role="radiogroup" aria-label={t('moodTitle')}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} type="button" role="radio" aria-checked={mood === v} className={mood === v ? 'on' : ''} onClick={() => pick(v)}>
            <span aria-hidden="true">{['😞', '😕', '🙂', '😊', '🤩'][v - 1]}</span>
            <span>{t(`moods.${v}`)}</span>
          </button>
        ))}
      </div>
      {mood !== null && mood <= 2 ? (
        <p className="notice small">
          {t('moodLow')} <Link href="/help">{t('moodHelp')}</Link>
        </p>
      ) : mood !== null ? (
        <p className="hand">{t('moodThanks')}</p>
      ) : null}
    </section>
  )
}
