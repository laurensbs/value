'use client'

import { useTranslations } from 'next-intl'
import { useState, useSyncExternalStore } from 'react'
import { Icon } from './Icon'

const noop = () => () => undefined

/**
 * On a verified shelter's dashboard: a ready message for volunteers with the link to the shelter's
 * dogs, for their website, newsletter or volunteers' group. Shared from the phone's own menu
 * (WhatsApp on a computer) or copied, the whole message or only the link. Nothing is sent from here.
 */
export function ShelterShare({ url, message }: { url: string; message: string }) {
  const t = useTranslations('shelterShare')
  const ts = useTranslations('dogShare')
  const [copied, setCopied] = useState<'message' | 'link' | 'failed' | null>(null)
  const canShare = useSyncExternalStore(noop, () => 'share' in navigator, () => false)

  async function copy(text: string, what: 'message' | 'link') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
    } catch {
      setCopied('failed')
    }
  }

  return (
    <section className="card share-card stack-s" aria-labelledby="shelter-share-title">
      <h2 id="shelter-share-title" className="small-title">
        {t('title')}
      </h2>
      <p>{t('text')}</p>
      <p className="share-message">{message}</p>
      <div className="row">
        {canShare ? (
          <button type="button" className="button primary small" onClick={() => navigator.share({ text: message }).catch(() => undefined)}>
            <Icon name="share" size={16} /> {ts('share')}
          </button>
        ) : (
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="button primary small">
            <Icon name="chat" size={16} /> {ts('whatsapp')}
          </a>
        )}
        <button type="button" className="button secondary small" onClick={() => copy(message, 'message')}>
          <Icon name="copy" size={16} /> {t('copyMessage')}
        </button>
        <button type="button" className="button ghost small" onClick={() => copy(url, 'link')}>
          <Icon name="link" size={16} /> {t('copyLink')}
        </button>
      </div>
      {copied ? (
        <p className="muted small" role="status">
          {copied === 'failed' ? ts('copyFailed') : copied === 'link' ? t('linkCopied') : ts('copied')}
        </p>
      ) : null}
    </section>
  )
}
