'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import styles from './SocialButtons.module.css'

export type SocialProvider = 'google' | 'apple'

const PROVIDER_NAMES: Record<SocialProvider, string> = { apple: 'Apple', google: 'Google' }

interface Props {
  providers: SocialProvider[]
  /** Where to land after signing in; /login and /signup send people on (or to onboarding). */
  callbackURL: string
  /** Where to land when it fails; `via=<provider>` and Better Auth's `error=<code>` are added. */
  errorCallbackURL: string
  disabled?: boolean
}

function AppleMark() {
  return (
    <svg className={styles.mark} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.27-1.6 2.78-.41 6.9 1.15 9.15.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66ZM14.1 5.84c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28Z" />
    </svg>
  )
}

function GoogleMark() {
  return (
    <svg className={styles.mark} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.29V6.6H1.27a12 12 0 0 0 0 10.8l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.27 6.6l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  )
}

/**
 * "Doorgaan met Apple" and "Doorgaan met Google", only for providers whose keys are set.
 * Apple goes first: Apple asks for its button to be at least as prominent as the others.
 */
export function SocialButtons({ providers, callbackURL, errorCallbackURL, disabled }: Props) {
  const t = useTranslations('social')
  const [pending, setPending] = useState<SocialProvider | null>(null)
  const [failed, setFailed] = useState<SocialProvider | null>(null)

  const ordered = (['apple', 'google'] as const).filter((p) => providers.includes(p))
  if (!ordered.length) return null

  async function go(provider: SocialProvider) {
    setPending(provider)
    setFailed(null)
    const sep = errorCallbackURL.includes('?') ? '&' : '?'
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL,
      errorCallbackURL: `${errorCallbackURL}${sep}via=${provider}`,
    })
    // On success the browser is already on its way to Apple or Google.
    if (error) {
      setFailed(provider)
      setPending(null)
    }
  }

  return (
    <div className="stack-s">
      <div className={styles.buttons}>
        {ordered.map((provider) => (
          <button
            key={provider}
            type="button"
            className={`button wide ${styles.social} ${styles[provider]}`}
            onClick={() => go(provider)}
            disabled={disabled || pending !== null}
            aria-busy={pending === provider}
          >
            {provider === 'apple' ? <AppleMark /> : <GoogleMark />}
            {provider === 'apple' ? t('continueWithApple') : t('continueWithGoogle')}
          </button>
        ))}
      </div>
      {failed ? (
        <p className="error-text" role="alert">
          {t('error', { provider: PROVIDER_NAMES[failed] })}
        </p>
      ) : null}
      <p className="divider">
        <span>{t('or')}</span>
      </p>
    </div>
  )
}
