'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('errors')
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="narrow-page stack error-page">
      <h1>{t('generic')}</h1>
      <div className="row">
        <button type="button" className="button primary" onClick={reset}>
          {t('retry')}
        </button>
        <Link href="/" className="button ghost">
          {t('home')}
        </Link>
      </div>
    </div>
  )
}
