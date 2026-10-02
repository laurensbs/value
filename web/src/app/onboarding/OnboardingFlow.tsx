'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { startTransition, useActionState, useEffect, useRef, useState, type CSSProperties } from 'react'
import { DogFace } from '@/components/DogFace'
import { Sym, type SymName } from '@/components/discover/Sym'
import { Map } from '@/components/map'
import { PhotoUploader } from '@/components/PhotoUploader'
import { lookFor, TILES } from '@/lib/avatar'
import { COUNTRIES, COUNTRY_INFO, type Country } from '@/lib/countries'
import { playSound } from '@/lib/sounds'
import { completeOnboarding, type FormState } from '@/server/actions/profile'

export type Role = 'walker' | 'owner' | 'both' | 'shelter'
type StepKey = 'welcome' | 'role' | 'about' | 'place' | 'experience' | 'goal' | 'profile' | 'promise'
type Experience = 'none' | 'some' | 'lots'

/** Walkers get two extra questions (experience, rhythm); shelter staff skip the personal profile. */
export function stepsFor(role: Role | null): StepKey[] {
  const walks = role !== 'owner' && role !== 'shelter'
  return [
    'welcome',
    'role',
    'about',
    'place',
    ...(walks ? (['experience', 'goal'] as const) : []),
    ...(role === 'shelter' ? [] : (['profile'] as const)),
    'promise',
  ]
}

const ROLES: { key: Role; icon: SymName }[] = [
  { key: 'walker', icon: 'walker' },
  { key: 'owner', icon: 'home' },
  { key: 'both', icon: 'swap' },
  { key: 'shelter', icon: 'building' },
]

