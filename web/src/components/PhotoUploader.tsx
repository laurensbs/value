'use client'
/* eslint-disable @next/next/no-img-element -- previews are data URLs or Blob URLs */

import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { Icon } from './Icon'

/** Shrinks a photo in the browser so uploads stay small and fast on mobile data. */
async function resize(file: File, maxSide: number, quality: number): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function upload(file: File, maxSide: number): Promise<string> {
  // Try a normal size first, then a smaller one if the server says it is too large.
  for (const [side, quality] of [
    [maxSide, 0.84],
    [Math.round(maxSide * 0.66), 0.72],
  ] as const) {
    const blob = await resize(file, side, quality)
    const body = new FormData()
    body.append('file', new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
    const res = await fetch('/api/upload', { method: 'POST', body })
    if (res.ok) return ((await res.json()) as { url: string }).url
    if (res.status !== 413) throw new Error(`upload ${res.status}`)
  }
  throw new Error('too-large')
}

interface Props {
  /** Form field name. Single mode posts a URL; multiple mode posts a JSON array. */
  name: string
  initial?: string[]
  max?: number
  /** Profile photos are round and smaller; dog photos are wide. */
  variant?: 'person' | 'dog'
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
      for (const file of picked) urls.push(await upload(file, variant === 'person' ? 720 : 1280))
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
