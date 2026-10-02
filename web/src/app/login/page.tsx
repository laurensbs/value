import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AuthForm } from '@/components/AuthForm'
import { Logo } from '@/components/Logo'
import { enabledSocialProviders } from '@/lib/auth'
import { safeNext } from '@/lib/site'
import { getViewer } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('auth')
  return { title: t('loginTitle') }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams
  const next = safeNext(params.next)
  const viewer = await getViewer()
  if (viewer) redirect(viewer.profile ? next : `/onboarding?next=${encodeURIComponent(next)}`)
  const t = await getTranslations('auth')

  return (
    <div className="auth">
      <div className="auth-card stack">
        <div className="stack-s">
          <Logo size={44} />
          <h1>{t('loginTitle')}</h1>
        </div>
        {params.error ? (
          <p className="notice danger" role="alert">
            {t('error')}
          </p>
        ) : null}
        <AuthForm mode="login" next={next} providers={enabledSocialProviders} />
        <p className="muted">
          {t('noAccount')}{' '}
          <Link href={`/signup?next=${encodeURIComponent(next)}`}>{t('signup')}</Link>
        </p>
      </div>
    </div>
  )
}
