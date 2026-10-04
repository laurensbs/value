'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { requestBlockKeys } from '@/lib/conversation'
import { MEET_VIAS, type MeetVia } from '@/lib/rules'
import { addSentence } from '@/lib/sentences'
import { playSound } from '@/lib/sounds'
import { useForm } from '@/lib/use-form'
import { createRequest } from '@/server/actions/requests'
import type { FormState } from '@/server/actions/profile'
import { ActionError, useActionErrorText } from './ActionError'
import { Icon } from './Icon'
import { MEET_VIA_ICONS } from './MeetVia'
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
  /** The owner's first name, as on the dog page: the request goes to them. */
  ownerName: string
  /**
   * A request or appointment with this dog that is still open (rules.ts openRequestConflict): then no
   * form for a second one. Part of this component, so a confirmation just shown stays when the page refreshes.
   */
  open?: { pending: boolean; when: string } | null
  walkerName: string
  meetReason: string | null
  soloReason: string | null
  defaultDate: string
  defaultTime: string
  moments: RequestMoment[]
}

/**
 * Asking to meet or walk a dog in a few taps: how to meet the first time (walking together, at the
 * owner's home, or a first call), one of the dog's own moments, and a message built from ready
 * sentences (each one can still be edited).
 */
/**
 * Sending without a connection (or a server that does not answer) keeps the form as it is, with one
 * plain sentence under it, instead of the page-wide error (onderzoek §3.3, §3.8).
 */
async function sendRequest(prev: FormState, form: FormData): Promise<FormState> {
  try {
    return await createRequest(prev, form)
  } catch {
    return { ok: false, error: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'server' }
  }
}

