'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { setDogStatus } from '@/server/actions/dogs'

interface Props {
  dogId: string
  status: string
  editHref?: string
  viewHref?: string
  /** Shelters can mark a dog as adopted, which takes it off the list for good. */
  allowAdopted?: boolean
}

export function DogOwnerActions({ dogId, status, editHref, viewHref, allowAdopted = false }: Props) {
  const t = useTranslations('dog')
  const [pending, start] = useTransition()
  return (
    <div className="row">
      {editHref ? (
        <Link href={editHref} className="button secondary small">
          {t('edit')}
        </Link>
      ) : null}
      {viewHref ? (
        <Link href={viewHref} className="button secondary small">
          {t('view')}
        </Link>
      ) : null}
      {status !== 'adopted' ? (
        <button
          type="button"
          className="button ghost small"
          disabled={pending}
          onClick={() => start(() => setDogStatus(dogId, status === 'active' ? 'paused' : 'active'))}
        >
          {status === 'active' ? t('pause') : t('activate')}
        </button>
      ) : (
        <span className="pill blue">{t('adopted')}</span>
      )}
      {allowAdopted && status !== 'adopted' ? (
        <button type="button" className="button ghost small" disabled={pending} onClick={() => start(() => setDogStatus(dogId, 'adopted'))}>
          {t('markAdopted')}
        </button>
      ) : null}
    </div>
  )
}
