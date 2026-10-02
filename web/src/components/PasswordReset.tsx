'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { SubmitButton } from './SubmitButton'

/** Ask for a reset link. Always the same answer, so nobody can find out who has an account. */
export function ForgotPasswordForm() {
  const t = useTranslations('auth')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [failed, setFailed] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim()
    setPending(true)
    setFailed(false)
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })
    setPending(false)
    // A rate limit or network error is worth saying; "no such account" is not revealed.
    if (error && (error.status === 429 || !error.status)) setFailed(true)
    else setSent(true)
  }

  if (sent) {
    return (
      <p className="notice success" role="status">
        {t('forgotSent')}
      </p>
    )
  }
  return (
    <form onSubmit={onSubmit} className="form">
      <label className="field">
        <span>{t('email')}</span>
        <input className="input" type="email" name="email" required autoComplete="email" />
      </label>
      {failed ? (
        <p className="notice danger" role="alert">
          {t('error')}
        </p>
      ) : null}
      <SubmitButton className="button primary wide" pending={pending}>
        {t('forgotSubmit')}
      </SubmitButton>
    </form>
  )
}

/** Choose a new password with the token from the email link. */
export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations('auth')
  const [pending, setPending] = useState(false)
  const [state, setState] = useState<'idle' | 'done' | 'invalid' | 'error'>('idle')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const newPassword = String(new FormData(e.currentTarget).get('password') ?? '')
    setPending(true)
    const { error } = await authClient.resetPassword({ newPassword, token })
    setPending(false)
    setState(!error ? 'done' : error.status === 400 ? 'invalid' : 'error')
  }

  if (state === 'done') {
    return (
      <div className="stack-s">
        <p className="notice success" role="status">
          {t('resetDone')}
        </p>
        <Link href="/login" className="button primary">
          {t('backToLogin')}
        </Link>
      </div>
    )
  }
  return (
    <form onSubmit={onSubmit} className="form">
      <label className="field">
        <span>{t('resetNew')}</span>
        <input className="input" type="password" name="password" required minLength={8} maxLength={128} autoComplete="new-password" />
        <span className="hint">{t('passwordHint')}</span>
      </label>
      {state === 'invalid' ? (
        <p className="notice danger" role="alert">
          {t('resetInvalid')} <Link href="/forgot-password">{t('forgotAgain')}</Link>
        </p>
      ) : state === 'error' ? (
        <p className="notice danger" role="alert">
          {t('error')}
        </p>
      ) : null}
      <SubmitButton className="button primary wide" pending={pending}>
        {t('resetSubmit')}
      </SubmitButton>
    </form>
  )
}
