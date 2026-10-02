'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { COUNTRIES, COUNTRY_INFO, type Country } from '@/lib/countries'
import { PROVIDES } from '@/lib/dog-options'
import { useForm } from '@/lib/use-form'
import { saveDog } from '@/server/actions/dogs'
import type { FormState } from '@/server/actions/profile'
import { Icon } from './Icon'
import { LocationPicker } from './LocationPicker'
import { PhotoUploader } from './PhotoUploader'
import { SubmitButton } from './SubmitButton'

export interface DogInitial {
  id?: string
  name: string
  breed: string
  sex: 'male' | 'female'
  ageYears: number | null
  size: 'small' | 'medium' | 'large'
  energy: 'calm' | 'medium' | 'high'
  level: 'starter' | 'experienced'
  ppp: boolean
  photos: string[]
  story: string
  needs: string
  traits: string[]
  treats: 'yes' | 'no' | 'own'
  treatsNote: string
  provides: string[]
  offLeash: boolean
  walkMinutes: number
  country: Country
  city: string
  lat: number | null
  lng: number | null
  meetingInfo: string
  vetInfo: string
  chipNumber: string
  insuranceConfirmed: boolean
  healthConfirmed: boolean
  biteHistory: boolean
  biteNote: string
  slots: { weekday: number; time: string }[]
}


