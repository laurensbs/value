'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { joinGroupWalk, leaveGroupWalk } from '@/server/actions/shelters'
import { Icon } from './Icon'

export function GroupWalkButton({
  id,
  joined,
  full,
  signedIn,
  needsQuiz = false,
  needsTerms = false,
  next = '/group-walks',
}: {
  id: string
  joined: boolean
  full: boolean
  signedIn: boolean
  /** Walkers do the safety quiz before they join (besluit 4 okt 2026); it brings them back here. */
  needsQuiz?: boolean
  /** Changed terms that took effect wait for a yes first (lib/rules.ts termsReason); it brings them back here. */
  needsTerms?: boolean
  next?: string
}) {
  const t = useTranslations()
  const [pending, start] = useTransition()
  const [isJoined, setJoined] = useState(joined)
  const [error, setError] = useState<string | null>(null)

  if (!signedIn) {
    return (
      <a className="button secondary small" href={`/login?next=${encodeURIComponent(next)}`}>
        {t('groupWalks.join')}
      </a>
    )
  }
  const quiz = (
    <a className="button secondary small" href={`/profile/quiz?next=${encodeURIComponent(next)}`}>
      {t('request.quizFirst')}
    </a>
  )
  const terms = (
    <a className="button secondary small" href={`/profile/terms?next=${encodeURIComponent(next)}`}>
      {t('termsUpdate.first')}
    </a>
  )
  if (needsTerms && !isJoined) return terms
  if (needsQuiz && !isJoined) return quiz
  return (
    <div className="stack-s">
      <button
        type="button"
        className={`button small ${isJoined ? 'ghost' : 'primary'}`}
        disabled={pending || (!isJoined && full)}
        onClick={() =>
          start(async () => {
            const result = isJoined ? await leaveGroupWalk(id) : await joinGroupWalk(id)
            if (result.ok) {
              setJoined(!isJoined)
              setError(null)
            } else setError(result.error ?? 'invalid')
          })
        }
      >
        {isJoined ? t('groupWalks.leave') : t('groupWalks.join')}
      </button>
      {isJoined ? <span className="pill green">{t('groupWalks.joined')}</span> : null}
      {isJoined ? (
        <a href={`/group-walks/${id}/calendar.ics`} className="link-button small">
          <Icon name="calendar" size={14} /> {t('requests.calendar')}
        </a>
      ) : null}
      {error ? <span className="error-text">{t(`request.reasons.${error}`)}</span> : null}
      {error === 'needs-quiz' ? quiz : error === 'needs-terms' ? terms : null}
    </div>
  )
}
