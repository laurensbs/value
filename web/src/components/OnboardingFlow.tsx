'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { MASCOT, WELCOME_DOGS } from '@/lib/avatar'
import type { BioFacts } from '@/lib/bio'
import { COUNTRIES, COUNTRY_INFO, type Country } from '@/lib/countries'
import { useForm } from '@/lib/use-form'
import { completeOnboarding, type FormState } from '@/server/actions/profile'
import { BioField } from './BioField'
import { DogFace } from './DogFace'
import { Icon, type IconName } from './Icon'
import { LocationPicker } from './LocationPicker'
import { PhotoUploader } from './PhotoUploader'
import { LANGUAGES } from './ProfileForm'
import { SubmitButton } from './SubmitButton'

export type OnboardingRole = 'walker' | 'owner' | 'both' | 'shelter'
type StepKey = 'welcome' | 'role' | 'about' | 'place' | 'experience' | 'goal' | 'profile' | 'promise'

// One question at a time. Walkers get two extra questions (experience and a weekly goal);
// everything ends up in one form that is sent at the end.
const WALKER_STEPS: StepKey[] = ['welcome', 'role', 'about', 'place', 'experience', 'goal', 'profile', 'promise']
const OTHER_STEPS: StepKey[] = ['welcome', 'role', 'about', 'place', 'profile', 'promise']

const ROLES: { key: OnboardingRole; icon: IconName; title: string; text: string }[] = [
  { key: 'walker', icon: 'route', title: 'roleWalker', text: 'roleWalkerText' },
  { key: 'owner', icon: 'home', title: 'roleOwner', text: 'roleOwnerText' },
  { key: 'both', icon: 'heart', title: 'roleBoth', text: 'roleBothText' },
  { key: 'shelter', icon: 'building', title: 'roleShelter', text: 'roleShelterText' },
]

const EXPERIENCE: { key: 'none' | 'some' | 'lots'; icon: IconName; title: string; text: string }[] = [
  { key: 'none', icon: 'leaf', title: 'experienceNone', text: 'flow.experienceNoneText' },
  { key: 'some', icon: 'paw', title: 'experienceSome', text: 'flow.experienceSomeText' },
  { key: 'lots', icon: 'heart', title: 'experienceLots', text: 'flow.experienceLotsText' },
]

const GOALS = ['1', '2', '3'] as const

const walksDogs = (role: OnboardingRole | null) => role !== 'owner' && role !== 'shelter'

interface Props {
  firstName: string
  photoUrl: string | null
  country: Country
  /** Latest allowed birth date (18 years ago), as YYYY-MM-DD. */
  maxBirthDate: string
  /** Chosen on the page someone came from ("I have a dog"), still to confirm. */
  role: OnboardingRole | null
  /** Where someone was going before signing up; otherwise the first screen fits their role. */
  next?: string
}

