'use client'
/* eslint-disable @next/next/no-img-element -- photos are Blob URLs or data URLs */

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useRef, useState, useTransition } from 'react'
import { nameFromFile } from '@/lib/dog-import'
import { MAX_DRAFT_DOGS } from '@/lib/dog-options'
import type { DraftDog } from '@/lib/draft-dogs'
import { uploadPhoto } from '@/lib/photo-upload'
import { createDraftDog, deleteDraftDog, saveDraftDogs } from '@/server/actions/shelters'
import { Icon } from './Icon'

interface Props {
  orgId: string
  initial: DraftDog[]
  verified: boolean
}

type Progress = { done: number; failed: number; total: number }

const isImage = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)

/**
 * Photo-first bulk add for shelters: pick a pile of photos (one per dog), every photo becomes a
 * draft right away, fill in the essentials per card and put them all online in one go.
 */
export function BulkDogAdd({ orgId, initial, verified }: Props) {
  const t = useTranslations('bulk')
  const tg = useTranslations()
  const [dogs, setDogs] = useState<DraftDog[]>(initial)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ published: number; missingName: number } | null>(null)
  const [saving, startSaving] = useTransition()
  const input = useRef<HTMLInputElement>(null)
  const seen = useRef(new Set<string>())
  const uploading = progress != null && progress.done + progress.failed < progress.total

  async function addFiles(list: FileList | null) {
    if (!list?.length || uploading) return
    const room = MAX_DRAFT_DOGS - dogs.length
    // The same photo picked twice (same name, size and date) only counts once.
    const images = Array.from(list)
      .filter(isImage)
      .filter((f) => {
        const key = `${f.name}:${f.size}:${f.lastModified}`
        if (seen.current.has(key)) return false
        seen.current.add(key)
        return true
      })
    const files = images.slice(0, Math.max(0, room))
    if (input.current) input.current.value = ''
    setResult(null)
    setError(images.length > files.length ? 'too-many-drafts' : images.length === 0 ? 'no-photos' : null)
    if (!files.length) return
    setProgress({ done: 0, failed: 0, total: files.length })

    // One at a time: easy on a phone's memory and on mobile data. A photo that fails does not stop the rest.
    for (const file of files) {
      try {
        const url = await uploadPhoto(file, 1280)
        const res = await createDraftDog(orgId, url, nameFromFile(file.name))
        if (!res.ok) throw new Error(res.error)
        setDogs((all) => [...all, res.dog])
        setProgress((p) => p && { ...p, done: p.done + 1 })
      } catch (e) {
        seen.current.delete(`${file.name}:${file.size}:${file.lastModified}`)
        if (e instanceof Error && e.message === 'too-many-drafts') setError('too-many-drafts')
        setProgress((p) => p && { ...p, failed: p.failed + 1 })
      }
    }
  }

  function update(id: string, patch: Partial<DraftDog>) {
    setResult(null)
    setDogs((all) => all.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  function remove(id: string) {
    setDogs((all) => all.filter((d) => d.id !== id))
    void deleteDraftDog(id)
  }

  function save(publish: boolean) {
    startSaving(async () => {
      const rows = dogs.map((d) => ({ id: d.id, name: d.name.trim(), sex: d.sex, ageYears: d.ageYears, size: d.size, energy: d.energy, level: d.level }))
      const res = await saveDraftDogs(orgId, rows, publish)
      if (!res.ok) {
        setError(res.error ?? 'generic')
        return
      }
      setError(null)
      setResult({ published: res.published, missingName: res.missingName })
      if (publish) setDogs((all) => all.filter((d) => !d.name.trim()))
    })
  }

  return (
    <div className="stack-l">
      <label
        className={`bulk-drop${uploading ? ' busy' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          void addFiles(e.dataTransfer.files)
        }}
      >
        <input ref={input} type="file" accept="image/*" multiple disabled={uploading} onChange={(e) => void addFiles(e.currentTarget.files)} />
        <Icon name="camera" size={28} />
        <strong>{uploading ? t('uploading', { done: progress.done, total: progress.total }) : t('pick')}</strong>
        <span className="muted small">{t('pickHint', { max: MAX_DRAFT_DOGS })}</span>
      </label>

      {progress && progress.failed > 0 && !uploading ? (
        <p className="notice warn" role="status">
          {t('failed', { n: progress.failed })}
        </p>
      ) : null}
      {error ? (
        <p className="notice danger" role="alert">
          {t.has(`errors.${error}`) ? t(`errors.${error}`, { max: MAX_DRAFT_DOGS }) : tg('errors.generic')}
        </p>
      ) : null}
      {!verified && dogs.length > 0 ? <p className="notice">{t('notVerified')}</p> : null}

      {dogs.length ? (
        <ul className="bulk-grid">
          {dogs.map((d, i) => (
            <li key={d.id} className="bulk-card card">
              <div className="bulk-photo">
                {d.photo ? <img src={d.photo} alt="" /> : null}
                <button type="button" className="chip" onClick={() => remove(d.id)} aria-label={t('remove', { name: d.name || t('dogN', { n: i + 1 }) })}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
              <div className="stack-s">
                <input
                  className="input"
                  value={d.name}
                  onChange={(e) => update(d.id, { name: e.target.value })}
                  maxLength={60}
                  placeholder={t('namePlaceholder')}
                  aria-label={t('nameOf', { n: i + 1 })}
                  aria-invalid={result != null && result.missingName > 0 && !d.name.trim()}
                />
                <div className="choices compact" role="radiogroup" aria-label={tg('myDogs.sex')}>
                  {(['female', 'male'] as const).map((sex) => (
                    <label key={sex} className="choice">
                      <input type="radio" name={`sex-${d.id}`} checked={d.sex === sex} onChange={() => update(d.id, { sex })} />
                      <span>{tg(`dogs.sex.${sex}`)}</span>
                    </label>
                  ))}
                </div>
                <div className="grid-2 tight">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={30}
                    inputMode="numeric"
                    value={d.ageYears ?? ''}
                    onChange={(e) => update(d.id, { ageYears: e.target.value === '' ? null : Math.min(30, Math.max(0, Math.round(Number(e.target.value)))) })}
                    placeholder={t('agePlaceholder')}
                    aria-label={t('age')}
                  />
                  <select className="select" value={d.size} onChange={(e) => update(d.id, { size: e.target.value as DraftDog['size'] })} aria-label={tg('dog.sizeLabel')}>
                    {(['small', 'medium', 'large'] as const).map((v) => (
                      <option key={v} value={v}>
                        {tg('dog.sizeLabel')}: {tg(`dogs.size.${v}`).toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <select className="select" value={d.energy} onChange={(e) => update(d.id, { energy: e.target.value as DraftDog['energy'] })} aria-label={tg('dog.energyLabel')}>
                    {(['calm', 'medium', 'high'] as const).map((v) => (
                      <option key={v} value={v}>
                        {tg('dog.energyLabel')}: {tg(`dogs.energy.${v}`).toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <select className="select" value={d.level} onChange={(e) => update(d.id, { level: e.target.value as DraftDog['level'] })} aria-label={tg('dog.levelLabel')}>
                    {(['starter', 'experienced'] as const).map((v) => (
                      <option key={v} value={v}>
                        {tg(`dogs.level.${v}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <Link href={`/shelter/${orgId}/dogs/${d.id}`} className="link-button small">
                  {t('more')}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : progress == null ? (
        <p className="muted">{t('empty')}</p>
      ) : null}

      {result ? (
        <p className={`notice ${result.published > 0 ? 'success' : ''}`} role="status">
          {result.published > 0 ? t('published', { n: result.published }) : t('saved')}
          {result.missingName > 0 ? ` ${t('missingName', { n: result.missingName })}` : ''}
        </p>
      ) : null}

      {dogs.length ? (
        <div className="bulk-actions">
          <button type="button" className="button primary small grow" disabled={saving || uploading} onClick={() => save(true)}>
            <Icon name="check" size={16} /> {t('publishAll', { n: dogs.filter((d) => d.name.trim()).length })}
          </button>
          <button type="button" className="button secondary small" disabled={saving || uploading} onClick={() => save(false)}>
            {t('save')}
          </button>
        </div>
      ) : null}
      <div>
        <Link href={`/shelter/${orgId}`} className="button ghost">
          {t('done')}
        </Link>
      </div>
    </div>
  )
}
