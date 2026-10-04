'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { joinGroupWalk, leaveGroupWalk } from '@/server/actions/shelters'
import { Icon } from './Icon'

export function GroupWalkButton({ id, joined, full, signedIn, next = '/group-walks' }: { id: string; joined: boolean; full: boolean; signedIn: boolean; next?: string }) {
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
    </div>
  )
}
