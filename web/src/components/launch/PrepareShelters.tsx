'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { prepareShelterContacts } from '@/server/actions/launch'
import { Icon } from '../Icon'

/** One tap: the nearest shelters from the directory as contacts, ready to write to. Sends nothing. */
export function PrepareShelters() {
  const t = useTranslations('launch.contacts')
  const [pending, start] = useTransition()
  const [added, setAdded] = useState<number | null>(null)
  return (
    <div className="stack-s">
      <div>
        <button
          type="button"
          className="button secondary small"
          disabled={pending}
          onClick={() => start(async () => setAdded((await prepareShelterContacts()).added))}
        >
          <Icon name="building" size={16} /> {t('prepare')}
        </button>
      </div>
      <p className="muted small" role="status">
        {added == null ? t('prepareHint') : t('prepared', { n: added })}
      </p>
    </div>
  )
}
