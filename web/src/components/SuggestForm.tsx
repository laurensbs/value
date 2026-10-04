'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { COUNTRIES, COUNTRY_INFO, type Country } from '@/lib/countries'
import { MAX_TIPS_PER_DAY } from '@/lib/tips'
import { useForm } from '@/lib/use-form'
import { suggestShelter, voteForShelter, type TipState } from '@/server/actions/tips'
import { Icon } from './Icon'
import { SubmitButton } from './SubmitButton'

export interface TipPrefill {
  name?: string
  country?: Country
  city?: string
  website?: string
}

/** Tip a shelter that should be on Rondje. Only details about the organisation are stored. */
export function SuggestForm({ prefill, defaultCountry }: { prefill: TipPrefill; defaultCountry: Country }) {
  const t = useTranslations('suggest')
  const tc = useTranslations('common')
  const { state, pending, onSubmit } = useForm<TipState>(suggestShelter, { ok: false })
  return (
    <form onSubmit={onSubmit} className="form card">
      <label className="field">
        <span>{t('name')}</span>
        <input className="input" name="name" defaultValue={prefill.name} required minLength={2} maxLength={120} />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>{tc('country')}</span>
          <select className="select" name="country" defaultValue={prefill.country ?? defaultCountry}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {COUNTRY_INFO[c].flag} {tc(`countries.${c}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{tc('city')}</span>
          <input className="input" name="city" defaultValue={prefill.city} required maxLength={60} />
        </label>
      </div>
      <label className="field">
        <span>
          {t('website')} <span className="muted">({tc('optional')})</span>
        </span>
        <input className="input" name="website" defaultValue={prefill.website} maxLength={200} inputMode="url" placeholder="www.opvang.nl" />
      </label>
      <label className="field">
        <span>
          {t('note')} <span className="muted">({tc('optional')})</span>
        </span>
        <textarea className="textarea short" name="note" maxLength={600} placeholder={t('notePlaceholder')} />
        <span className="hint">{t('noteHint')}</span>
      </label>
      {state.ok && state.message ? (
        <p className="notice success" role="status">
          {t(`done.${state.message}`, { name: state.name ?? '' })}
        </p>
      ) : null}
      {!state.ok && state.error === 'exists' ? (
        <p className="notice" role="status">
          <span>
            {t('errors.exists', { name: state.name ?? '' })} <Link href={`/dogs?org=${state.orgId}`}>{t('seeShelter')}</Link>
          </span>
        </p>
      ) : !state.ok && state.error ? (
        <p className="notice danger" role="alert">
          {t.has(`errors.${state.error}`) ? t(`errors.${state.error}`, { max: MAX_TIPS_PER_DAY }) : t('errors.invalid', { max: MAX_TIPS_PER_DAY })}
        </p>
      ) : null}
      <SubmitButton className="button primary" pending={pending}>
        <Icon name="heart" size={16} /> {t('submit')}
      </SubmitButton>
    </form>
  )
}

/** "I want to walk here" on a directory shelter, with the number of people who said so. */
export function VoteButton({ directoryId, votes, voted, loginHref }: { directoryId: string; votes: number; voted: boolean; loginHref: string | null }) {
  const t = useTranslations('directory')
  const [pending, start] = useTransition()
  const [state, setState] = useState({ voted, votes })
  const label = `${state.voted ? t('voted') : t('vote')}${state.votes ? ` · ${state.votes}` : ''}`
  if (loginHref) {
    return (
      <Link href={loginHref} className="button ghost small">
        <Icon name="heart" size={15} /> {label}
      </Link>
    )
  }
  return (
    <button
      type="button"
      className={`button small ${state.voted ? 'secondary' : 'ghost'}`}
      disabled={pending || state.voted}
      aria-pressed={state.voted}
      onClick={() =>
        start(async () => {
          const res = await voteForShelter(directoryId)
          if (res.ok) setState((s) => ({ voted: true, votes: s.voted ? s.votes : s.votes + 1 }))
        })
      }
    >
      <Icon name="heart" size={15} /> {label}
    </button>
  )
}
