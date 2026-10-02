import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Logo } from '@/components/Logo'
import { ResetPasswordForm } from '@/components/PasswordReset'

export async function generateMetadata() {
  const t = await getTranslations('auth')
  return { title: t('resetTitle'), robots: { index: false } }
}

/** Where the link in the reset email lands (Better Auth adds ?token=…, or ?error=INVALID_TOKEN). */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams
  const t = await getTranslations('auth')
  return (
    <div className="auth">
      <div className="auth-card stack">
        <div className="stack-s">
          <Logo size={44} />
          <h1>{t('resetTitle')}</h1>
        </div>
        {token && !error ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="notice danger" role="alert">
            {t('resetInvalid')} <Link href="/forgot-password">{t('forgotAgain')}</Link>
          </p>
        )}
      </div>
    </div>
  )
}