export function OnboardingFlow({ firstName, photoUrl, country: initialCountry, maxBirthDate, role: initialRole, next }: Props) {
  const t = useTranslations('onboarding')
  const tc = useTranslations('common')
  const terr = useTranslations('errors')
  const { state, pending, onSubmit } = useForm<FormState>(completeOnboarding, { ok: false })
  const [role, setRole] = useState<OnboardingRole | null>(initialRole)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [problem, setProblem] = useState<string | null>(null)
  const [country, setCountry] = useState<Country>(initialCountry)
  // The map is created the first time its step is on screen (Leaflet needs a visible box).
  const [placeSeen, setPlaceSeen] = useState(false)
  // What the ready sentences about someone are made of, read from the answers so far.
  const [facts, setFacts] = useState<BioFacts>({ name: firstName, city: '', walker: walksDogs(initialRole), owner: false, experience: null })
  const form = useRef<HTMLFormElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)

  const steps = walksDogs(role) ? WALKER_STEPS : OTHER_STEPS
  const step = steps[Math.min(index, steps.length - 1)]
  // The welcome screen does not count as a question.
  const number = steps.indexOf(step)
  const total = steps.length - 1

  useEffect(() => {
    if (step === 'place') setPlaceSeen(true)
    if (!moved.current) return
    window.scrollTo({ top: 0 })
    heading.current?.focus({ preventScroll: true })
  }, [step])

  function check(key: StepKey, data: FormData): string | null {
    switch (key) {
      case 'role':
        return role ? null : 'needRole'
      case 'about': {
        if (!String(data.get('firstName') ?? '').trim()) return 'needName'
        const birth = String(data.get('birthDate') ?? '')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return 'needBirthDate'
        return birth > maxBirthDate ? 'tooYoung' : null
      }
      case 'place':
        return String(data.get('city') ?? '').trim() ? null : 'needCity'
      case 'experience':
        return data.get('experience') ? null : 'needExperience'
      case 'promise':
        return data.get('terms') === 'on' ? null : 'needTerms'
      default:
        return null
    }
  }

  function go(to: number) {
    moved.current = true
    setDirection(to < index ? 'back' : 'forward')
    setProblem(null)
    const target = Math.max(0, Math.min(to, steps.length - 1))
    if (steps[target] === 'profile' && form.current) {
      const data = new FormData(form.current)
      const experience = data.get('experience')
      setFacts({
        name: String(data.get('firstName') ?? ''),
        city: String(data.get('city') ?? ''),
        walker: walksDogs(role),
        owner: role === 'owner' || role === 'both',
        experience: experience === 'none' || experience === 'some' || experience === 'lots' ? experience : null,
      })
    }
    setIndex(target)
  }

  function onNext(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget)
    if (step !== 'promise') {
      event.preventDefault()
      const issue = check(step, data)
      if (issue) setProblem(issue)
      else go(index + 1)
      return
    }
    // Last step: check every question once more, and go back to the first one that needs an answer.
    for (let i = 0; i < steps.length; i++) {
      const issue = check(steps[i], data)
      if (issue) {
        event.preventDefault()
        if (i !== index) go(i)
        setProblem(issue)
        return
      }
    }
    onSubmit(event)
  }

  const errorText = problem
    ? t(`flow.${problem}`)
    : state.error
      ? t.has(`errors.${state.error}`)
        ? t(`errors.${state.error}`)
        : terr('generic')
      : null

  const info = COUNTRY_INFO[country]
  const owner = role === 'owner' || role === 'shelter'

  const header = (key: StepKey, title: React.ReactNode, text?: React.ReactNode) => (
    <div className="mascot">
      <DogFace look={MASCOT} size={64} />
      <div className="bubble stack-s">
        <h1 ref={key === step ? heading : undefined} tabIndex={-1}>
          {title}
        </h1>
        {text ? <p className="muted">{text}</p> : null}
      </div>
    </div>
  )

  const section = (key: StepKey, children: React.ReactNode) => (
    <section key={key} className="onboarding-step" data-direction={direction} hidden={key !== step} aria-labelledby={undefined}>
      {children}
    </section>
  )

  return (
    <form ref={form} onSubmit={onNext} className="onboarding" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {role === 'walker' || role === 'both' ? <input type="hidden" name="wantsToWalk" value="on" /> : null}
      {role === 'owner' || role === 'both' ? <input type="hidden" name="hasDogs" value="on" /> : null}
      {role === 'shelter' ? <input type="hidden" name="intent" value="shelter" /> : null}

      {step !== 'welcome' ? (
        <div className="onboarding-top">
          <button type="button" className="icon-button" onClick={() => go(index - 1)} aria-label={t('flow.back')}>
            <Icon name="back" size={20} />
          </button>
          <div
            className="onboarding-bar"
            role="progressbar"
            aria-label={t('flow.progressLabel')}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={number}
            aria-valuetext={t('flow.progress', { n: number, total })}
          >
            <span style={{ transform: `scaleX(${number / total})` }} />
          </div>
          <span className="muted small" aria-hidden="true">
            {number}/{total}
          </span>
        </div>
      ) : null}

      {section(
        'welcome',
        <div className="onboarding-welcome stack">
          <div className="welcome-dogs" aria-hidden="true">
            {WELCOME_DOGS.map((d, i) => (
              <div key={i} style={{ '--tile': d.tile } as React.CSSProperties}>
                <DogFace look={d.look} size={76} />
              </div>
            ))}
          </div>
          <h1 ref={step === 'welcome' ? heading : undefined} tabIndex={-1}>
            {firstName ? t('flow.welcomeTitle', { name: firstName }) : t('flow.welcomeTitleAnon')}
          </h1>
          <p className="lede">{t('flow.welcomeText')}</p>
          <ul className="ticks">
            <li>{t('flow.welcome1')}</li>
            <li>{t('flow.welcome2')}</li>
            <li>{t('flow.welcome3')}</li>
          </ul>
        </div>,
      )}

      {section(
        'role',
        <>
          {header('role', t('flow.roleTitle'), t('flow.roleText'))}
          <fieldset className="option-cards">
            <legend className="visually-hidden">{t('flow.roleTitle')}</legend>
            {ROLES.map((r) => (
              <label key={r.key} className="option-card">
                <input type="radio" name="role" value={r.key} checked={role === r.key} onChange={() => setRole(r.key)} />
                <span className="option-icon" aria-hidden="true">
                  <Icon name={r.icon} />
                </span>
                <span>
                  <strong>{t(`flow.${r.title}`)}</strong>
                  <span className="muted">{t(`flow.${r.text}`)}</span>
                </span>
                <span className="option-radio" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
              </label>
            ))}
          </fieldset>
        </>,
      )}

      {section(
        'about',
        <>
          {header('about', t('flow.aboutTitle'), t('flow.aboutText'))}
          <div className="card stack">
            <label className="field">
              <span>{t('firstName')}</span>
              <input className="input" name="firstName" defaultValue={firstName} autoComplete="given-name" maxLength={40} />
            </label>
            <label className="field">
              <span>{t('birthDate')}</span>
              <input className="input" type="date" name="birthDate" max={maxBirthDate} min="1920-01-01" autoComplete="bday" />
              <span className="hint">{t('birthDateHint')}</span>
            </label>
          </div>
        </>,
      )}

      {section(
        'place',
        <>
          {header('place', t('flow.placeTitle'), t('flow.placeText'))}
          <div className="card stack">
            <div className="grid-2">
              <label className="field">
                <span>{tc('country')}</span>
                <select className="select" name="country" value={country} onChange={(e) => setCountry(e.target.value as Country)}>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {COUNTRY_INFO[c].flag} {tc(`countries.${c}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{tc('city')}</span>
                <input className="input" name="city" placeholder={info.defaultCity} autoComplete="address-level2" maxLength={60} />
              </label>
            </div>
            {placeSeen ? (
              <div className="field">
                <span>{t('where')}</span>
                <LocationPicker key={country} fallback={info.center} labels={{ useMyLocation: t('useMyLocation'), map: t('where') }} />
                <span className="hint">{t('whereHint')}</span>
              </div>
            ) : null}
          </div>
        </>,
      )}

      {section(
        'experience',
        <>
          {header('experience', t('flow.experienceTitle'), t('flow.experienceText'))}
          <fieldset className="option-cards">
            <legend className="visually-hidden">{t('flow.experienceTitle')}</legend>
            {EXPERIENCE.map((e) => (
              <label key={e.key} className="option-card">
                <input type="radio" name="experience" value={e.key} />
                <span className="option-icon" aria-hidden="true">
                  <Icon name={e.icon} />
                </span>
                <span>
                  <strong>{t(e.title)}</strong>
                  <span className="muted">{t(e.text)}</span>
                </span>
                <span className="option-radio" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
              </label>
            ))}
          </fieldset>
        </>,
      )}

      {section(
        'goal',
        <>
          {header('goal', t('flow.goalTitle'), t('flow.goalText'))}
          <fieldset className="option-cards">
            <legend className="visually-hidden">{t('flow.goalTitle')}</legend>
            {GOALS.map((g) => (
              <label key={g} className="option-card">
                <input type="radio" name="weeklyGoal" value={g} defaultChecked={g === '1'} />
                <span className="option-icon option-number" aria-hidden="true">
                  {g}×
                </span>
                <span>
                  <strong>
                    {t(`flow.goal${g}`)} {g === '1' ? <span className="pill ball">{t('flow.goalRecommended')}</span> : null}
                  </strong>
                  <span className="muted">{t(`flow.goal${g}Text`)}</span>
                </span>
                <span className="option-radio" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
              </label>
            ))}
            <label className="option-card">
              <input type="radio" name="weeklyGoal" value="" />
              <span className="option-icon" aria-hidden="true">
                <Icon name="calendar" />
              </span>
              <span>
                <strong>{t('flow.goalLater')}</strong>
              </span>
              <span className="option-radio" aria-hidden="true">
                <Icon name="check" size={14} />
              </span>
            </label>
          </fieldset>
        </>,
      )}

      {section(
        'profile',
        <>
          {header('profile', t('flow.profileTitle'), owner ? t('flow.profileOwnerText') : t('flow.profileText'))}
          <div className="card stack">
            <div className="field">
              <span>{t('photo')}</span>
              <PhotoUploader name="photoUrl" initial={photoUrl ? [photoUrl] : []} variant="person" />
              <span className="hint">{t('photoHint')}</span>
            </div>
            <BioField initial="" facts={facts} />
            <fieldset className="field">
              <legend>{t('languages')}</legend>
              <div className="choices">
                {LANGUAGES.map(([code, label]) => (
                  <label key={code} className="choice">
                    <input type="checkbox" name="languages" value={code} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="field">
              <span>
                {t('phone')} <span className="muted">({tc('optional')})</span>
              </span>
              <input className="input" type="tel" name="phone" autoComplete="tel" maxLength={30} />
              <span className="hint">{t('phoneHint')}</span>
            </label>
          </div>
        </>,
      )}

      {section(
        'promise',
        <>
          {header('promise', t('flow.promiseTitle'), t('flow.promiseText'))}
          <ul className="promises">
            <li>
              <span className="option-icon" aria-hidden="true">
                <Icon name="users" />
              </span>
              <span>{owner ? t('flow.promise1Owner') : t('flow.promise1')}</span>
            </li>
            <li>
              <span className="option-icon" aria-hidden="true">
                <Icon name="lock" />
              </span>
              <span>{t('flow.promise2')}</span>
            </li>
            <li>
              <span className="option-icon" aria-hidden="true">
                <Icon name="heart" />
              </span>
              <span>{t('flow.promise3')}</span>
            </li>
          </ul>
          <label className="check card">
            <input type="checkbox" name="terms" />
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
        </>,
      )}

      <div className="onboarding-actions">
        {errorText ? (
          <p className="notice danger" role="alert">
            {errorText}
          </p>
        ) : null}
        {step === 'promise' ? (
          <SubmitButton className="button primary wide big" pending={pending}>
            {/* Says where the button leads: the dogs, your own dog, the shelter, or back to where you were. */}
            {t(next ? 'flow.finishNext' : role === 'owner' ? 'flow.finishOwner' : role === 'shelter' ? 'flow.finishShelter' : 'flow.finish')}
          </SubmitButton>
        ) : (
          <button type="submit" className="button primary wide big">
            {step === 'welcome' ? t('flow.welcomeStart') : t('flow.next')}
            <Icon name="arrow" size={18} />
          </button>
        )}
        {step === 'profile' ? (
          <button type="button" className="link-button" onClick={() => go(index + 1)}>
            {t('flow.skip')}
          </button>
        ) : null}
      </div>
    </form>
  )
}
