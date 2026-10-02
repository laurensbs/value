'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState, useTransition } from 'react'
import { disablePush, enablePush, pushState, type PushState } from '@/lib/push-client'

/**
 * Push notifications in this browser: on or off. Shown only where the browser supports it
 * (on iPhone: after adding Rondje to the home screen) and not inside the app shell.
 */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const t = useTranslations('profile')
  const [state, setState] = useState<PushState | 'loading'>('loading')
  const [pending, start] = useTransition()

  useEffect(() => {
    let cancelled = false
    pushState()
      .then((s) => !cancelled && setState(s))
      .catch(() => !cancelled && setState('unsupported'))
    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'loading' || state === 'unsupported') return null

  function toggle(next: boolean) {
    start(async () => {
      try {
        if (next) {
          setState(await enablePush(publicKey))
        } else {
          await disablePush()
          setState('off')
        }
      } catch {
        setState('off')
      }
    })
  }

  return (
    <label className="check">
      <input type="checkbox" checked={state === 'on'} disabled={pending || state === 'blocked'} onChange={(e) => toggle(e.target.checked)} />
      <span>
        {t('pushNotifications')}
        <span className="hint">{state === 'blocked' ? t('pushBlocked') : t('pushHint')}</span>
      </span>
    </label>
  )
}
