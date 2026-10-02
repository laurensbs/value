'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { COUNTRIES, COUNTRY_INFO, type Country } from '@/lib/countries'
import { useForm } from '@/lib/use-form'
import type { FormState } from '@/server/actions/profile'
import { addStaff, cancelGroupWalk, createGroupWalk, createOrganization, importDogs, markAttendance } from '@/server/actions/shelters'
import { Icon } from './Icon'
import { LocationPicker } from './LocationPicker'
import { SubmitButton } from './SubmitButton'

function ErrorText({ error }: { error?: string }) {
  const t = useTranslations()
  if (!error) return null
  const key = t.has(`shelter.errors.${error}`) ? `shelter.errors.${error}` : t.has(`request.reasons.${error}`) ? `request.reasons.${error}` : 'errors.generic'
  return (
    <p className="notice danger" role="alert">
      {t(key)}
    </p>
  )
}

export interface ShelterPrefill {
  directoryId?: string
  name?: string
  country?: Country
  city?: string
  website?: string
  lat?: number | null
  lng?: number | null
}

export function ShelterForm({ prefill, email }: { prefill: ShelterPrefill; email: string }) {
  const t = useTranslations()
  const { state, pending, onSubmit } = useForm<FormState>(createOrganization, { ok: false })
  const [country, setCountry] = useState<Country>(prefill.country ?? 'NL')
  const point = prefill.lat != null && prefill.lng != null ? { lat: prefill.lat, lng: prefill.lng } : null
  return (
    <form onSubmit={onSubmit} className="form card">
      {prefill.directoryId ? <input type="hidden" name="directoryId" value={prefill.directoryId} /> : null}
      <label className="field">
        <span>{t('shelter.name')}</span>
        <input className="input" name="name" defaultValue={prefill.name} required minLength={2} maxLength={120} />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>{t('common.country')}</span>
          <select className="select" name="country" value={country} onChange={(e) => setCountry(e.target.value as Country)}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {COUNTRY_INFO[c].flag} {t(`common.countries.${c}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('common.city')}</span>
          <input className="input" name="city" defaultValue={prefill.city} required maxLength={60} />
        </label>
      </div>
      <label className="field">
        <span>{t('shelter.address')}</span>
        <input className="input" name="address" maxLength={200} autoComplete="street-address" />
      </label>
      <div className="field">
        <span>{t('shelter.where')}</span>
        <LocationPicker
          key={country}
          initial={country === prefill.country ? point : null}
          fallback={COUNTRY_INFO[country].center}
          labels={{ useMyLocation: t('onboarding.useMyLocation'), map: t('shelter.where') }}
        />
      </div>
      <div className="grid-2">
        <label className="field">
          <span>{t('shelter.registrationNumber')}</span>
          <input className="input" name="registrationNumber" required minLength={4} maxLength={40} />
        </label>
        <label className="field">
          <span>{t('shelter.website')}</span>
          <input className="input" name="website" defaultValue={prefill.website} maxLength={200} inputMode="url" />
        </label>
      </div>
      <div className="grid-2">
        <label className="field">
          <span>{t('shelter.email')}</span>
          <input className="input" type="email" name="email" defaultValue={email} required maxLength={200} />
        </label>
        <label className="field">
          <span>{t('shelter.phone')}</span>
          <input className="input" type="tel" name="phone" maxLength={30} />
        </label>
      </div>
      <label className="field">
        <span>{t('shelter.description')}</span>
        <textarea className="textarea" name="description" maxLength={1500} />
      </label>
      <label className="check">
        <input type="checkbox" name="authorized" required />
        <span>
          {t.rich('shelter.authorized', {
            terms: (c) => (
              <Link href="/legal/shelters" target="_blank">
                {c}
              </Link>
            ),
          })}
        </span>
      </label>
      <ErrorText error={state.error} />
      <SubmitButton className="button primary" pending={pending}>
        {t('shelter.create')}
      </SubmitButton>
    </form>
  )
}

type ImportState = FormState & { created?: number; errors?: { row: number; message: string }[] }

export function ImportForm({ orgId }: { orgId: string }) {
  const t = useTranslations('shelter')
  const { state, pending, onSubmit } = useForm<ImportState>(importDogs, { ok: false })
  return (
    <form onSubmit={onSubmit} className="form">
      <input type="hidden" name="orgId" value={orgId} />
      <p className="muted small">{t('importLede')}</p>
      <div>
        <a href="/rondje-honden-voorbeeld.csv" download className="button ghost small">
          <Icon name="download" size={16} /> {t('importTemplate')}
        </a>
      </div>
      <label className="field">
        <span>{t('importFile')}</span>
        <input className="input" type="file" name="file" accept=".csv,text/csv,text/plain" />
      </label>
      <label className="field">
        <span>{t('importPaste')}</span>
        <textarea className="textarea mono" name="csv" placeholder="name,breed,sex,age_years,size,energy,level,…" />
      </label>
      {state.ok ? (
        <p className="notice success" role="status">
          {t('imported', { n: state.created ?? 0 })}
        </p>
      ) : null}
      {state.errors?.length ? (
        <p className="notice warn small">{t('importErrors', { rows: state.errors.map((e) => `${e.row} (${e.message})`).join(', ') })}</p>
      ) : null}
      <ErrorText error={state.ok ? undefined : state.error} />
      <SubmitButton className="button primary" pending={pending}>
        <Icon name="upload" size={16} /> {t('importSubmit')}
      </SubmitButton>
    </form>
  )
}

export function GroupWalkForm({ orgId, defaultDate }: { orgId: string; defaultDate: string }) {
  const t = useTranslations()
  const { state, pending, onSubmit } = useForm<FormState>(createGroupWalk, { ok: false })
  return (
    <form onSubmit={onSubmit} className="form">
      <input type="hidden" name="orgId" value={orgId} />
      <div className="grid-2">
        <label className="field">
          <span>{t('request.date')}</span>
          <input className="input" type="date" name="date" defaultValue={defaultDate} required />
        </label>
        <label className="field">
          <span>{t('request.time')}</span>
          <input className="input" type="time" name="time" defaultValue="10:00" step={900} required />
        </label>
      </div>
      <div className="grid-2">
        <label className="field">
          <span>{t('shelter.duration')}</span>
          <input className="input" type="number" name="durationMin" min={15} max={240} step={15} defaultValue={60} required />
        </label>
        <label className="field">
          <span>{t('shelter.capacity')}</span>
          <input className="input" type="number" name="capacity" min={1} max={30} defaultValue={8} required />
        </label>
      </div>
      <fieldset className="field">
        <legend>{t('shelter.level')}</legend>
        <div className="choices">
          {(['starter', 'experienced'] as const).map((l) => (
            <label key={l} className="choice">
              <input type="radio" name="level" value={l} defaultChecked={l === 'starter'} />
              <span>{t(`dogs.level.${l}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>{t('shelter.meetingPoint')}</span>
        <input className="input" name="meetingPoint" required minLength={2} maxLength={200} />
      </label>
      <label className="field">
        <span>
          {t('shelter.notes')} <span className="muted">({t('common.optional')})</span>
        </span>
        <textarea className="textarea short" name="notes" maxLength={600} />
      </label>
      {state.ok ? (
        <p className="notice success" role="status">
          {t('shelter.groupWalkCreated')}
        </p>
      ) : null}
      <ErrorText error={state.ok ? undefined : state.error} />
      <SubmitButton className="button primary" pending={pending}>
        {t('shelter.newGroupWalk')}
      </SubmitButton>
    </form>
  )
}

export function AttendanceButtons({ groupWalkId, userId, status, idChecked }: { groupWalkId: string; userId: string; status: string; idChecked: boolean }) {
  const t = useTranslations('shelter')
  const [pending, start] = useTransition()
  const [idSeen, setIdSeen] = useState(idChecked)
  if (status === 'attended') return <span className="pill green">{t('attended')}</span>
  if (status === 'no_show') return <span className="pill warn">{t('noShow')}</span>
  return (
    <div className="row attendance">
      <label className="check small">
        <input type="checkbox" checked={idSeen} onChange={(e) => setIdSeen(e.target.checked)} />
        <span>{t('idSeen')}</span>
      </label>
      <button type="button" className="button primary small" disabled={pending} onClick={() => start(() => markAttendance(groupWalkId, userId, true, idSeen))}>
        {t('attended')}
      </button>
      <button type="button" className="button ghost small" disabled={pending} onClick={() => start(() => markAttendance(groupWalkId, userId, false, false))}>
        {t('noShow')}
      </button>
    </div>
  )
}

export function CancelGroupWalkButton({ groupWalkId }: { groupWalkId: string }) {
  const t = useTranslations()
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)
  return confirming ? (
    <div className="row">
      <button type="button" className="button danger small" disabled={pending} onClick={() => start(() => cancelGroupWalk(groupWalkId))}>
        {t('shelter.cancelWalk')}
      </button>
      <button type="button" className="button ghost small" onClick={() => setConfirming(false)}>
        {t('requests.keep')}
      </button>
    </div>
  ) : (
    <button type="button" className="button ghost small" onClick={() => setConfirming(true)}>
      {t('shelter.cancelWalk')}
    </button>
  )
}

export function StaffForm({ orgId }: { orgId: string }) {
  const t = useTranslations('shelter')
  const { state, pending, onSubmit } = useForm<FormState>(addStaff, { ok: false })
  return (
    <form onSubmit={onSubmit} className="form">
      <input type="hidden" name="orgId" value={orgId} />
      <div className="inline-form">
        <input className="input" type="email" name="email" required placeholder="naam@opvang.nl" aria-label={t('email')} />
        <SubmitButton className="button secondary" pending={pending}>
          {t('addStaff')}
        </SubmitButton>
      </div>
      <p className="hint">{t('staffHint')}</p>
      {state.ok ? <p className="notice success">{t('staffAdded')}</p> : <ErrorText error={state.error} />}
    </form>
  )
}
