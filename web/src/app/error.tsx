'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useSyncExternalStore } from 'react'
import { DogFace } from '@/components/DogFace'
import { lookFor } from '@/lib/avatar'
import { playSound } from '@/lib/sounds'

const subscribe = (change: () => void) => {
  window.addEventListener('online', change)
  window.addEventListener('offline', change)
  return () => {
    window.removeEventListener('online', change)
    window.removeEventListener('offline', change)
  }
}

/**
 * Something broke: a dog, one plain sentence and "try again" (onderzoek §3.8). Never the technical
 * message; offline gets its own sentence, because then the fix is on the visitor's side.
 */
export default function ErrorPage({ error, reset, retry }: { error: Error & { digest?: string }; reset: () => void; retry?: () => void }) {
  const t = useTranslations('errors')
  const offline = useSyncExternalStore(subscribe, () => !navigator.onLine, () => false)
  useEffect(() => {
    console.error(error)
    playSound('error')
  }, [error])
  return (
    <div className="narrow-page stack error-page">
      <DogFace look={lookFor({ id: 'lost-dog' })} size={140} />
      <h1>{offline ? t('offline') : t('server')}</h1>
      <div className="row">
        <button type="button" className="button primary big" onClick={() => (retry ?? reset)()}>
          {t('retry')}
        </button>
        <Link href="/" className="button ghost big">
          {t('home')}
        </Link>
      </div>
    </div>
  )
}
