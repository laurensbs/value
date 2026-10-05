'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

/** The sentence for an error code from a request action, in plain words (onderzoek §3.8). */
export function useActionErrorText() {
  const t = useTranslations()
  return (code: string) =>
    code === 'offline' || code === 'server'
      ? t(`errors.${code}`)
      : code === 'not-signed-in'
        ? t('request.signedOut')
        : t.has(`request.reasons.${code}`)
          ? t(`request.reasons.${code}`)
          : t('request.reasons.invalid')
}

/**
 * One plain sentence for what went wrong, with the way forward where there is one: signing in again,
 * why an account is blocked, the appointment that is already there, or the changed terms to agree to.
 */
export function ActionError({ code, text }: { code: string; text: string }) {
  const t = useTranslations()
  const path = usePathname()
  return (
    <p className="error-text" role="alert">
      {text}{' '}
      {code === 'not-signed-in' ? (
        <Link href={`/login?next=${encodeURIComponent(path)}`}>{t('nav.login')}</Link>
      ) : code === 'banned' ? (
        <Link href="/banned">{t('request.bannedMore')}</Link>
      ) : code === 'already-open' ? (
        <Link href="/requests">{t('request.viewRequests')}</Link>
      ) : code === 'needs-terms' ? (
        // The changed terms as a step of their own; "Akkoord" brings you back here.
        <Link href={`/profile/terms?next=${encodeURIComponent(path)}`}>{t('termsUpdate.first')}</Link>
      ) : null}
    </p>
  )
}
