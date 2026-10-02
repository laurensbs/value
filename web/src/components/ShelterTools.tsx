'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { COUNTRIES, COUNTRY_INFO, type Country } from '@/lib/countries'
import { PROVIDES, TREATS, type Treats } from '@/lib/dog-options'
import { useForm } from '@/lib/use-form'
import type { FormState } from '@/server/actions/profile'
import {
  addStaff,
  cancelGroupWalk,
  createGroupWalk,
  createOrganization,
  importDogs,
  markAttendance,
  updateOrganization,
} from '@/server/actions/shelters'
import { Icon } from './Icon'
import { LocationPicker } from './LocationPicker'
import { PhotoUploader } from './PhotoUploader'
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

/** Everything the shelter forms show, from the database or from a directory entry. */
export interface OrgInitial {
  name: string
  country: Country
  city: string
  address: string
  registrationNumber: string
  website: string
  instagram: string
  email: string
  phone: string
  description: string
  dogCount: number | null
  openingHours: string
  walkingTimes: string
  coordinatorName: string
  coordinatorEmail: string
  coordinatorPhone: string
  treatsPolicy: Treats
  provides: string[]
  defaultWalkMinutes: number
  logoUrl: string
  coverUrl: string
  lat: number | null
  lng: number | null
}

/**
 * The shelter's details in three parts: who they are, how walking works there, and who to contact.
 * With lockIdentity (verified shelters) name, number and country are shown but cannot be changed.
 */