function Choices<T extends string>({ name, values, value, label, render }: { name: string; values: readonly T[]; value: T; label: string; render: (v: T) => string }) {
  return (
    <fieldset className="field">
      <legend>{label}</legend>
      <div className="choices">
        {values.map((v) => (
          <label key={v} className="choice">
            <input type="radio" name={name} value={v} defaultChecked={value === v} />
            <span>{render(v)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function DogForm({ initial, orgId, cancelHref }: { initial: DogInitial; orgId?: string; cancelHref: string }) {
  const t = useTranslations()
  const { state, pending, onSubmit } = useForm<FormState>(saveDog, { ok: false })
  const [country, setCountry] = useState<Country>(initial.country)
  const [slots, setSlots] = useState(initial.slots)
  const [bite, setBite] = useState(initial.biteHistory)
  const isShelter = Boolean(orgId)
  const point = initial.lat != null && initial.lng != null && country === initial.country ? { lat: initial.lat, lng: initial.lng } : null

  return (
    <form onSubmit={onSubmit} className="form dog-form">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {orgId ? <input type="hidden" name="orgId" value={orgId} /> : null}
      <input type="hidden" name="slots" value={JSON.stringify(slots)} />

      {!isShelter && !initial.id ? <p className="notice small">{t('myDogs.forSomeone')}</p> : null}

      <section className="form-section">
        <h2>{t('myDogs.sections.basics')}</h2>
        <div className="field">
          <span>{t('myDogs.photos')}</span>
          <PhotoUploader name="photos" initial={initial.photos} max={6} variant="dog" />
          <span className="hint">{t('myDogs.photosHint')}</span>
        </div>
        <div className="grid-2">
          <label className="field">
            <span>{t('myDogs.name')}</span>
            <input className="input" name="name" defaultValue={initial.name} required maxLength={60} />
          </label>
          <label className="field">
            <span>{t('myDogs.breed')}</span>
            <input className="input" name="breed" defaultValue={initial.breed} maxLength={80} />
          </label>
        </div>
        <div className="grid-2">
          <Choices name="sex" values={['female', 'male'] as const} value={initial.sex} label={t('myDogs.sex')} render={(v) => t(`dogs.sex.${v}`)} />
          <label className="field">
            <span>{t('myDogs.age')}</span>
            <input className="input" type="number" name="ageYears" min={0} max={30} inputMode="numeric" defaultValue={initial.ageYears ?? ''} />
          </label>
        </div>
        <Choices name="size" values={['small', 'medium', 'large'] as const} value={initial.size} label={t('dog.sizeLabel')} render={(v) => t(`dogs.size.${v}`)} />
      </section>

      <section className="form-section">
        <h2>{t('myDogs.sections.character')}</h2>
        <Choices name="energy" values={['calm', 'medium', 'high'] as const} value={initial.energy} label={t('dog.energyLabel')} render={(v) => t(`dogs.energy.${v}`)} />
        <Choices name="level" values={['starter', 'experienced'] as const} value={initial.level} label={t('dog.levelLabel')} render={(v) => t(`dogs.level.${v}`)} />
        <label className="field">
          <span>{t('myDogs.story')}</span>
          <textarea className="textarea" name="story" defaultValue={initial.story} maxLength={1500} placeholder={t('myDogs.storyHint')} />
        </label>
        <label className="field">
          <span>
            {t('myDogs.needs')} <span className="muted">({t('common.optional')})</span>
          </span>
          <textarea className="textarea short" name="needs" defaultValue={initial.needs} maxLength={600} />
        </label>
        <label className="field">
          <span>{t('myDogs.traits')}</span>
          <input className="input" name="traits" defaultValue={initial.traits.join(', ')} maxLength={400} />
          <span className="hint">{t('myDogs.traitsHint')}</span>
        </label>
      </section>

      <section className="form-section">
        <h2>{t('myDogs.sections.walk')}</h2>
        <label className="field narrow-field">
          <span>{t('myDogs.walkMinutes')}</span>
          <input className="input" type="number" name="walkMinutes" min={10} max={180} step={5} defaultValue={initial.walkMinutes} required />
        </label>
        {!isShelter ? (
          <div className="field">
            <span>{t('myDogs.slots')}</span>
            <ul className="slots">
              {slots.map((slot, i) => (
                <li key={i} className="row">
                  <select
                    className="select"
                    aria-label={t('myDogs.weekday')}
                    value={slot.weekday}
                    onChange={(e) => setSlots((all) => all.map((s, j) => (j === i ? { ...s, weekday: Number(e.target.value) } : s)))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <option key={d} value={d}>
                        {t(`common.weekdays.${d}`)}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="time"
                    step={900}
                    aria-label={t('request.time')}
                    value={slot.time}
                    onChange={(e) => setSlots((all) => all.map((s, j) => (j === i ? { ...s, time: e.target.value } : s)))}
                  />
                  <button type="button" className="icon-link" aria-label={t('common.delete')} onClick={() => setSlots((all) => all.filter((_, j) => j !== i))}>
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              ))}
            </ul>
            <div>
              <button type="button" className="button secondary small" onClick={() => setSlots((all) => [...all, { weekday: 6, time: '10:00' }])} disabled={slots.length >= 21}>
                <Icon name="plus" size={16} /> {t('myDogs.addSlot')}
              </button>
            </div>
          </div>
        ) : null}
        <Choices name="treats" values={['yes', 'own', 'no'] as const} value={initial.treats} label={t('dog.treatsLabel')} render={(v) => t(`dog.treats.${v}`)} />
        <label className="field">
          <span>
            {t('myDogs.treatsNote')} <span className="muted">({t('common.optional')})</span>
          </span>
          <input className="input" name="treatsNote" defaultValue={initial.treatsNote} maxLength={200} />
        </label>
        <fieldset className="field">
          <legend>{t('dog.providesLabel')}</legend>
          <div className="choices">
            {PROVIDES.map((p) => (
              <label key={p} className="choice">
                <input type="checkbox" name="provides" value={p} defaultChecked={initial.provides.includes(p)} />
                <span>{t(`dog.provides.${p}`)}</span>
              </label>
            ))}
          </div>
          <span className="hint">{t('myDogs.providesHint')}</span>
        </fieldset>
        <label className="check">
          <input type="checkbox" name="offLeash" defaultChecked={initial.offLeash} />
          <span>{t('dog.offLeash')}</span>
        </label>
      </section>

      {!isShelter ? (
        <section className="form-section">
          <h2>{t('myDogs.sections.where')}</h2>
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
              <input className="input" name="city" defaultValue={initial.city} placeholder={COUNTRY_INFO[country].defaultCity} required maxLength={60} />
            </label>
          </div>
          <LocationPicker
            key={country}
            initial={point}
            fallback={COUNTRY_INFO[country].center}
            labels={{ useMyLocation: t('onboarding.useMyLocation'), map: t('myDogs.sections.where') }}
          />
          <span className="hint">{t('onboarding.whereHint')}</span>
        </section>
      ) : (
        <>
          <input type="hidden" name="country" value={initial.country} />
          <input type="hidden" name="city" value={initial.city} />
        </>
      )}

      <section className="form-section">
        <h2>{t('myDogs.sections.private')}</h2>
        <p className="muted small">{t('myDogs.privateHint')}</p>
        <label className="field">
          <span>{t('myDogs.meetingInfo')}</span>
          <textarea className="textarea short" name="meetingInfo" defaultValue={initial.meetingInfo} maxLength={600} />
          <span className="hint">{t('myDogs.meetingInfoHint')}</span>
        </label>
        <div className="grid-2">
          <label className="field">
            <span>{t('myDogs.vetInfo')}</span>
            <input className="input" name="vetInfo" defaultValue={initial.vetInfo} maxLength={300} />
          </label>
          <label className="field">
            <span>{t('myDogs.chipNumber')}</span>
            <input className="input" name="chipNumber" defaultValue={initial.chipNumber} maxLength={30} inputMode="numeric" />
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>{t('myDogs.sections.safety')}</h2>
        <label className="check">
          <input type="checkbox" name="insuranceConfirmed" defaultChecked={initial.insuranceConfirmed} required />
          <span>{t('myDogs.insurance')}</span>
        </label>
        <label className="check">
          <input type="checkbox" name="healthConfirmed" defaultChecked={initial.healthConfirmed} required />
          <span>{t('myDogs.health')}</span>
        </label>
        <label className="check">
          <input type="checkbox" name="biteHistory" checked={bite} onChange={(e) => setBite(e.target.checked)} />
          <span>{t('myDogs.biteHistory')}</span>
        </label>
        {bite ? (
          <label className="field">
            <span>{t('myDogs.biteNote')}</span>
            <textarea className="textarea short" name="biteNote" defaultValue={initial.biteNote} maxLength={600} required minLength={5} />
            <span className="hint">{t('myDogs.biteNoteHint')}</span>
          </label>
        ) : null}
        {country === 'ES' ? (
          <label className="check">
            <input type="checkbox" name="ppp" defaultChecked={initial.ppp} />
            <span>{t('myDogs.ppp')}</span>
          </label>
        ) : null}
      </section>

      {state.error ? (
        <p className="notice danger" role="alert">
          {t.has(`myDogs.errors.${state.error}`) ? t(`myDogs.errors.${state.error}`) : t('errors.generic')}
        </p>
      ) : null}
      <div className="row form-actions">
        <SubmitButton className="button primary" pending={pending}>
          {initial.id ? t('common.save') : t('myDogs.publish')}
        </SubmitButton>
        <Link href={cancelHref} className="button ghost">
          {t('common.cancel')}
        </Link>
      </div>
    </form>
  )
}
