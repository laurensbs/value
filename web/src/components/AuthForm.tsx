'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { authClient } from '@/lib/auth-client'
import { isNativeApp } from '@/lib/native'
import { Icon } from './Icon'

type Provider = 'google' | 'apple'

interface Props {
  mode: 'login' | 'signup'
  next: string
  intent?: string
  providers: Provider[]
}

const noop = () => () => undefined

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.27-1.6 2.78-.41 6.9 1.15 9.15.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66ZM14.1 5.84c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28Z" />
    </svg>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.29V6.6H1.27a12 12 0 0 0 0 10.8l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.27 6.6l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  )
}

/**
 * Email + password, passkeys and (when configured) Google/Apple. In the native
 * app shell only email + password is shown: Google blocks sign-in inside app web
 * views, and passkeys need the app's associated domain (see docs/IOS.md).
 */
export function AuthForm({ mode, next, intent, providers }: Props) {
  const t = useTranslations('auth')
  const router = useRouter()
  const native = useSyncExternalStore(noop, isNativeApp, () => false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const afterSignup = `/onboarding?next=${encodeURIComponent(next)}${intent ? `&intent=${encodeURIComponent(intent)}` : ''}`

  function done(path: string) {
    router.replace(path)
    router.refresh()
  }

  // Lets the browser offer saved passkeys right in the email field.
  useEffect(() => {
    if (mode !== 'login' || native) return
    if (typeof window === 'undefined' || !window.PublicKeyCredential?.isConditionalMediationAvailable) return
    let active = true
    window.PublicKeyCredential.isConditionalMediationAvailable()
      .then((available) => {
        if (!available || !active) return
        return authClient.signIn.passkey({ autoFill: true }).then((res) => {
          if (active && res?.data) {
            router.replace(next)
            router.refresh()
          }
        })
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [mode, native, next, router])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    setPending(true)
    setError(null)
    if (mode === 'login') {
      const { error: err } = await authClient.signIn.email({ email, password })
      if (err) {
        setError(t('error'))
        setPending(false)
        return
      }
      done(next)
    } else {
      const name = String(form.get('name') ?? '').trim()
      const { error: err } = await authClient.signUp.email({ name, email, password })
      if (err) {
        setError(err.code?.startsWith('USER_ALREADY_EXISTS') ? t('errorExists') : t('error'))
        setPending(false)
        return
      }
      done(afterSignup)
    }
  }

  async function withPasskey() {
    setError(null)
    const res = await authClient.signIn.passkey()
    if (res?.data) done(next)
    else setError(t('errorPasskey'))
  }

  async function withProvider(provider: Provider) {
    setError(null)
    setPending(true)
    const { error: err } = await authClient.signIn.social({
      provider,
      callbackURL: mode === 'signup' ? afterSignup : next,
      newUserCallbackURL: afterSignup,
      errorCallbackURL: mode === 'signup' ? '/signup?error=1' : '/login?error=1',
    })
    if (err) {
      setError(t('error'))
      setPending(false)
    }
  }

  const social = native ? [] : providers

  return (
    <div className="stack">
      {social.length ? (
        <div className="stack-s">
          {social.includes('apple') ? (
            <button type="button" className="button social apple wide" onClick={() => withProvider('apple')} disabled={pending}>
              <AppleMark /> {t('withApple')}
            </button>
          ) : null}
          {social.includes('google') ? (
            <button type="button" className="button social wide" onClick={() => withProvider('google')} disabled={pending}>
              <GoogleMark /> {t('withGoogle')}
            </button>
          ) : null}
          <p className="divider">
            <span>{t('orEmail')}</span>
          </p>
        </div>
      ) : null}

      <form className="form" onSubmit={onSubmit}>
        {mode === 'signup' ? (
          <label className="field">
            <span>{t('name')}</span>
            <input className="input" name="name" autoComplete="given-name" required maxLength={40} />
          </label>
        ) : null}
        <label className="field">
          <span>{t('email')}</span>
          <input
            className="input"
            type="email"
            name="email"
            inputMode="email"
            autoComplete={mode === 'login' ? 'username webauthn' : 'email'}
            required
          />
        </label>
        <label className="field">
          <span>{t('password')}</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
            required
          />
          {mode === 'signup' ? <span className="hint">{t('passwordHint')}</span> : null}
        </label>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="button primary wide" disabled={pending} aria-busy={pending}>
          {mode === 'login' ? t('login') : t('signup')}
        </button>
        {mode === 'signup' ? (
          <p className="muted small">
            {t.rich('termsNote', {
              terms: (c) => <Link href="/legal/terms">{c}</Link>,
              privacy: (c) => <Link href="/legal/privacy">{c}</Link>,
            })}
          </p>
        ) : null}
      </form>

      {mode === 'login' && !native ? (
        <button type="button" className="button ghost wide" onClick={withPasskey} disabled={pending}>
          <Icon name="key" size={18} /> {t('withPasskey')}
        </button>
      ) : null}
    </div>
  )
}
