'use client'
/* eslint-disable @next/next/no-img-element -- photos can be data URLs or Blob URLs */

import { useTranslations } from 'next-intl'
import { useRef, useState, useTransition } from 'react'
import { uploadPhoto } from '@/lib/photo-upload'
import { addWalkPhoto } from '@/server/actions/walks'
import { Icon } from './Icon'

export interface WalkPhoto {
  id: string
  url: string
  t: number
}

/** A row of photos from the walk, newest first. */
export function WalkPhotoStrip({ photos, dogName }: { photos: WalkPhoto[]; dogName: string }) {
  const t = useTranslations('walk')
  if (!photos.length) return null
  return (
    <section className="stack-s" aria-label={t('photosTitle')}>
      <h2 className="small-title">{t('photosTitle')}</h2>
      <ul className="walk-photos">
        {[...photos].reverse().map((p) => (
          <li key={p.id}>
            {/* Browsers refuse to open data: URLs in a new tab, so only stored photos get a link. */}
            {p.url.startsWith('https://') ? (
              <a href={p.url} target="_blank" rel="noopener noreferrer">
                <img src={p.url} alt={t('photoAlt', { dogName })} loading="lazy" />
              </a>
            ) : (
              <img src={p.url} alt={t('photoAlt', { dogName })} loading="lazy" />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The walker's camera button: take a photo, shrink it, and share it with the owner. */
export function WalkPhotoButton({ walkId, onSent }: { walkId: string; onSent: (photo: WalkPhoto) => void }) {
  const t = useTranslations('walk')
  const input = useRef<HTMLInputElement>(null)
  const [pending, start] = useTransition()
  const [status, setStatus] = useState<'idle' | 'sent' | 'error' | 'too-many'>('idle')

  function onFile(file: File | undefined) {
    if (!file) return
    start(async () => {
      try {
        const url = await uploadPhoto(file, 1280)
        const res = await addWalkPhoto(walkId, url)
        if (!res.ok) {
          setStatus(res.error === 'too-many' ? 'too-many' : 'error')
          return
        }
        onSent({ id: crypto.randomUUID(), url, t: Date.now() })
        setStatus('sent')
      } catch {
        setStatus('error')
      } finally {
        if (input.current) input.current.value = ''
      }
    })
  }

  return (
    <div className="stack-s">
      <label className={`button secondary wide${pending ? ' busy' : ''}`} aria-busy={pending}>
        <Icon name="camera" size={18} /> {pending ? t('photoSending') : t('photoButton')}
        <input
          ref={input}
          type="file"
          accept="image/*"
          capture="environment"
          className="visually-hidden"
          disabled={pending}
          onChange={(e) => onFile(e.currentTarget.files?.[0])}
        />
      </label>
      <p className="muted small" role="status">
        {status === 'sent' ? t('photoSent') : status === 'error' ? t('photoError') : status === 'too-many' ? t('photoTooMany') : t('photoHint')}
      </p>
    </div>
  )
}
