'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useId, useState, useTransition } from 'react'
import { acceptTerms } from '@/server/actions/terms'
import { useActionErrorText } from './ActionError'

/**
 * The calm notice for changed terms (art. 19): what changed, the full text, and one "Akkoord". No wall
 * in front of the page: before the new terms take effect it is only information; after that it is the
 * step before making new appointments (`required`). After the yes the page is drawn again, or goes on
 * to `next`.
 */
export function TermsUpdate({
  version,
  intro,
  items,
  date,
  required,
  next,
  collapsed = false,
}: {
  version: string
  intro: string
  items: string[]
  /** The day the new terms take effect, written out ("9 november 2026"). */
  date: string
  required: boolean
  next?: string
  /** On Vandaag and the profile: the list folds open on a tap, so the page stays calm. */
  collapsed?: boolean
}) {
  const t = useTranslations('termsUpdate')
  const errorText = useActionErrorText()
  const router = useRouter()
  const titleId = useId()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const changes = (
    <>
      {intro ? <p className="muted small">{intro}</p> : null}
      {items.length ? (
        <ul className="terms-changes">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </>
  )

  if (done) {
    return (
      <p className="notice success" role="status">
        {t('thanks')}
      </p>
    )
  }

  return (
    <section className="card stack-s terms-update" aria-labelledby={titleId}>
      <h2 id={titleId}>{t('title')}</h2>
      <p>{required ? t('ledeRequired', { date }) : t('lede', { date })}</p>
      {collapsed && items.length ? (
        <details className="terms-details">
          <summary>{t('whatChanges', { n: items.length })}</summary>
          {changes}
        </details>
      ) : (
        changes
      )}
      <p>
        <Link href="/legal/terms">{t('read')}</Link>
      </p>
      <div className="row">
        <button
          type="button"
          className="button primary"
          disabled={pending}
          aria-busy={pending}
          onClick={() =>
            start(async () => {
              setError(null)
              let result: { ok: boolean; error?: string }
              try {
                result = await acceptTerms(version)
              } catch {
                result = { ok: false, error: navigator.onLine ? 'server' : 'offline' }
              }
              if (!result.ok) {
                setError(result.error ?? 'invalid')
                // Changed again in the meantime: show the newest changes.
                if (result.error === 'terms-changed') router.refresh()
                return
              }
              setDone(true)
              if (next) router.push(next)
              else router.refresh()
            })
          }
        >
          {t('accept')}
        </button>
      </div>
      {error ? (
        <p className="error-text" role="alert">
          {errorText(error)}
        </p>
      ) : null}
      <p className="muted small">{t('rights')}</p>
    </section>
  )
}
