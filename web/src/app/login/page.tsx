import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AuthForm } from '@/components/AuthForm'
import { Logo } from '@/components/Logo'
import type { SocialProvider } from '@/components/SocialButtons'
import { enabledSocialProviders } from '@/lib/auth'
import { safeNext } from '@/lib/site'
import { isNativeRequest } from '@/server/native'
import { getViewer } from '@/server/session'

const NAMES: Record<SocialProvider, string> = { apple: 'Apple', google: 'Google' }

/** Leaving the Google or Apple screen on purpose is not an error worth a red banner. */
const CANCELLED = new Set(['access_denied', 'user_cancelled_authorize', 'user_cancelled_login'])

export async function generateMetadata() {
  const t = await getTranslations('auth')
  return { title: t('loginTitle') }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; via?: string }>
}) {
  const params = await searchParams
  const next = safeNext(params.next)
  const viewer = await getViewer()
  if (viewer) redirect(viewer.profile ? next : `/onboarding?next=${encodeURIComponent(next)}`)
  const [t, ts] = await Promise.all([getTranslations('auth'), getTranslations('social')])

  // The app shell (Capacitor) shows no Google/Apple buttons: Google refuses sign-in in web views.
  const providers = (await isNativeRequest()) ? [] : enabledSocialProviders
  // Back from Google/Apple with an error (Better Auth adds `error`, the buttons add `via`).
  const via = enabledSocialProviders.find((p) => p === params.via) as SocialProvider | undefined
  const linkProvider = via && params.error === 'account_not_linked' ? via : undefined
  const socialError = via && params.error && !linkProvider && !CANCELLED.has(params.error)

  return (
    <div className="auth">
      <div className="auth-card stack">
        <div className="stack-s">
          <Logo size={44} />
          <h1>{t('loginTitle')}</h1>
        </div>
        {linkProvider ? (
          <p className="notice" role="status">
            {ts('linkNotice', { provider: NAMES[linkProvider] })}
          </p>
        ) : socialError ? (
          <p className="notice danger" role="alert">
            {ts('error', { provider: NAMES[via] })}
          </p>
        ) : params.error && !via ? (
          <p className="notice danger" role="alert">
            {t('error')}
          </p>
        ) : null}
        <AuthForm mode="login" next={next} providers={providers} linkProvider={linkProvider} />
        <p className="small">
          <Link href="/forgot-password">{t('forgot')}</Link>
        </p>
        <p className="muted">
          {t('noAccount')}{' '}
          <Link href={`/signup?next=${encodeURIComponent(next)}`}>{t('signup')}</Link>
        </p>
      </div>
    </div>
  )
}
