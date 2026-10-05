'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { MASCOT } from '@/lib/avatar'
import { COUNTRIES, COUNTRY_INFO, type Country } from '@/lib/countries'
import { hasTrait, MAX_TRAITS, PROVIDES, STORY_BLOCKS, storyBlocksLeft, toggleTrait, TRAIT_CHIPS, traitList, WALK_MINUTES, type StoryBlock } from '@/lib/dog-options'
import { addSentence } from '@/lib/sentences'
import { useForm } from '@/lib/use-form'
import { saveDog } from '@/server/actions/dogs'
import type { FormState } from '@/server/actions/profile'
import { DogFace } from './DogFace'
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

type Section = 'basics' | 'character' | 'story' | 'walk' | 'where' | 'private' | 'safety'

const STORY_MAX = 1500

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

interface Props {
  initial: DogInitial
  orgId?: string
  cancelHref: string
  /** A new dog, one question at a time with Rondje's dog asking: the same form, in steps. */
  stepped?: boolean
  /** The first question, for someone who comes straight from signing up. */
  welcome?: string
}

export function DogForm({ initial, orgId, cancelHref, stepped = false, welcome }: Props) {
  const t = useTranslations()
  const { state, pending, onSubmit } = useForm<FormState>(saveDog, { ok: false })
  const [country, setCountry] = useState<Country>(initial.country)
  const [slots, setSlots] = useState(initial.slots)
  const [bite, setBite] = useState(initial.biteHistory)
  const [name, setName] = useState(initial.name)
  const [minutes, setMinutes] = useState(String(initial.walkMinutes))
  const [traits, setTraits] = useState(initial.traits.join(', '))
  const [story, setStory] = useState(initial.story)
  const [forSomeone, setForSomeone] = useState(false)
  const isShelter = Boolean(orgId)
  // Adding a dog for someone else (a neighbour, a grandparent) asks whether they know (DPIA maatregel M5).
  const askForSomeone = !isShelter && !initial.id
  const point = initial.lat != null && initial.lng != null && country === initial.country ? { lat: initial.lat, lng: initial.lng } : null

  // Steps: only used when `stepped`. The full form shows the story with the character.
  const sections: Section[] = ['basics', 'character', 'story', 'walk', ...(isShelter ? [] : ['where' as const]), 'private', 'safety']
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [problem, setProblem] = useState<string | null>(null)
  // The map is created the first time its step is on screen (Leaflet needs a visible box).
  const [whereSeen, setWhereSeen] = useState(!stepped)
  const heading = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)
  const step = sections[Math.min(index, sections.length - 1)]
  const last = index >= sections.length - 1
  const dogName = name.trim() || t('myDogs.steps.yourDog')

  useEffect(() => {
    if (!moved.current) return
    window.scrollTo({ top: 0 })
    heading.current?.focus({ preventScroll: true })
  }, [step])

  const traitCount = traitList(traits).length
  const sentences = Object.fromEntries(STORY_BLOCKS.map((key) => [key, t(`myDogs.storyBlocks.${key}`, { name: name.trim() })])) as Record<StoryBlock, string>
  const blocks = name.trim() ? storyBlocksLeft(story, sentences) : []

  function addToStory(sentence: string) {
    setStory((text) => {
      const next = addSentence(text, sentence)
      return next.length > STORY_MAX ? text : next
    })
  }

  function check(key: Section, data: FormData): string | null {
    switch (key) {
      case 'basics':
        return String(data.get('name') ?? '').trim() ? null : 'needName'
      case 'walk': {
        const n = Number(data.get('walkMinutes'))
        return Number.isInteger(n) && n >= 10 && n <= 180 ? null : 'needMinutes'
      }
      case 'where':
        return String(data.get('city') ?? '').trim() ? null : 'needCity'
      case 'private':
        return data.get('forSomeone') === 'on' && data.get('ownerConsent') !== 'on' ? 'owner-consent' : null
      case 'safety':
        if (data.get('insuranceConfirmed') !== 'on' || data.get('healthConfirmed') !== 'on') return 'confirmations'
        return data.get('biteHistory') === 'on' && String(data.get('biteNote') ?? '').trim().length < 5 ? 'bite-note' : null
      default:
        return null
    }
  }

  function go(to: number) {
    const next = Math.max(0, Math.min(to, sections.length - 1))
    moved.current = true
    setDirection(next < index ? 'back' : 'forward')
    setProblem(null)
    if (sections[next] === 'where') setWhereSeen(true)
    setIndex(next)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    if (!stepped) return onSubmit(event)
    const data = new FormData(event.currentTarget)
    if (!last) {
      event.preventDefault()
      const issue = check(step, data)
      if (issue) setProblem(issue)
      else go(index + 1)
      return
    }
    // Last step: check every step once more, and go back to the first one that needs an answer.
    for (let i = 0; i < sections.length; i++) {
      const issue = check(sections[i], data)
      if (issue) {
        event.preventDefault()
        if (i !== index) go(i)
        setProblem(issue)
        return
      }
    }
    onSubmit(event)
  }

  const questions: Record<Section, { title: string; text: string }> = {
    basics: { title: welcome ?? t('myDogs.steps.basicsTitle'), text: t('myDogs.steps.basicsText') },
    character: { title: t('myDogs.steps.characterTitle', { name: dogName }), text: t('myDogs.steps.characterText') },
    story: { title: t('myDogs.steps.storyTitle', { name: dogName }), text: t('myDogs.steps.storyText', { name: dogName }) },
    walk: { title: t('myDogs.steps.walkTitle', { name: dogName }), text: t('myDogs.steps.walkText') },
    where: { title: t('myDogs.steps.whereTitle', { name: dogName }), text: t('myDogs.steps.whereText') },
    private: { title: t('myDogs.steps.privateTitle'), text: t('myDogs.privateHint') },
    safety: { title: t('myDogs.steps.safetyTitle'), text: t('myDogs.steps.safetyText', { name: dogName }) },
  }

  const section = (key: Section, children: React.ReactNode) =>
    stepped ? (
      <section key={key} className="onboarding-step" data-direction={direction} hidden={key !== step}>
        <div className="mascot">
          <DogFace look={MASCOT} size={64} />
          <div className="bubble stack-s">
            <h1 ref={key === step ? heading : undefined} tabIndex={-1}>
              {questions[key].title}
            </h1>
            <p className="muted">{questions[key].text}</p>
          </div>
        </div>
        <div className="card stack">{children}</div>
      </section>
    ) : (
      <section key={key} className="form-section">
        <h2>{t(`myDogs.sections.${key}`)}</h2>
        {key === 'private' ? <p className="muted small">{t('myDogs.privateHint')}</p> : null}
        {children}
      </section>
    )

  const storyFields = (
    <>
      <div className="field">
        <label htmlFor="dog-story">{t('myDogs.story')}</label>
        <textarea
          id="dog-story"
          className="textarea"
          name="story"
          value={story}
          onChange={(e) => setStory(e.target.value)}
          maxLength={STORY_MAX}
          placeholder={t('myDogs.storyHint')}
          aria-describedby={isShelter ? undefined : 'dog-story-public'}
        />
        {/* A private owner's story is public, also without an account: about the dog, never when
            someone is home (DPIA maatregel M18). A shelter's own address and hours are public anyway. */}
        {isShelter ? null : (
          <p id="dog-story-public" className="hint">
            {t('myDogs.storyPublic')}
          </p>
        )}
        {/* Below the box, so each tapped sentence shows up right above the next ones. */}
        {blocks.length ? (
          <div className="chip-row sentences" role="group" aria-label={t('request.blocksLabel')}>
            {blocks.map((key) => (
              <button key={key} type="button" className="chip" onClick={() => addToStory(sentences[key])}>
                <Icon name="plus" size={14} /> {sentences[key]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="dog-needs">
          {t('myDogs.needs')} <span className="muted">({t('common.optional')})</span>
        </label>
        <textarea
          id="dog-needs"
          className="textarea short"
          name="needs"
          defaultValue={initial.needs}
          maxLength={600}
          aria-describedby={isShelter ? undefined : 'dog-needs-public'}
        />
        {/* Shown next to the story on the dog's page, to anyone: the same care, said shorter. */}
        {isShelter ? null : (
          <p id="dog-needs-public" className="hint">
            {t('myDogs.needsPublic')}
          </p>
        )}
      </div>
    </>
  )

  const problemText = problem ? (t.has(`myDogs.steps.${problem}`) ? t(`myDogs.steps.${problem}`) : t(`myDogs.errors.${problem}`)) : null
  const errorText = state.error ? (t.has(`myDogs.errors.${state.error}`) ? t(`myDogs.errors.${state.error}`) : t('errors.generic')) : null
  const total = sections.length

  return (
    <form
      onSubmit={submit}
      // What needed an answer was changed: the message can go.
      onChange={problem ? () => setProblem(null) : undefined}
      className={stepped ? 'onboarding dog-steps' : 'form dog-form'}
      noValidate={stepped}
    >
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {orgId ? <input type="hidden" name="orgId" value={orgId} /> : null}
      <input type="hidden" name="slots" value={JSON.stringify(slots)} />

      {stepped ? (
        <div className="onboarding-top">
          {index === 0 ? (
            <Link href={cancelHref} className="icon-button" aria-label={t('common.cancel')}>
              <Icon name="close" size={20} />
            </Link>
          ) : (
            <button type="button" className="icon-button" onClick={() => go(index - 1)} aria-label={t('onboarding.flow.back')}>
              <Icon name="back" size={20} />
            </button>
          )}
          <div
            className="onboarding-bar"
            role="progressbar"
            aria-label={t('onboarding.flow.progressLabel')}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={index + 1}
            aria-valuetext={t('onboarding.flow.progress', { n: index + 1, total })}
          >
            <span style={{ transform: `scaleX(${(index + 1) / total})` }} />
          </div>
          <span className="muted small" aria-hidden="true">
            {index + 1}/{total}
          </span>
        </div>
      ) : null}

      {section(
        'basics',
        <>
          <div className="field">
            <span>{t('myDogs.photos')}</span>
            <PhotoUploader name="photos" initial={initial.photos} max={6} variant="dog" />
            <span className="hint">{t('myDogs.photosHint')}</span>
          </div>
          <div className="grid-2">
            <label className="field">
              <span>{t('myDogs.name')}</span>
              <input className="input" name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
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
        </>,
      )}

      {section(
        'character',
        <>
          <Choices name="energy" values={['calm', 'medium', 'high'] as const} value={initial.energy} label={t('dog.energyLabel')} render={(v) => t(`dogs.energy.${v}`)} />
          <Choices name="level" values={['starter', 'experienced'] as const} value={initial.level} label={t('dog.levelLabel')} render={(v) => t(`dogs.level.${v}`)} />
          <div className="field">
            <label htmlFor="dog-traits">{t('myDogs.traits')}</label>
            <div className="chip-row" role="group" aria-label={t('myDogs.steps.traitsLabel')}>
              {TRAIT_CHIPS.map((key) => {
                const trait = t(`myDogs.traitChips.${key}`)
                const on = hasTrait(traits, trait)
                return (
                  <button
                    key={key}
                    type="button"
                    className={`chip${on ? ' on' : ''}`}
                    aria-pressed={on}
                    disabled={!on && traitCount >= MAX_TRAITS}
                    onClick={() => setTraits((value) => toggleTrait(value, trait))}
                  >
                    <Icon name={on ? 'check' : 'plus'} size={14} /> {trait}
                  </button>
                )
              })}
            </div>
            <input id="dog-traits" className="input" name="traits" value={traits} onChange={(e) => setTraits(e.target.value)} maxLength={400} />
            <span className="hint">{t('myDogs.traitsHint')}</span>
          </div>
          {stepped ? null : storyFields}
        </>,
      )}

      {stepped ? section('story', storyFields) : null}

      {section(
        'walk',
        <>
          <div className="field">
            <label htmlFor="dog-minutes">{t('myDogs.walkMinutes')}</label>
            <div className="chip-row" role="group" aria-label={t('myDogs.steps.minutesLabel')}>
              {WALK_MINUTES.map((n) => {
                const on = Number(minutes) === n
                return (
                  <button key={n} type="button" className={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setMinutes(String(n))}>
                    {t('common.minutes', { n })}
                  </button>
                )
              })}
            </div>
            <input
              id="dog-minutes"
              className="input narrow"
              type="number"
              name="walkMinutes"
              min={10}
              max={180}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              required
            />
          </div>
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
        </>,
      )}

      {!isShelter ? (
        section(
          'where',
          <>
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
            {whereSeen ? (
              <LocationPicker
                key={country}
                initial={point}
                fallback={COUNTRY_INFO[country].center}
                labels={{ useMyLocation: t('onboarding.useMyLocation'), map: t('myDogs.sections.where') }}
              />
            ) : null}
            <span className="hint">{t('onboarding.whereHint')}</span>
          </>,
        )
      ) : (
        <>
          <input type="hidden" name="country" value={initial.country} />
          <input type="hidden" name="city" value={initial.city} />
        </>
      )}

      {section(
        'private',
        <>
          {askForSomeone ? (
            <div className="stack-s">
              <label className="check">
                <input type="checkbox" name="forSomeone" checked={forSomeone} onChange={(e) => setForSomeone(e.target.checked)} />
                <span>{t('myDogs.forSomeone')}</span>
              </label>
              {forSomeone ? (
                <>
                  <label className="check">
                    <input type="checkbox" name="ownerConsent" required />
                    <span>{t('myDogs.ownerConsent')}</span>
                  </label>
                  <p className="hint">{t('myDogs.forSomeoneHint')}</p>
                </>
              ) : null}
            </div>
          ) : null}
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
        </>,
      )}

      {section(
        'safety',
        <>
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
        </>,
      )}

      {stepped ? (
        <div className="onboarding-actions">
          {problemText || errorText ? (
            <p className="notice danger" role="alert">
              {problemText ?? errorText}
            </p>
          ) : null}
          {last ? (
            <SubmitButton className="button primary wide big" pending={pending}>
              {t('myDogs.steps.publish', { name: dogName })}
            </SubmitButton>
          ) : (
            <button type="submit" className="button primary wide big">
              {t('onboarding.flow.next')}
              <Icon name="arrow" size={18} />
            </button>
          )}
        </div>
      ) : (
        <>
          {errorText ? (
            <p className="notice danger" role="alert">
              {errorText}
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
        </>
      )}
    </form>
  )
}