const LANGUAGES: [string, string][] = [
  ['nl', 'Nederlands'],
  ['en', 'English'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
]

interface Props {
  initial: { firstName: string; country: Country; photoUrl: string | null }
  intent: Role | null
  /** Where someone was going before signing up (a dog's page …), or null for the start that fits their role. */
  next: string | null
  /** Latest allowed birth date (18 years ago), as YYYY-MM-DD. */
  maxBirthDate: string
}

/**
 * The first minute on Rondje, one question per screen like in the iPhone app: what brings you
 * here, your name and age, roughly where you live, experience and rhythm (walkers), a photo and
 * a few words, and the promises. The server checks the same rules again (completeOnboarding).
 */
export function OnboardingFlow({ initial, intent, next, maxBirthDate }: Props) {
  const t = useTranslations('onboarding')
  const tf = useTranslations('onboarding.flow')
  const tc = useTranslations('common')
  const [state, dispatch, pending] = useActionState<FormState, FormData>(completeOnboarding, { ok: false })

  const [step, setStep] = useState(0)
  const [role, setRole] = useState<Role | null>(intent)
  const [firstName, setFirstName] = useState(initial.firstName)
  const [birthDate, setBirthDate] = useState('')
  const [country, setCountry] = useState<Country>(initial.country)
  const [city, setCity] = useState('')
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [experience, setExperience] = useState<Experience>('some')
  const [goal, setGoal] = useState<number | null>(null)
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl ?? '')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [terms, setTerms] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const form = useRef<HTMLFormElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)

  const steps = stepsFor(role)
  const key = steps[Math.min(step, steps.length - 1)]
  const walks = role !== 'owner' && role !== 'shelter'
  const info = COUNTRY_INFO[country]

  // A new screen: move keyboard and screen-reader focus to its title (not on the very first one).
  useEffect(() => {
    if (moved.current) heading.current?.focus()
    moved.current = true
  }, [step])

  // The server said no (it checks the same rules): a soft error sound.
  useEffect(() => {
    if (state.error) playSound('error')
  }, [state])

  /** The photo uploader keeps its own state; remember its value before its screen goes away. */
  function rememberPhoto() {
    const field = form.current?.elements.namedItem('photoUrl')
    if (field instanceof HTMLInputElement) setPhotoUrl(field.value)
  }

  function check(): string | null {
    if (key === 'role' && !role) return 'needRole'
    if (key === 'about') {
      if (!firstName.trim()) return 'needName'
      if (!birthDate) return 'needBirthDate'
      if (birthDate > maxBirthDate) return 'tooYoung'
    }
    if (key === 'place' && !city.trim()) return 'needCity'
    if (key === 'promise' && !terms) return 'needTerms'
    return null
  }

  function forward(skip = false) {
    const issue = skip ? null : check()
    if (issue) {
      setProblem(issue)
      playSound('error')
      return
    }
    setProblem(null)
    rememberPhoto()
    if (key === 'promise') return submit()
    playSound('tap')
    setStep((s) => Math.min(s + 1, steps.length - 1))
  }

  function back() {
    setProblem(null)
    rememberPhoto()
    setStep((s) => Math.max(0, s - 1))
  }

  function submit() {
    const data = new FormData()
    data.set('firstName', firstName.trim())
    data.set('birthDate', birthDate)
    data.set('country', country)
    data.set('city', city.trim())
    if (point) {
      data.set('lat', String(point.lat))
      data.set('lng', String(point.lng))
    }
    data.set('experience', walks ? experience : 'some')
    data.set('bio', bio)
    data.set('phone', phone)
    for (const l of languages) data.append('languages', l)
    const photo = (form.current?.elements.namedItem('photoUrl') as HTMLInputElement | null)?.value ?? photoUrl
    if (photo) data.set('photoUrl', photo)
    if (walks) data.set('wantsToWalk', 'on')
    if (role === 'owner' || role === 'both') data.set('hasDogs', 'on')
    if (walks && goal) data.set('weeklyGoal', String(goal))
    if (terms) data.set('terms', 'on')
    if (role === 'shelter') data.set('intent', 'shelter')
    // Back to where someone was going, else the first screen that fits what they came for.
    data.set('next', next ?? (role === 'shelter' ? '/shelter' : role === 'owner' ? '/my-dogs/new' : '/dogs?welcome=1'))
    startTransition(() => dispatch(data))
  }

  const serverError = state.error ? (t.has(`errors.${state.error}`) ? t(`errors.${state.error}`) : t('errors.invalid')) : null
  const message = problem ? tf(problem) : key === 'promise' ? serverError : null
  const total = steps.length - 1

  return (
    <div className="flow">
      {step > 0 ? (
        <div className="flow-progress">
          <div className="flow-bars" aria-hidden="true">
            {steps.slice(1).map((s, i) => (
              <span key={s} className={i < step ? 'on' : undefined} />
            ))}
          </div>
          <p className="flow-count">{tf('progress', { n: step, total })}</p>
        </div>
      ) : null}

      <form
        ref={form}
        className="flow-step"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          forward()
        }}
      >
        {key === 'welcome' ? (
          <div className="flow-body flow-welcome">
            <div className="flow-dogs" aria-hidden="true">
              {['buddy', 'luna', 'kees'].map((id, i) => (
                <span key={id} className="flow-dog" style={{ '--tile': TILES[(i * 3) % TILES.length] } as CSSProperties}>
                  <DogFace look={lookFor({ id: `welcome-${id}` })} size={i === 1 ? 104 : 86} />
                </span>
              ))}
            </div>
            <h1 ref={heading} tabIndex={-1}>
              {tf('welcomeTitle', { name: firstName.trim() || initial.firstName })}
            </h1>
            <p className="lede">{tf('welcomeText')}</p>
            <ul className="flow-points">
              <li>
                <Sym name="paw" size={20} />
                {tf('welcome1')}
              </li>
              <li>
                <Sym name="pin" size={20} />
                {tf('welcome2')}
              </li>
              <li>
                <Sym name="clock" size={20} />
                {tf('welcome3')}
              </li>
            </ul>
          </div>
        ) : null}

        {key === 'role' ? (
          <fieldset className="flow-body">
            <legend className="visually-hidden">{tf('roleTitle')}</legend>
            <h1 ref={heading} tabIndex={-1}>
              {tf('roleTitle')}
            </h1>
            <p className="lede">{tf('roleText')}</p>
            <div className="option-list">
              {ROLES.map((r) => {
                const name = `role${r.key[0].toUpperCase()}${r.key.slice(1)}`
                return (
                  <label key={r.key} className="option-card">
                    <input
                      type="radio"
                      name="role"
                      value={r.key}
                      checked={role === r.key}
                      onChange={() => {
                        setRole(r.key)
                        setProblem(null)
                        playSound('select')
                      }}
                      aria-labelledby={`${name}-title`}
                      aria-describedby={`${name}-text`}
                    />
                    <span className="option-icon">
                      <Sym name={r.icon} size={24} />
                    </span>
                    <span className="option-text">
                      <span id={`${name}-title`} className="option-title">
                        {tf(name)}
                      </span>
                      <span id={`${name}-text`} className="option-hint">
                        {tf(`${name}Text`)}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        ) : null}

        {key === 'about' ? (
          <div className="flow-body">
            <h1 ref={heading} tabIndex={-1}>
              {tf('aboutTitle')}
            </h1>
            <p className="lede">{tf('aboutText')}</p>
            <label className="field">
              <span>{t('firstName')}</span>
              <input className="input big" name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" maxLength={40} required />
            </label>
            <label className="field">
              <span>{t('birthDate')}</span>
              <input
                className="input big"
                type="date"
                name="birthDate"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={maxBirthDate}
                min="1920-01-01"
                autoComplete="bday"
                required
              />
              <span className="hint">{t('birthDateHint')}</span>
            </label>
          </div>
        ) : null}

        {key === 'place' ? (
          <div className="flow-body">
            <h1 ref={heading} tabIndex={-1}>
              {tf('placeTitle')}
            </h1>
            <p className="lede">{tf('placeText')}</p>
            <div className="grid-2">
              <label className="field">
                <span>{tc('country')}</span>
                <select
                  className="select"
                  name="country"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value as Country)
                    setPoint(null)
                  }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {COUNTRY_INFO[c].flag} {tc(`countries.${c}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{tc('city')}</span>
                <input className="input" name="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={info.defaultCity} autoComplete="address-level2" maxLength={60} required />
              </label>
            </div>
            <div className="field">
              <span>{t('where')}</span>
              <Map
                key={country}
                center={point ?? info.center}
                zoom={point ? 14 : 12}
                markers={point ? [{ id: 'me', ...point, label: t('where'), kind: 'pin' }] : []}
                onPick={setPoint}
                className="map small"
                ariaLabel={t('where')}
              />
              <div className="row">
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() =>
                    navigator.geolocation?.getCurrentPosition(
                      (pos) => setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                      () => undefined,
                      { enableHighAccuracy: false, timeout: 10_000 },
                    )
                  }
                >
                  <Sym name="location" size={16} />
                  {t('useMyLocation')}
                </button>
              </div>
              <span className="hint">{t('whereHint')}</span>
            </div>
          </div>
        ) : null}

        {key === 'experience' ? (
          <fieldset className="flow-body">
            <legend className="visually-hidden">{tf('experienceTitle')}</legend>
            <h1 ref={heading} tabIndex={-1}>
              {tf('experienceTitle')}
            </h1>
            <p className="lede">{tf('experienceText')}</p>
            <div className="option-list">
              {(['none', 'some', 'lots'] as const).map((level, i) => {
                const name = `experience${level[0].toUpperCase()}${level.slice(1)}`
                return (
                  <label key={level} className="option-card">
                    <input
                      type="radio"
                      name="experience"
                      value={level}
                      checked={experience === level}
                      onChange={() => {
                        setExperience(level)
                        playSound('select')
                      }}
                      aria-labelledby={`${name}-title`}
                      aria-describedby={`${name}-text`}
                    />
                    <span className="option-icon">
                      <Sym name={(['leaf', 'paw', 'sparkle'] as const)[i]} size={22} />
                    </span>
                    <span className="option-text">
                      <span id={`${name}-title`} className="option-title">
                        {t(name)}
                      </span>
                      <span id={`${name}-text`} className="option-hint">
                        {tf(`${name}Text`)}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        ) : null}

        {key === 'goal' ? (
          <fieldset className="flow-body">
            <legend className="visually-hidden">{tf('goalTitle')}</legend>
            <h1 ref={heading} tabIndex={-1}>
              {tf('goalTitle')}
            </h1>
            <p className="lede">{tf('goalText')}</p>
            <div className="option-list">
              {([1, 2, 3, null] as const).map((n) => {
                const id = `goal-${n ?? 'later'}`
                return (
                  <label key={id} className="option-card">
                    <input
                      type="radio"
                      name="weeklyGoal"
                      value={n ?? ''}
                      checked={goal === n}
                      onChange={() => {
                        setGoal(n)
                        playSound('select')
                      }}
                      aria-labelledby={`${id}-title`}
                      aria-describedby={n ? `${id}-text` : undefined}
                    />
                    <span className="option-icon">{n ?? <Sym name="calendar" size={20} />}</span>
                    <span className="option-text">
                      <span id={`${id}-title`} className="option-title">
                        {n ? tf(`goal${n}`) : tf('goalLater')}
                        {n === 2 ? <span className="pill ball">{tf('goalRecommended')}</span> : null}
                      </span>
                      {n ? (
                        <span id={`${id}-text`} className="option-hint">
                          {tf(`goal${n}Text`)}
                        </span>
                      ) : null}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        ) : null}

        {key === 'profile' ? (
          <div className="flow-body">
            <h1 ref={heading} tabIndex={-1}>
              {tf('profileTitle')}
            </h1>
            <p className="lede">{role === 'owner' ? tf('profileOwnerText') : tf('profileText')}</p>
            <div className="field">
              <span>{t('photo')}</span>
              <PhotoUploader name="photoUrl" initial={photoUrl ? [photoUrl] : []} variant="person" />
              <span className="hint">{t('photoHint')}</span>
            </div>
            <label className="field">
              <span>{t('bio')}</span>
              <textarea className="textarea" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={600} placeholder={t('bioHint')} />
            </label>
            <label className="field">
              <span>
                {t('phone')} <span className="muted">({tc('optional')})</span>
              </span>
              <input className="input" type="tel" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={30} />
              <span className="hint">{t('phoneHint')}</span>
            </label>
            <fieldset className="field">
              <legend>{t('languages')}</legend>
              <div className="choices">
                {LANGUAGES.map(([code, label]) => (
                  <label key={code} className="choice">
                    <input
                      type="checkbox"
                      name="languages"
                      value={code}
                      checked={languages.includes(code)}
                      onChange={(e) => setLanguages((prev) => (e.target.checked ? [...prev, code] : prev.filter((l) => l !== code)))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {key === 'promise' ? (
          <div className="flow-body">
            <h1 ref={heading} tabIndex={-1}>
              {tf('promiseTitle')}
            </h1>
            <p className="lede">{tf('promiseText')}</p>
            <ul className="promise-list">
              <li>
                <span className="option-icon">
                  <Sym name="users" size={22} />
                </span>
                {tf('promise1')}
              </li>
              <li>
                <span className="option-icon">
                  <Sym name="lock" size={22} />
                </span>
                {tf('promise2')}
              </li>
              <li>
                <span className="option-icon">
                  <Sym name="heart" size={22} />
                </span>
                {tf('promise3')}
              </li>
            </ul>
            <label className="check terms-check">
              <input
                type="checkbox"
                name="terms"
                checked={terms}
                onChange={(e) => {
                  setTerms(e.target.checked)
                  setProblem(null)
                }}
              />
              <span>
                {t.rich('terms', {
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
          </div>
        ) : null}

        {message ? (
          <p className="notice danger" role="alert">
            {message}
          </p>
        ) : null}

        <div className="flow-actions">
          {step > 0 ? (
            <button type="button" className="button secondary" onClick={back} disabled={pending}>
              {tf('back')}
            </button>
          ) : null}
          <button type="submit" className="button primary grow" disabled={pending} aria-busy={pending}>
            {key === 'welcome' ? tf('welcomeStart') : key === 'promise' ? tf('finish') : tf('next')}
          </button>
        </div>
        {key === 'profile' ? (
          <button type="button" className="link-button flow-skip" onClick={() => forward(true)}>
            {tf('skip')}
          </button>
        ) : null}
      </form>
    </div>
  )
}
