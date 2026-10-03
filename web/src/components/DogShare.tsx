'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState, useSyncExternalStore } from 'react'
import { Icon } from './Icon'

const noop = () => () => undefined

/**
 * On the owner's own dog page: a ready message for the neighbours, with a link to the dog. Shared
 * from the phone's own menu (WhatsApp on a computer), copied, or printed as a poster. Nothing is
 * sent from here: the owner chooses who gets it.
 */
export function DogShare({ dogId, name, message }: { dogId: string; name: string; message: string }) {
  const t = useTranslations('dogShare')
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null)
  const canShare = useSyncExternalStore(noop, () => 'share' in navigator, () => false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied('yes')
    } catch {
      setCopied('no')
    }
  }

  return (
    <section id="share" className="card share-card stack-s" aria-labelledby="share-title">
      <h2 id="share-title" className="small-title">
        {t('title', { name })}
      </h2>
      <p>{t('text', { name })}</p>
      <p className="share-message">{message}</p>
      <div className="row">
        {canShare ? (
          <button type="button" className="button primary small" onClick={() => navigator.share({ text: message }).catch(() => undefined)}>
            <Icon name="share" size={16} /> {t('share')}
          </button>
        ) : (
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="button primary small">
            <Icon name="chat" size={16} /> {t('whatsapp')}
          </a>
        )}
        <button type="button" className="button secondary small" onClick={copy}>
          <Icon name="copy" size={16} /> {t('copy')}
        </button>
      </div>
      {copied ? (
        <p className="muted small" role="status">
          {copied === 'yes' ? t('copied') : t('copyFailed')}
        </p>
      ) : null}
      <p className="small">
        <Link href={`/my-dogs/${dogId}/poster`}>{t('poster')} →</Link>
      </p>
      <p className="muted small">{t('privacy', { name })}</p>
    </section>
  )
}
