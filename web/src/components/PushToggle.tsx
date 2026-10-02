'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState, useTransition } from 'react'
import { installWay } from '@/lib/install-client'
import { disablePush, enablePush, pushState, type PushState } from '@/lib/push-client'
import { InstallSteps } from './InstallSteps'

/**
 * Push notifications in this browser: on or off. Shown only where the browser supports it, and not
 * inside the app shell. On iPhone and iPad that is only in Rondje on the home screen, so there it
 * shows how to put it there instead.
 */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const t = useTranslations('profile')
  const [state, setState] = useState<PushState | 'loading' | 'ios' | 'ios-in-app'>('loading')
  const [pending, start] = useTransition()

  useEffect(() => {
    let cancelled = false
    pushState()
      .then((s) => {
        if (cancelled) return
        const way = s === 'unsupported' ? installWay() : null
        setState(way === 'ios' || way === 'ios-in-app' ? way : s)
      })
      .catch(() => !cancelled && setState('unsupported'))
    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'loading' || state === 'unsupported') return null
  if (state === 'ios' || state === 'ios-in-app') {
    return (
      <div className="field">
        <span>{t('pushNotifications')}</span>
        <span className="hint">{state === 'ios' ? t('pushIos') : t('pushIosInApp')}</span>
        {state === 'ios' ? <InstallSteps /> : null}
      </div>
    )
  }

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
