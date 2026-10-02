'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState, useSyncExternalStore } from 'react'
import { useForm } from '@/lib/use-form'
import { authClient } from '@/lib/auth-client'
import { isNativeApp } from '@/lib/native'
import { deleteAccount, type FormState } from '@/server/actions/profile'
import { Icon } from './Icon'
import { SubmitButton } from './SubmitButton'

const noop = () => () => undefined

export function InviteLink({ url, message }: { url: string; message: string }) {
  const t = useTranslations('common')
  const [copied, setCopied] = useState(false)
  const canShare = useSyncExternalStore(noop, () => typeof navigator !== 'undefined' && 'share' in navigator, () => false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      document.getElementById('invite-url')?.focus()
    }
  }

  return (
    <div className="stack-s">
      <input id="invite-url" className="input mono" readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Link" />
      <div className="row">
        <button type="button" className="button secondary small" onClick={copy}>
          <Icon name="copy" size={16} /> {copied ? t('copied') : t('copy')}
        </button>
        {canShare ? (
          <button
            type="button"
            className="button primary small"
            onClick={() => navigator.share({ title: 'Rondje', text: message, url }).catch(() => undefined)}
          >
            <Icon name="share" size={16} /> {t('share')}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function PasskeyButton() {
  const t = useTranslations('auth')
  const native = useSyncExternalStore(noop, isNativeApp, () => false)
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  if (native) return null
  return (
    <div className="stack-s">
      <p className="muted small">{t('passkeyHint')}</p>
      <div className="row">
        <button
          type="button"
          className="button secondary small"
          disabled={status === 'busy'}
          onClick={async () => {
            setStatus('busy')
            const res = await authClient.passkey.addPasskey({ name: 'Rondje' })
            setStatus(res?.error ? 'error' : 'done')
          }}
        >
          <Icon name="key" size={16} /> {t('addPasskey')}
        </button>
      </div>
      {status === 'done' ? <p className="notice success">{t('passkeyAdded')}</p> : null}
      {status === 'error' ? <p className="error-text">{t('error')}</p> : null}
    </div>
  )
}

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      className="button ghost"
      onClick={async () => {
        await authClient.signOut()
        router.replace('/')
        router.refresh()
      }}
    >
      <Icon name="logout" size={18} /> {label}
    </button>
  )
}

export function DeleteAccountForm() {
  const t = useTranslations('profile')
  const { state, pending, onSubmit } = useForm<FormState>(deleteAccount, { ok: false })
  return (
    <form onSubmit={onSubmit} className="form">
      <p className="small">{t('deleteText')}</p>
      <input className="input" name="confirm" autoComplete="off" aria-label={t('deleteTitle')} placeholder={t('deleteWord')} required />
      {state.error ? <p className="error-text">{t('deleteError')}</p> : null}
      <SubmitButton className="button danger" pending={pending}>{t('deleteButton')}</SubmitButton>
    </form>
  )
}
