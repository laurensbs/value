'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { setDogStatus } from '@/server/actions/dogs'

export function DogOwnerActions({ dogId, status, editHref }: { dogId: string; status: string; editHref: string }) {
  const t = useTranslations('dog')
  const [pending, start] = useTransition()
  return (
    <div className="row">
      <Link href={editHref} className="button secondary small">
        {t('edit')}
      </Link>
      <button
        type="button"
        className="button ghost small"
        disabled={pending}
        onClick={() => start(() => setDogStatus(dogId, status === 'active' ? 'paused' : 'active'))}
      >
        {status === 'active' ? t('pause') : t('activate')}
      </button>
    </div>
  )
}