export function RequestForm({ dogId, dogName, ownerName, open, walkerName, meetReason, soloReason, defaultDate, defaultTime, moments }: Props) {
  const t = useTranslations('request')
  const tm = useTranslations('meet')
  const errorText = useActionErrorText()
  const { state, pending, onSubmit } = useForm<FormState>(sendRequest, { ok: false })
  const [kind, setKind] = useState<'meet' | 'solo'>(soloReason ? 'meet' : 'solo')
  const [meetVia, setMeetVia] = useState<MeetVia>('walk')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState(defaultTime)
  const [message, setMessage] = useState('')
  const reason = kind === 'solo' ? soloReason : meetReason
  // A sentence already in the message is not offered again; deleting it brings it back.
  const sentences = requestBlockKeys(kind)
    .map((key) => t(`blocks.${key}`, { dog: dogName, name: walkerName }))
    .filter((sentence) => !message.includes(sentence))
  // A soft "send" when the request is on its way, a soft "error" when it is not.
  useEffect(() => {
    if (state.ok) playSound('send')
    else if (state.error) playSound('error')
  }, [state])

  function add(sentence: string) {
    setMessage((text) => {
      const next = addSentence(text, sentence)
      return next.length > MESSAGE_MAX ? text : next
    })
  }

  if (state.ok) {
    return <RequestSent dogName={dogName} ownerName={ownerName} via={kind === 'solo' ? 'solo' : meetVia} flagged={state.message === 'sent-flagged'} />
  }

  if (open) {
    return (
      <div className="card flat stack-s request-open">
        <p>{open.pending ? t('openPending', { dog: dogName, owner: ownerName }) : t('openAccepted', { dog: dogName, when: open.when })}</p>
        <div className="row">
          <Link href="/requests" className="button secondary">
            {t('viewRequests')}
          </Link>
        </div>
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
        {kind === 'solo' ? <p className="hint">{t('kindSoloHint')}</p> : null}
      </fieldset>

      {reason ? (
        <div className="notice warn" role="note">
          <p>{t(`reasons.${reason}`)}</p>
        </div>
      ) : (
        <>
          {kind === 'meet' ? (
            <fieldset className="field meet-via-field">
              <legend>{tm('legend')}</legend>
              <div className="option-cards compact">
                {MEET_VIAS.map((via) => (
                  <label key={via} className="option-card">
                    <input type="radio" name="meetVia" value={via} checked={meetVia === via} onChange={() => setMeetVia(via)} />
                    <span className="option-icon" aria-hidden="true">
                      <Icon name={MEET_VIA_ICONS[via]} size={20} />
                    </span>
                    <span>
                      <strong>{tm(`via.${via}`)}</strong>
                      <span className="muted">{tm(`hint.${via}`)}</span>
                    </span>
                    <span className="option-radio" aria-hidden="true">
                      <Icon name="check" size={14} />
                    </span>
                  </label>
                ))}
              </div>
              {/* A visit at home and a first call each come with what to know beforehand. */}
              {meetVia === 'home' ? (
                <p className="notice small" role="note">
                  <Icon name="shield" size={18} /> <span>{tm('homeSafety')}</span>
                </p>
              ) : meetVia === 'phone' || meetVia === 'video' ? (
                <div className="notice small" role="note">
                  <Icon name={MEET_VIA_ICONS[meetVia]} size={18} />
                  <span>
                    {tm(meetVia === 'phone' ? 'phoneHow' : 'videoHow')} {tm('remoteNote')}
                  </span>
                </div>
              ) : null}
            </fieldset>
          ) : null}
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
          {state.error ? <ActionError code={state.error} text={errorText(state.error)} /> : null}
          <SubmitButton className="button primary wide" pending={pending}>
            {t('submit')}
          </SubmitButton>
        </>
      )}
    </form>
  )
}

/**
 * Right after sending (onderzoek §3.3): the form becomes a confirmation that says what happens now, in
 * three steps, and stays until "Klaar". The paw pops with the send sound; the text and the steps come in
 * after it. With less motion everything fades in at once. "Klaar" folds it into one quiet line, so the
 * form never comes back empty and invites a second request.
 */
function RequestSent({ dogName, ownerName, via, flagged }: { dogName: string; ownerName: string; via: MeetVia | 'solo'; flagged: boolean }) {
  const t = useTranslations('request')
  const [open, setOpen] = useState(true)
  const title = useRef<HTMLHeadingElement>(null)
  const after = useRef<HTMLDivElement>(null)

  // Keyboard and screen reader users land on the confirmation, wherever the submit button was.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    title.current?.focus({ preventScroll: true })
    title.current?.closest('.request-sent')?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [])

  useEffect(() => {
    if (!open) after.current?.focus({ preventScroll: true })
  }, [open])

  if (!open) {
    return (
      <div className="request-sent-done" ref={after} tabIndex={-1}>
        <span className="request-sent-done-icon" aria-hidden="true">
          <Icon name="check" size={18} />
        </span>
        <p>{t('sent', { dog: dogName })}</p>
        <Link href="/requests" className="button secondary">
          {t('viewRequests')}
        </Link>
      </div>
    )
  }

  return (
    <section className="request-sent card" aria-labelledby="request-sent-title">
      <span className="request-sent-paw" aria-hidden="true">
        <Icon name="paw" size={34} />
      </span>
      <h2 id="request-sent-title" className="request-sent-title" ref={title} tabIndex={-1}>
        {t('sentTitle', { owner: ownerName })}
      </h2>
      <p className="eyebrow request-sent-eyebrow" id="request-sent-next">
        {t('sentNext')}
      </p>
      <ol className="request-sent-steps" role="list" aria-labelledby="request-sent-next">
        <li>{t('sentStep1', { owner: ownerName })}</li>
        <li>{t('sentStep2', { owner: ownerName, kind: via === 'solo' ? 'solo' : 'meet' })}</li>
        <li>{t('sentStep3', { owner: ownerName, via: via === 'solo' ? 'other' : via })}</li>
      </ol>
      <p className="request-sent-notify">{t('sentNotify', { owner: ownerName })}</p>
      {flagged ? (
        <p className="notice warn small" role="note">
          <Icon name="alert" size={18} /> <span>{t('sentFlagged')}</span>
        </p>
      ) : null}
      <div className="request-sent-actions">
        <button type="button" className="button primary big wide" onClick={() => setOpen(false)}>
          {t('done')}
        </button>
        <Link href="/requests" className="button secondary big wide">
          {t('viewRequests')}
        </Link>
      </div>
    </section>
  )
}
