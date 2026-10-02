'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from '@/lib/use-form'
import { createRequest } from '@/server/actions/requests'
import type { FormState } from '@/server/actions/profile'
import { SubmitButton } from './SubmitButton'

interface Props {
  dogId: string
  dogName: string
  meetReason: string | null
  soloReason: string | null
  defaultDate: string
  defaultTime: string
}

export function RequestForm({ dogId, dogName, meetReason, soloReason, defaultDate, defaultTime }: Props) {
  const t = useTranslations('request')
  const { state, pending, onSubmit } = useForm<FormState>(createRequest, { ok: false })
  const [kind, setKind] = useState<'meet' | 'solo'>(soloReason ? 'meet' : 'solo')
  const reason = kind === 'solo' ? soloReason : meetReason

  if (state.ok) {
    return (
      <div className={`notice ${state.message === 'sent-flagged' ? 'warn' : 'success'}`} role="status">
        <p>{state.message === 'sent-flagged' ? t('sentFlagged') : t('sent')}</p>
        <Link href="/requests" className="link-button">
          →
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="form card">
      <h2>{t('title')}</h2>
      <input type="hidden" name="dogId" value={dogId} />
      <fieldset className="field">
        <legend className="visually-hidden">{t('title')}</legend>
        <div className="choices">
          <label className="choice">
            <input type="radio" name="kind" value="meet" checked={kind === 'meet'} onChange={() => setKind('meet')} />
            <span>{t('kindMeet')}</span>
          </label>
          <label className="choice">
            <input type="radio" name="kind" value="solo" checked={kind === 'solo'} onChange={() => setKind('solo')} />
            <span>{t('kindSolo')}</span>
          </label>
        </div>
        <p className="hint">{kind === 'meet' ? t('kindMeetHint') : t('kindSoloHint')}</p>
      </fieldset>

      {reason ? (
        <div className="notice warn" role="note">
          <p>{t(`reasons.${reason}`)}</p>
        </div>
      ) : (
        <>
          <div className="grid-2">
            <label className="field">
              <span>{t('date')}</span>
              <input className="input" type="date" name="date" defaultValue={defaultDate} required />
            </label>
            <label className="field">
              <span>{t('time')}</span>
              <input className="input" type="time" name="time" defaultValue={defaultTime} step={900} required />
            </label>
          </div>
          {kind === 'solo' ? (
            <label className="check">
              <input type="checkbox" name="weekly" />
              <span>{t('weekly')}</span>
            </label>
          ) : null}
          <label className="field">
            <span>{t('message')}</span>
            <textarea className="textarea" name="message" maxLength={800} placeholder={`Hoi! ${dogName}…`} />
            <span className="hint">{t('messageHint')}</span>
          </label>
          <label className="check">
            <input type="checkbox" name="rules" required />
            <span>
              {t.rich('rules', {
                conduct: (c) => (
                  <Link href="/legal/conduct" target="_blank">
                    {c}
                  </Link>
                ),
              })}
            </span>
          </label>
          {state.error ? (
            <p className="error-text" role="alert">
              {t(`reasons.${state.error}`)}
            </p>
          ) : null}
          <SubmitButton className="button primary wide" pending={pending}>
            {t('submit')}
          </SubmitButton>
        </>
      )}
    </form>
  )
}