function OrgDetailsFields({ initial, lockIdentity = false, withCover = false }: { initial: OrgInitial; lockIdentity?: boolean; withCover?: boolean }) {
  const t = useTranslations()
  const [country, setCountry] = useState<Country>(initial.country)
  const point = initial.lat != null && initial.lng != null ? { lat: initial.lat, lng: initial.lng } : null
  return (
    <>
      <section className="form-section">
        <h2>{t('shelter.sections.about')}</h2>
        <label className="field">
          <span>{t('shelter.name')}</span>
          <input className="input" name="name" defaultValue={initial.name} required minLength={2} maxLength={120} readOnly={lockIdentity} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>{t('common.country')}</span>
            {lockIdentity ? (
              <>
                <input type="hidden" name="country" value={country} />
                <input className="input" value={`${COUNTRY_INFO[country].flag} ${t(`common.countries.${country}`)}`} readOnly />
              </>
            ) : (
              <select className="select" name="country" value={country} onChange={(e) => setCountry(e.target.value as Country)}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {COUNTRY_INFO[c].flag} {t(`common.countries.${c}`)}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="field">
            <span>{t('common.city')}</span>
            <input className="input" name="city" defaultValue={initial.city} required maxLength={60} />
          </label>
        </div>
        <label className="field">
          <span>{t('shelter.address')}</span>
          <input className="input" name="address" defaultValue={initial.address} maxLength={200} autoComplete="street-address" />
        </label>
        <div className="field">
          <span>{t('shelter.where')}</span>
          <LocationPicker
            key={country}
            initial={country === initial.country ? point : null}
            fallback={COUNTRY_INFO[country].center}
            labels={{ useMyLocation: t('onboarding.useMyLocation'), map: t('shelter.where') }}
          />
        </div>
        <div className="grid-2">
          <label className="field">
            <span>{t('shelter.registrationNumber')}</span>
            <input className="input" name="registrationNumber" defaultValue={initial.registrationNumber} required minLength={4} maxLength={40} readOnly={lockIdentity} />
          </label>
          <label className="field">
            <span>{t('shelter.dogCount')}</span>
            <input className="input" type="number" name="dogCount" min={0} max={2000} inputMode="numeric" defaultValue={initial.dogCount ?? ''} />
            <span className="hint">{t('shelter.dogCountHint')}</span>
          </label>
        </div>
        <label className="field">
          <span>{t('shelter.description')}</span>
          <textarea className="textarea" name="description" defaultValue={initial.description} maxLength={1500} placeholder={t('shelter.descriptionHint')} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>{t('shelter.website')}</span>
            <input className="input" name="website" defaultValue={initial.website} maxLength={200} inputMode="url" placeholder="www.opvang.nl" />
          </label>
          <label className="field">
            <span>{t('shelter.instagram')}</span>
            <input className="input" name="instagram" defaultValue={initial.instagram ? `@${initial.instagram}` : ''} maxLength={120} placeholder="@opvang" autoCapitalize="none" />
          </label>
        </div>
        <div className="field">
          <span>{t('shelter.logo')}</span>
          <PhotoUploader name="logoUrl" initial={initial.logoUrl ? [initial.logoUrl] : []} variant="logo" />
        </div>
        {withCover ? (
          <div className="field">
            <span>{t('shelter.cover')}</span>
            <PhotoUploader name="coverUrl" initial={initial.coverUrl ? [initial.coverUrl] : []} variant="dog" />
            <span className="hint">{t('shelter.coverHint')}</span>
          </div>
        ) : null}
      </section>

      <section className="form-section">
        <h2>{t('shelter.sections.walking')}</h2>
        <label className="field">
          <span>{t('shelter.walkingTimes')}</span>
          <textarea className="textarea short" name="walkingTimes" defaultValue={initial.walkingTimes} maxLength={300} placeholder={t('shelter.walkingTimesHint')} />
        </label>
        <label className="field">
          <span>
            {t('shelter.openingHours')} <span className="muted">({t('common.optional')})</span>
          </span>
          <input className="input" name="openingHours" defaultValue={initial.openingHours} maxLength={300} placeholder={t('shelter.openingHoursHint')} />
        </label>
        <fieldset className="field">
          <legend>{t('shelter.treatsLabel')}</legend>
          <div className="choices">
            {TREATS.map((v) => (
              <label key={v} className="choice">
                <input type="radio" name="treatsPolicy" value={v} defaultChecked={initial.treatsPolicy === v} />
                <span>{t(`shelter.treats.${v}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="field">
          <legend>{t('shelter.providesLabel')}</legend>
          <div className="choices">
            {PROVIDES.map((p) => (
              <label key={p} className="choice">
                <input type="checkbox" name="provides" value={p} defaultChecked={initial.provides.includes(p)} />
                <span>{t(`dog.provides.${p}`)}</span>
              </label>
            ))}
          </div>
          <span className="hint">{t('shelter.providesHint')}</span>
        </fieldset>
        <label className="field narrow-field">
          <span>{t('shelter.defaultWalkMinutes')}</span>
          <input className="input" type="number" name="defaultWalkMinutes" min={10} max={180} step={5} defaultValue={initial.defaultWalkMinutes} required />
        </label>
      </section>

      <section className="form-section">
        <h2>{t('shelter.sections.contact')}</h2>
        <div className="grid-2">
          <label className="field">
            <span>{t('shelter.email')}</span>
            <input className="input" type="email" name="email" defaultValue={initial.email} required maxLength={200} />
          </label>
          <label className="field">
            <span>{t('shelter.phone')}</span>
            <input className="input" type="tel" name="phone" defaultValue={initial.phone} maxLength={30} />
          </label>
        </div>
        <p className="muted small">{t('shelter.coordinatorHint')}</p>
        <label className="field">
          <span>{t('shelter.coordinatorName')}</span>
          <input className="input" name="coordinatorName" defaultValue={initial.coordinatorName} maxLength={80} autoComplete="name" />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>{t('shelter.coordinatorEmail')}</span>
            <input className="input" type="email" name="coordinatorEmail" defaultValue={initial.coordinatorEmail} maxLength={200} />
          </label>
          <label className="field">
            <span>{t('shelter.coordinatorPhone')}</span>
            <input className="input" type="tel" name="coordinatorPhone" defaultValue={initial.coordinatorPhone} maxLength={30} />
          </label>
        </div>
      </section>
    </>
  )
}

export function ShelterForm({ prefill, email }: { prefill: ShelterPrefill; email: string }) {
  const t = useTranslations()
  const { state, pending, onSubmit } = useForm<FormState>(createOrganization, { ok: false })
  const initial: OrgInitial = {
    ...EMPTY_ORG,
    name: prefill.name ?? '',
    country: prefill.country ?? 'NL',
    city: prefill.city ?? '',
    website: prefill.website ?? '',
    email,
    lat: prefill.lat ?? null,
    lng: prefill.lng ?? null,
  }
  return (
    <form onSubmit={onSubmit} className="form card dog-form">
      {prefill.directoryId ? <input type="hidden" name="directoryId" value={prefill.directoryId} /> : null}
      <OrgDetailsFields initial={initial} />
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

/** Editing the details later, from the dashboard. */
export function ShelterDetailsForm({ orgId, initial, lockIdentity }: { orgId: string; initial: OrgInitial; lockIdentity: boolean }) {
  const t = useTranslations()
  const { state, pending, onSubmit } = useForm<FormState>(updateOrganization, { ok: false })
  return (
    <form onSubmit={onSubmit} className="form dog-form">
      <input type="hidden" name="orgId" value={orgId} />
      {lockIdentity ? <p className="muted small">{t('shelter.identityLocked')}</p> : null}
      <OrgDetailsFields initial={initial} lockIdentity={lockIdentity} withCover />
      {state.ok ? (
        <p className="notice success" role="status">
          {t('shelter.detailsSaved')}
        </p>
      ) : (
        <ErrorText error={state.error} />
      )}
      <SubmitButton className="button primary" pending={pending}>
        {t('common.save')}
      </SubmitButton>
    </form>
  )
}

const EMPTY_ORG: OrgInitial = {
  name: '',
  country: 'NL',
  city: '',
  address: '',
  registrationNumber: '',
  website: '',
  instagram: '',
  email: '',
  phone: '',
  description: '',
  dogCount: null,
  openingHours: '',
  walkingTimes: '',
  coordinatorName: '',
  coordinatorEmail: '',
  coordinatorPhone: '',
  treatsPolicy: 'own',
  provides: ['bags', 'leash'],
  defaultWalkMinutes: 45,
  logoUrl: '',
  coverUrl: '',
  lat: null,
  lng: null,
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
