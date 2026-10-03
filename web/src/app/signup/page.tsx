import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AuthForm } from '@/components/AuthForm'
import { Icon } from '@/components/Icon'
import { Logo } from '@/components/Logo'
import { enabledSocialProviders } from '@/lib/auth'
import { safeNext } from '@/lib/site'
import { isNativeRequest } from '@/server/native'
import { getViewer } from '@/server/session'

const INTENTS = ['walker', 'owner', 'shelter'] as const
type Intent = (typeof INTENTS)[number]

export async function generateMetadata() {
  const t = await getTranslations('auth')
  return { title: t('signupTitle') }
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; intent?: string; error?: string }>
}) {
  const params = await searchParams
  const intent: Intent | undefined = INTENTS.find((i) => i === params.intent)
  const fallback = intent === 'owner' ? '/my-dogs/new' : intent === 'shelter' ? '/shelter' : '/dogs'
  const next = safeNext(params.next, fallback)
  const viewer = await getViewer()
  if (viewer) redirect(viewer.profile ? next : `/onboarding?next=${encodeURIComponent(next)}${intent ? `&intent=${intent}` : ''}`)
  const t = await getTranslations('auth')
  // The app shell (Capacitor) shows no Google/Apple buttons: Google refuses sign-in in web views.
  const providers = (await isNativeRequest()) ? [] : enabledSocialProviders

  return (
    <div className="auth">
      <div className="auth-card stack">
        <div className="stack-s">
          <Logo size={44} />
          <h1>{t('signupTitle')}</h1>
          <p className="muted">{intent ? t(`intent.${intent}`) : t('signupLede')}</p>
        </div>
        {params.error ? (
          <p className="notice danger" role="alert">
            {t('error')}
          </p>
        ) : null}
        <AuthForm mode="signup" next={next} intent={intent} providers={providers} />
        <ul className="auth-promises small">
          <li>
            <Icon name="heart" size={16} /> {t('promiseFree')}
          </li>
          <li>
            <Icon name="shield" size={16} /> {t('promisePrivacy')}
          </li>
        </ul>
        <p className="muted">
          {t('hasAccount')} <Link href={`/login?next=${encodeURIComponent(next)}`}>{t('login')}</Link>
        </p>
      </div>
    </div>
  )
}
