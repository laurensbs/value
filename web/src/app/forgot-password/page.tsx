import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Logo } from '@/components/Logo'
import { ForgotPasswordForm } from '@/components/PasswordReset'
import { CONTACT_PATH } from '@/lib/contact'
import { supportConfig } from '@/lib/support'
import { emailEnabled } from '@/server/email'

export async function generateMetadata() {
  const t = await getTranslations('auth')
  return { title: t('forgotTitle'), robots: { index: false } }
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations('auth')
  const tf = await getTranslations('footer')
  const { contactEmail } = supportConfig()
  return (
    <div className="auth">
      <div className="auth-card stack">
        <div className="stack-s">
          <Logo size={44} />
          <h1>{t('forgotTitle')}</h1>
          <p className="muted">{t('forgotLede')}</p>
        </div>
        {emailEnabled() ? (
          <ForgotPasswordForm />
        ) : (
          <p className="notice" role="status">
            {t('forgotUnavailable')}
            {contactEmail ? (
              <>
                {' '}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </>
            ) : (
              <>
                {' '}
                <Link href={CONTACT_PATH}>{tf('contact')}</Link>
              </>
            )}
          </p>
        )}
        <p className="muted">
          <Link href="/login">{t('backToLogin')}</Link>
        </p>
      </div>
    </div>
  )
}
