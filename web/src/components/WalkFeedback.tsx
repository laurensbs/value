'use client'

import { useTranslations } from 'next-intl'
import { useState, useSyncExternalStore } from 'react'
import { useForm } from '@/lib/use-form'
import type { FormState } from '@/server/actions/profile'
import { submitFeedback } from '@/server/actions/walks'
import { moodFor, saveMood } from './progress/mood'
import { MoodPicker, MoodReply } from './progress/MoodPicker'
import { SubmitButton } from './SubmitButton'

const noop = () => () => undefined

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

/** A private check-in for the walker. It never leaves this browser (see progress/mood.ts). */
export function MoodCheck({ walkId }: { walkId: string }) {
  const t = useTranslations('walk')
  const stored = useSyncExternalStore(noop, () => moodFor(walkId), () => null)
  const [picked, setPicked] = useState<number | null>(null)
  const mood = picked ?? stored

  return (
    <section className="card flat stack-s mood">
      <MoodPicker
        id="mood-check"
        title={t('moodTitle')}
        value={mood}
        onPick={(value) => {
          setPicked(value)
          saveMood(value, walkId)
        }}
      />
      <p className="muted small">{t('moodPrivate')}</p>
      <MoodReply mood={mood} />
    </section>
  )
}
