'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState, useTransition } from 'react'
import { isNativeApp } from '@/lib/native'
import { deletePushSubscription, savePushSubscription } from '@/server/actions/push'

type State = 'loading' | 'unsupported' | 'blocked' | 'off' | 'on'

function urlBase64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration('/')) ?? navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

/**
 * Push notifications in this browser: on or off. Shown only where the browser supports it
 * (on iPhone: after adding Rondje to the home screen) and not inside the app shell.
 */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const t = useTranslations('profile')
  const [state, setState] = useState<State>('loading')
  const [pending, start] = useTransition()

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (isNativeApp() || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
      if (Notification.permission === 'denied') return 'blocked'
      const reg = await navigator.serviceWorker.getRegistration('/')
      const sub = await reg?.pushManager.getSubscription()
      return sub ? 'on' : 'off'
    }
    check()
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
        const reg = await registration()
        if (next) {
          const permission = await Notification.requestPermission()
          if (permission !== 'granted') return setState(permission === 'denied' ? 'blocked' : 'off')
          const sub =
            (await reg.pushManager.getSubscription()) ??
            (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(publicKey) }))
          setState((await savePushSubscription(sub.toJSON())) ? 'on' : 'off')
        } else {
          const sub = await reg.pushManager.getSubscription()
          if (sub) {
            await deletePushSubscription(sub.endpoint)
            await sub.unsubscribe()
          }
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
