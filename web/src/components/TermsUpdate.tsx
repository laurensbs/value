'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useId, useState, useTransition } from 'react'
import { acceptTerms } from '@/server/actions/terms'
import { useActionErrorText } from './ActionError'

/**
 * The calm step for changed terms (art. 19): what changed, the full text, and one "Akkoord". The list is
 * always unfolded right above the button, so nobody agrees without seeing what changes; without a list
 * (no text of the changes) there is no "Akkoord" either, only the full terms. Someone who skipped a
 * version sees one part per version, newest first, each with its own sentence (server/terms.ts). No
 * wall in front of the page: before the new terms take effect it is only information; after that it is
 * the step before making new appointments (`required`). After the yes the page is drawn again, or goes
 * on to `next`.
 */
export function TermsUpdate({
  version,
  sections,
  date,
  required,
  next,
}: {
  version: string
  /** What changed since the version this person agreed to, one part per version (server/terms.ts termsChanges). */
  sections: { version: string; intro: string; items: string[] }[]
  /** The day the new terms take effect, written out ("9 november 2026"). */
  date: string
  required: boolean
  next?: string
}) {
  const t = useTranslations('termsUpdate')
  const errorText = useActionErrorText()
  const router = useRouter()
  const titleId = useId()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const hasList = sections.some((s) => s.items.length > 0)

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
      {sections.map((section) => (
        <div key={section.version} className="stack-s">
          {section.intro ? <p className="muted small">{section.intro}</p> : null}
          {section.items.length ? (
            <ul className="terms-changes">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
      <p>
        <Link href="/legal/terms">{t('read')}</Link>
      </p>
      {hasList ? (
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
      ) : null}
      {error ? (
        <p className="error-text" role="alert">
          {errorText(error)}
        </p>
      ) : null}
      <p className="muted small">{t('rights')}</p>
    </section>
  )
}
