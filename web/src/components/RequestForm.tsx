'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { requestBlockKeys } from '@/lib/conversation'
import { addSentence } from '@/lib/sentences'
import { useForm } from '@/lib/use-form'
import { createRequest } from '@/server/actions/requests'
import type { FormState } from '@/server/actions/profile'
import { Icon } from './Icon'
import { SubmitButton } from './SubmitButton'

const MESSAGE_MAX = 800

/** One of the dog's weekly moments, on its next date. */
export interface RequestMoment {
  date: string
  time: string
  label: string
}

interface Props {
  dogId: string
  dogName: string
  walkerName: string
  meetReason: string | null
  soloReason: string | null
  defaultDate: string
  defaultTime: string
  moments: RequestMoment[]
}

/**
 * Asking to meet or walk a dog in a few taps: one of the dog's own moments, and a message built from
 * ready sentences (each one can still be edited).
 */
export function RequestForm({ dogId, dogName, walkerName, meetReason, soloReason, defaultDate, defaultTime, moments }: Props) {
  const t = useTranslations('request')
  const { state, pending, onSubmit } = useForm<FormState>(createRequest, { ok: false })
  const [kind, setKind] = useState<'meet' | 'solo'>(soloReason ? 'meet' : 'solo')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState(defaultTime)
  const [message, setMessage] = useState('')
  const reason = kind === 'solo' ? soloReason : meetReason
  // A sentence already in the message is not offered again; deleting it brings it back.
  const sentences = requestBlockKeys(kind)
    .map((key) => t(`blocks.${key}`, { dog: dogName, name: walkerName }))
    .filter((sentence) => !message.includes(sentence))

  function add(sentence: string) {
    setMessage((text) => {
      const next = addSentence(text, sentence)
      return next.length > MESSAGE_MAX ? text : next
    })
  }

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
          {moments.length ? (
            <div className="field">
              <span id="request-moments">{t('moments', { dog: dogName })}</span>
              <div className="chip-row" role="group" aria-labelledby="request-moments">
                {moments.map((moment) => {
                  const on = moment.date === date && moment.time === time
                  return (
                    <button
                      key={`${moment.date}T${moment.time}`}
                      type="button"
                      className={`chip${on ? ' on' : ''}`}
                      aria-pressed={on}
                      onClick={() => {
                        setDate(moment.date)
                        setTime(moment.time)
                      }}
                    >
                      {moment.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
          <div className="grid-2">
            <label className="field">
              <span>{t('date')}</span>
              <input className="input" type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="field">
              <span>{t('time')}</span>
              <input className="input" type="time" name="time" value={time} onChange={(e) => setTime(e.target.value)} step={900} required />
            </label>
          </div>
          {kind === 'solo' ? (
            <label className="check">
              <input type="checkbox" name="weekly" />
              <span>{t('weekly')}</span>
            </label>
          ) : null}
          <div className="field">
            <label htmlFor="request-message">{t('message')}</label>
            {sentences.length ? (
              <div className="chip-row sentences" role="group" aria-label={t('blocksLabel')}>
                {sentences.map((sentence) => (
                  <button key={sentence} type="button" className="chip" onClick={() => add(sentence)}>
                    <Icon name="plus" size={14} /> {sentence}
                  </button>
                ))}
              </div>
            ) : null}
            <textarea
              id="request-message"
              className="textarea"
              name="message"
              maxLength={MESSAGE_MAX}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('messagePlaceholder', { dog: dogName })}
            />
            <span className="hint">{t('messageHint')}</span>
          </div>
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
