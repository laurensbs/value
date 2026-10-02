'use client'
/* eslint-disable @next/next/no-img-element -- previews are data URLs or Blob URLs */

import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { uploadPhoto } from '@/lib/photo-upload'
import { Icon } from './Icon'

interface Props {
  /** Form field name. Single mode posts a URL; multiple mode posts a JSON array. */
  name: string
  initial?: string[]
  max?: number
  /** Profile photos are round and smaller; dog photos are wide; logos are shown whole. */
  variant?: 'person' | 'dog' | 'logo'
}

export function PhotoUploader({ name, initial = [], max = 1, variant = 'dog' }: Props) {
  const t = useTranslations('photos')
  const [photos, setPhotos] = useState<string[]>(initial.filter(Boolean))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const single = max === 1

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setError(null)
    try {
      const room = single ? 1 : max - photos.length
      const picked = Array.from(files).slice(0, Math.max(room, 0))
      const urls: string[] = []
      for (const file of picked) urls.push(await uploadPhoto(file, variant === 'person' ? 720 : variant === 'logo' ? 512 : 1280))
      setPhotos((prev) => (single ? urls.slice(0, 1) : [...prev, ...urls].slice(0, max)))
    } catch {
      setError(t('error'))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  function remove(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  function makeFirst(index: number) {
    setPhotos((prev) => [prev[index], ...prev.filter((_, i) => i !== index)])
  }

  const value = single ? (photos[0] ?? '') : JSON.stringify(photos)
  const canAdd = single || photos.length < max

  return (
    <div className={`uploader ${variant}`}>
      <input type="hidden" name={name} value={value} />
      <ul className="uploader-grid">
        {photos.map((src, i) => (
          <li key={src.slice(-40) + i} className="uploader-item">
            <img src={src} alt="" />
            <div className="uploader-actions">
              {!single && i > 0 ? (
                <button type="button" className="chip" onClick={() => makeFirst(i)}>
                  {t('makeFirst')}
                </button>
              ) : null}
              <button type="button" className="chip" onClick={() => remove(i)} aria-label={t('remove')}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          </li>
        ))}
        {canAdd ? (
          <li>
            <label className={`uploader-add${busy ? ' busy' : ''}`}>
              <input
                ref={input}
                type="file"
                accept="image/*"
                multiple={!single}
                disabled={busy}
                onChange={(e) => onFiles(e.currentTarget.files)}
              />
              <Icon name="camera" size={22} />
              <span>{busy ? t('uploading') : single && photos.length ? t('change') : t('add')}</span>
            </label>
          </li>
        ) : null}
      </ul>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
