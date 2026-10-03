'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { SubmitButton } from '@/components/SubmitButton'
import { useForm } from '@/lib/use-form'
import { saveContact, type ContactFormState } from '@/server/actions/launch'
import { AUDIENCES, type Audience, type ContactJson } from './audiences'

/** Add a contact, or edit one. Contact details are only stored in the database, never in the repo. */
export function ContactForm({ contact, audience = 'shelter', onSaved }: { contact?: ContactJson; audience?: Audience; onSaved?: () => void }) {
  const t = useTranslations('launch.contacts')
  const ta = useTranslations('launch.audience')
  const { state, pending, onSubmit } = useForm<ContactFormState>(saveContact, { ok: false })
  const form = useRef<HTMLFormElement>(null)
  const savedAt = state.ok ? state.savedAt : undefined
  // A saved new contact empties the form for the next one; an edit closes itself (onSaved).
  const handled = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!savedAt || handled.current === savedAt) return
    handled.current = savedAt
    if (!contact) form.current?.reset()
    onSaved?.()
  }, [savedAt, contact, onSaved])

  const id = contact?.id ?? 'new'
  return (
    <form ref={form} className="form launch-contact-form" onSubmit={onSubmit} noValidate>
      {contact ? <input type="hidden" name="id" value={contact.id} /> : null}
      <label className="field">
        <span>{t('fields.audience')}</span>
        <select className="select" name="audience" defaultValue={contact?.audience ?? audience}>
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {ta(a)}
            </option>
          ))}
        </select>
      </label>
      <div className="launch-form-grid">
        <label className="field">
          <span>{t('fields.name')}</span>
          <input className="input" name="name" defaultValue={contact?.name} maxLength={120} autoComplete="off" />
        </label>
        <label className="field">
          <span>{t('fields.organisation')}</span>
          <input className="input" name="organisation" defaultValue={contact?.organisation} maxLength={160} autoComplete="off" />
        </label>
        <label className="field">
          <span>{t('fields.email')}</span>
          <input className="input" name="email" type="email" inputMode="email" defaultValue={contact?.email ?? ''} maxLength={200} autoComplete="off" />
        </label>
        <label className="field">
          <span>{t('fields.phone')}</span>
          <input className="input" name="phone" type="tel" defaultValue={contact?.phone ?? ''} maxLength={40} autoComplete="off" />
        </label>
        <label className="field">
          <span>{t('fields.city')}</span>
          <input className="input" name="city" defaultValue={contact?.city} maxLength={80} autoComplete="off" />
        </label>
      </div>
      <label className="field">
        <span>{t('fields.note')}</span>
        <textarea className="textarea" name="note" defaultValue={contact?.note} maxLength={1000} rows={2} id={`contact-note-${id}`} />
      </label>
      {state.error ? (
        <p className="error-text" role="alert">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      {state.ok && !contact ? (
        <p className="small" role="status">
          {t('added')}
        </p>
      ) : null}
      <div>
        <SubmitButton pending={pending} className="button primary small">
          {contact ? t('save') : t('add')}
        </SubmitButton>
      </div>
    </form>
  )
}
