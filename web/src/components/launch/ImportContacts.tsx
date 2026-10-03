'use client'

import { useTranslations } from 'next-intl'
import { useMemo, useState, useTransition } from 'react'
import { Icon } from '@/components/Icon'
import { importContacts, type ImportState } from '@/server/actions/launch'
import type { ContactJson } from './audiences'
import { contactKey, IMPORT_HEADER, MAX_IMPORT_ROWS, parseContactsCsv, type ImportResult, type ImportRow } from './import'

/**
 * "Importeer CSV": paste a CSV or pick a file, see every row checked first, then import the new
 * ones as "te sturen". The server checks everything again; nothing is ever sent from here.
 */
export function ImportContacts({ contacts }: { contacts: ContactJson[] }) {
  const t = useTranslations('launch.import')
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [result, setResult] = useState<ImportState | null>(null)
  const [readError, setReadError] = useState(false)
  const [pending, start] = useTransition()
  const existing = useMemo(() => contacts.map(contactKey), [contacts])

  function check(csv: string) {
    setResult(null)
    setPreview(parseContactsCsv(csv, existing))
  }

  async function pick(file: File | undefined) {
    setReadError(false)
    if (!file) return
    try {
      const csv = await file.text()
      setText(csv)
      check(csv)
    } catch {
      setReadError(true)
    }
  }

  function save() {
    start(async () => {
      const state = await importContacts(text)
      setResult(state)
      if (state.ok) {
        setPreview(null)
        setText('')
      }
    })
  }

  const error = result && !result.ok ? result : preview && !preview.ok ? preview : null
  return (
    <section className="stack launch-import" aria-labelledby="launch-import-title">
      <div className="stack-s">
        <h3 id="launch-import-title">{t('title')}</h3>
        <p className="small">{t('hint')}</p>
        <code className="launch-import-header">{IMPORT_HEADER}</code>
        <p className="muted small">{t('rules', { max: MAX_IMPORT_ROWS })}</p>
      </div>

      <label className="field">
        <span>{t('paste')}</span>
        <textarea
          className="textarea launch-import-text"
          rows={5}
          value={text}
          spellCheck={false}
          placeholder={`${IMPORT_HEADER}\nshelter,Stichting Voorbeeld,Sanne,sanne@voorbeeld.test,,Utrecht,`}
          onChange={(e) => {
            setText(e.target.value)
            setPreview(null)
          }}
        />
      </label>
      <label className="field">
        <span>{t('file')}</span>
        <input className="input" type="file" accept=".csv,text/csv,text/plain" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {readError ? (
        <p className="error-text" role="alert">
          {t('errors.read')}
        </p>
      ) : null}

      <div>
        <button type="button" className="button secondary small" disabled={!text.trim()} onClick={() => check(text)}>
          <Icon name="eye" size={16} /> {t('preview')}
        </button>
      </div>

      {error ? (
        <p className="notice warn small" role="alert">
          {t(`errors.${error.error}`, { rows: error.rows ?? 0, max: MAX_IMPORT_ROWS })}
        </p>
      ) : null}

      {preview?.ok ? (
        <div className="stack-s" aria-live="polite">
          <p className="launch-import-counts small" role="status">
            <span className="pill green">{t('counts.new', { n: preview.counts.new })}</span>
            <span className="pill">{t('counts.duplicate', { n: preview.counts.duplicate })}</span>
            <span className={`pill${preview.counts.invalid ? ' warn' : ''}`}>{t('counts.invalid', { n: preview.counts.invalid })}</span>
          </p>
          <ul className="launch-import-rows" aria-label={t('rowsLabel')}>
            {preview.rows.map((row) => (
              <PreviewRow key={row.line} row={row} />
            ))}
          </ul>
          <div className="row">
            <button type="button" className="button primary small" disabled={pending || preview.counts.new === 0} onClick={save}>
              <Icon name="upload" size={16} /> {preview.counts.new ? t('confirm', { n: preview.counts.new }) : t('nothing')}
            </button>
          </div>
        </div>
      ) : null}

      {result?.ok ? (
        <p className="notice success small" role="status">
          {t('done', { added: result.added })} {result.duplicate || result.invalid ? t('skipped', { duplicate: result.duplicate, invalid: result.invalid }) : null}
        </p>
      ) : null}
    </section>
  )
}

function PreviewRow({ row }: { row: ImportRow }) {
  const t = useTranslations('launch')
  const title = row.status === 'invalid' ? row.raw.organisation || row.raw.name || '—' : row.contact.organisation || row.contact.name
  const details =
    row.status === 'invalid'
      ? [row.raw.audience, row.raw.email, row.raw.city]
      : [row.contact.organisation && row.contact.name ? row.contact.name : '', row.contact.email, row.contact.city]
  return (
    <li className={`launch-import-row is-${row.status}`}>
      <span className="launch-import-line muted small">{t('import.line', { n: row.line })}</span>
      <span className="launch-import-who">
        <strong>{title}</strong>
        <span className="muted small">{details.filter(Boolean).join(' · ')}</span>
      </span>
      <span className="launch-import-state">
        {row.status === 'new' ? (
          <>
            <span className="pill blue">{t(`audience.${row.contact.audience}`)}</span>
            <span className="pill green">{t('import.status.new')}</span>
          </>
        ) : row.status === 'duplicate' ? (
          <span className="pill">{row.existing ? t('import.status.existing') : t('import.status.duplicate')}</span>
        ) : (
          <span className="pill warn">{t(`import.problems.${row.problem}`)}</span>
        )}
      </span>
    </li>
  )
}
