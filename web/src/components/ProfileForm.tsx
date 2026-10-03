'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from '@/lib/use-form'
import { COUNTRIES, COUNTRY_INFO, type Country } from '@/lib/countries'
import { completeOnboarding, updateProfile, type FormState } from '@/server/actions/profile'
import { BioField } from './BioField'
import { LocationPicker } from './LocationPicker'
import { PhotoUploader } from './PhotoUploader'
import { SubmitButton } from './SubmitButton'

export interface ProfileInitial {
  firstName: string
  birthDate: string
  country: Country
  city: string
  lat: number | null
  lng: number | null
  bio: string
  experience: 'none' | 'some' | 'lots'
  phone: string
  languages: string[]
  photoUrl: string | null
  wantsToWalk: boolean
  hasDogs: boolean
  /** Walks a week someone aims for; only asked in onboarding and when editing. */
  weeklyGoal?: number | null
  pppLicense: boolean
}

export const LANGUAGES: [string, string][] = [
  ['nl', 'Nederlands'],
  ['en', 'English'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
]

interface Props {
  mode: 'onboarding' | 'edit'
  initial: ProfileInitial
  next?: string
  /** Latest allowed birth date (18 years ago), as YYYY-MM-DD. */
  maxBirthDate: string
}

export function ProfileForm({ mode, initial, next, maxBirthDate }: Props) {
  const t = useTranslations()
  const action = mode === 'onboarding' ? completeOnboarding : updateProfile
  const { state, pending, onSubmit } = useForm<FormState>(action, { ok: false })
  const [country, setCountry] = useState<Country>(initial.country)
  const info = COUNTRY_INFO[country]
  const initialPoint = initial.lat != null && initial.lng != null && country === initial.country ? { lat: initial.lat, lng: initial.lng } : null

  return (
    <form onSubmit={onSubmit} className="form profile-form">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <section className="form-section">
        <div className="field">
          <span>{t('onboarding.photo')}</span>
          <PhotoUploader name="photoUrl" initial={initial.photoUrl ? [initial.photoUrl] : []} variant="person" />
          <span className="hint">{t('onboarding.photoHint')}</span>
        </div>
        <div className="grid-2">
          <label className="field">
            <span>{t('onboarding.firstName')}</span>
            <input className="input" name="firstName" defaultValue={initial.firstName} autoComplete="given-name" required maxLength={40} />
          </label>
          <label className="field">
            <span>{t('onboarding.birthDate')}</span>
            <input className="input" type="date" name="birthDate" defaultValue={initial.birthDate} max={maxBirthDate} min="1920-01-01" autoComplete="bday" required />
          </label>
        </div>
        <p className="hint">{t('onboarding.birthDateHint')}</p>
      </section>

      <fieldset className="form-section field">
        <legend>{t('onboarding.want')}</legend>
        <label className="check">
          <input type="checkbox" name="wantsToWalk" defaultChecked={initial.wantsToWalk} />
          <span>{t('onboarding.wantsToWalk')}</span>
        </label>
        <label className="check">
          <input type="checkbox" name="hasDogs" defaultChecked={initial.hasDogs} />
          <span>{t('onboarding.hasDogs')}</span>
        </label>
      </fieldset>

      {mode === 'edit' ? (
        <label className="field form-section">
          <span>{t('profile.weeklyGoal')}</span>
          <select className="select" name="weeklyGoal" defaultValue={initial.weeklyGoal ? String(initial.weeklyGoal) : ''}>
            <option value="">{t('progress.goalNone')}</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {t('progress.goalOption', { n })}
              </option>
            ))}
          </select>
          <span className="hint">{t('profile.weeklyGoalHint')}</span>
        </label>
      ) : null}

      <fieldset className="form-section field">
        <legend>{t('onboarding.experience')}</legend>
        <div className="choices">
          {(['none', 'some', 'lots'] as const).map((level) => (
            <label key={level} className="choice">
              <input type="radio" name="experience" value={level} defaultChecked={initial.experience === level} />
              <span>{t(`onboarding.experience${level[0].toUpperCase()}${level.slice(1)}` as 'onboarding.experienceNone')}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="form-section">
        <BioField
          initial={initial.bio}
          facts={{ name: initial.firstName, city: initial.city, walker: initial.wantsToWalk, owner: initial.hasDogs, experience: initial.experience }}
        />
        <fieldset className="field">
          <legend>{t('onboarding.languages')}</legend>
          <div className="choices">
            {LANGUAGES.map(([code, label]) => (
              <label key={code} className="choice">
                <input type="checkbox" name="languages" value={code} defaultChecked={initial.languages.includes(code)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="form-section">
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
            <input className="input" name="city" defaultValue={initial.city} placeholder={info.defaultCity} autoComplete="address-level2" required maxLength={60} />
          </label>
        </div>
        <div className="field">
          <span>{t('onboarding.where')}</span>
          <LocationPicker
            key={country}
            initial={initialPoint}
            fallback={info.center}
            labels={{ useMyLocation: t('onboarding.useMyLocation'), map: t('onboarding.where') }}
          />
          <span className="hint">{t('onboarding.whereHint')}</span>
        </div>
        <label className="field">
          <span>
            {t('onboarding.phone')} <span className="muted">({t('common.optional')})</span>
          </span>
          <input className="input" type="tel" name="phone" defaultValue={initial.phone} autoComplete="tel" maxLength={30} />
          <span className="hint">{t('onboarding.phoneHint')}</span>
        </label>
        {mode === 'edit' && country === 'ES' ? (
          <label className="check">
            <input type="checkbox" name="pppLicense" defaultChecked={initial.pppLicense} />
            <span>{t('profile.ppp')}</span>
          </label>
        ) : null}
      </section>

      {mode === 'onboarding' ? (
        <label className="check">
          <input type="checkbox" name="terms" required />
          <span>
            {t.rich('onboarding.terms', {
              terms: (c) => (
                <Link href="/legal/terms" target="_blank">
                  {c}
                </Link>
              ),
              conduct: (c) => (
                <Link href="/legal/conduct" target="_blank">
                  {c}
                </Link>
              ),
              privacy: (c) => (
                <Link href="/legal/privacy" target="_blank">
                  {c}
                </Link>
              ),
            })}
          </span>
        </label>
      ) : null}

      {state.error ? (
        <p className="notice danger" role="alert">
          {t.has(`onboarding.errors.${state.error}`) ? t(`onboarding.errors.${state.error}`) : t('errors.generic')}
        </p>
      ) : null}
      {state.ok ? (
        <p className="notice success" role="status">
          {t('common.saved')}
        </p>
      ) : null}
      <SubmitButton className="button primary wide" pending={pending}>{mode === 'onboarding' ? t('onboarding.submit') : t('common.save')}</SubmitButton>
    </form>
  )
}
