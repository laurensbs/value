'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { authClient } from '@/lib/auth-client'
import { isNativeApp } from '@/lib/native'
import { Icon } from './Icon'
import { SocialButtons, type SocialProvider } from './SocialButtons'

interface Props {
  mode: 'login' | 'signup'
  next: string
  intent?: string
  providers: SocialProvider[]
  /**
   * Google/Apple found an existing account with the same e-mail that was made with a password.
   * After the password (or a passkey) we link the provider, so both work from then on.
   */
  linkProvider?: SocialProvider
}

const noop = () => () => undefined

/**
 * Email + password, passkeys and (when configured) Google/Apple. In the native
 * app shell only email + password is shown: Google blocks sign-in inside app web
 * views, and passkeys need the app's associated domain (see docs/IOS.md). The
 * native SwiftUI app has its own sign-in screens and never shows this form.
 */
export function AuthForm({ mode, next, intent, providers, linkProvider }: Props) {
  const t = useTranslations('auth')
  const router = useRouter()
  const native = useSyncExternalStore(noop, isNativeApp, () => false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const afterSignup = `/onboarding?next=${encodeURIComponent(next)}${intent ? `&intent=${encodeURIComponent(intent)}` : ''}`

  const done = useCallback(
    (path: string) => {
      router.replace(path)
      router.refresh()
    },
    [router],
  )

  /** Signed in: link Google/Apple first if that is why we are here, then go on. */
  const signedIn = useCallback(
    async (path: string) => {
      if (linkProvider) {
        const { error: err } = await authClient.linkSocial({ provider: linkProvider, callbackURL: path, errorCallbackURL: path })
        if (!err) return // On its way to Google/Apple; they send the browser back to `path`.
      }
      done(path)
    },
    [linkProvider, done],
  )

  // Lets the browser offer saved passkeys right in the email field.
  useEffect(() => {
    if (mode !== 'login' || native) return
    if (typeof window === 'undefined' || !window.PublicKeyCredential?.isConditionalMediationAvailable) return
    let active = true
    window.PublicKeyCredential.isConditionalMediationAvailable()
      .then((available) => {
        if (!available || !active) return
        return authClient.signIn.passkey({ autoFill: true }).then((res) => {
          if (active && res?.data) void signedIn(next)
        })
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [mode, native, next, signedIn])

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
      await signedIn(next)
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
    if (res?.data) await signedIn(next)
    else setError(t('errorPasskey'))
  }

  // While linking, the password is the way in; Google/Apple again would only end up here again.
  const social = native || linkProvider ? [] : providers
  const loginHere = `/login?next=${encodeURIComponent(next)}`
  const signupHere = `/signup?next=${encodeURIComponent(next)}${intent ? `&intent=${encodeURIComponent(intent)}` : ''}`

  return (
    <div className="stack">
      {/* After Google/Apple: back to /login or /signup, which send people on (or to onboarding). */}
      <SocialButtons
        providers={social}
        callbackURL={mode === 'signup' ? signupHere : loginHere}
        errorCallbackURL={loginHere}
        disabled={pending}
      />

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
