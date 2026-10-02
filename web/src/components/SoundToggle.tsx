'use client'

import { useTranslations } from 'next-intl'
import { useSyncExternalStore } from 'react'
import { setSoundsEnabled, soundsEnabled, subscribeSounds } from '@/lib/sounds'

/** The "Geluidjes" setting. It lives on this device (like in the app), not on the server. */
export function SoundToggle() {
  const t = useTranslations('sounds')
  const on = useSyncExternalStore(subscribeSounds, soundsEnabled, () => true)
  return (
    <label className="check">
      <input type="checkbox" checked={on} onChange={(e) => setSoundsEnabled(e.target.checked)} />
      <span>
        {t('toggle')}
        <span className="hint">{t('hint')}</span>
      </span>
    </label>
  )
}
