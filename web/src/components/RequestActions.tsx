'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { playSound, type SoundName } from '@/lib/sounds'
import { cancelRequest, respondToRequest, setTrust } from '@/server/actions/requests'
import { startWalk } from '@/server/actions/walks'
import { Icon } from './Icon'

function useAction() {
  const t = useTranslations('request.reasons')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  function run(fn: () => Promise<{ ok: boolean; error?: string } | void>, sound?: SoundName) {
    setError(null)
    start(async () => {
      const result = await fn()
      if (result && !result.ok) {
        setError(t.has(result.error ?? '') ? t(result.error ?? 'invalid') : t('invalid'))
        playSound('error')
      } else if (sound) playSound(sound)
    })
  }
  return { pending, error, run }
}

export function DecideButtons({ requestId }: { requestId: string }) {
  const t = useTranslations('requests')
  const { pending, error, run } = useAction()
  return (
    <div className="stack-s">
      <div className="row">
        <button type="button" className="button primary small" disabled={pending} onClick={() => run(() => respondToRequest(requestId, 'accept'), 'success')}>
          <Icon name="check" size={16} /> {t('accept')}
        </button>
        <button type="button" className="button ghost small" disabled={pending} onClick={() => run(() => respondToRequest(requestId, 'decline'))}>
          {t('decline')}
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  )
}

export function CancelButton({ requestId }: { requestId: string }) {
  const t = useTranslations('requests')
  const { pending, error, run } = useAction()
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return (
      <button type="button" className="button ghost small" onClick={() => setConfirming(true)}>
        {t('cancel')}
      </button>
    )
  }
  return (
    <div className="row">
      <span className="small">{t('cancelConfirm')}</span>
      <button type="button" className="button danger small" disabled={pending} onClick={() => run(() => cancelRequest(requestId))}>
        {t('cancel')}
      </button>
      <button type="button" className="button ghost small" onClick={() => setConfirming(false)}>
        {t('keep')}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  )
}

export function StartButton({ requestId, enabled, hint }: { requestId: string; enabled: boolean; hint: string }) {
  const t = useTranslations('requests')
  const tw = useTranslations('walk')
  const { pending, error, run } = useAction()
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState<string[]>([])
  const checks = ['checkLeash', 'checkBags', 'checkPhone'] as const
  const ready = checks.every((c) => checked.includes(c))

  if (!open) {
    return (
      <div className="stack-s">
        <button type="button" className="button primary" disabled={!enabled} onClick={() => setOpen(true)}>
          <Icon name="play" size={18} /> {t('start')}
        </button>
        {!enabled ? <p className="muted small">{hint}</p> : null}
      </div>
    )
  }
  return (
    <div className="card flat stack-s before-walk">
      <strong>{tw('before')}</strong>
      {checks.map((c) => (
        <label key={c} className="check">
          <input
            type="checkbox"
            checked={checked.includes(c)}
            onChange={(e) => setChecked((prev) => (e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)))}
          />
          <span>{tw(c)}</span>
        </label>
      ))}
      <p className="muted small">{tw('locationNote')}</p>
      <div className="row">
        <button type="button" className="button primary" disabled={!ready || pending} aria-busy={pending} onClick={() => run(() => startWalk(requestId))}>
          <Icon name="play" size={18} /> {tw('start')}
        </button>
        <button type="button" className="button ghost small" onClick={() => setOpen(false)}>
          {t('keep')}
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  )
}

export function TrustForm({
  dogId,
  dogName,
  walkerId,
  walkerName,
  initial,
  allowSolo,
}: {
  dogId: string
  dogName: string
  walkerId: string
  walkerName: string
  initial: { idSeen: boolean; soloAllowed: boolean }
  allowSolo: boolean
}) {
  const t = useTranslations('requests')
  const { pending, error, run } = useAction()
  const [idSeen, setIdSeen] = useState(initial.idSeen)
  const [solo, setSolo] = useState(initial.soloAllowed)
  const [saved, setSaved] = useState(false)
  const changed = idSeen !== initial.idSeen || solo !== initial.soloAllowed
  return (
    <div className="trust-form stack-s">
      <strong>{t('trustTitle')}</strong>
      <label className="check">
        <input type="checkbox" checked={idSeen} onChange={(e) => {
            setIdSeen(e.target.checked)
            setSaved(false)
          }} />
        <span>{t('idSeen')}</span>
      </label>
      {allowSolo ? (
        <label className="check">
          <input type="checkbox" checked={solo} onChange={(e) => {
              setSolo(e.target.checked)
              setSaved(false)
            }} />
          <span>{t('soloAllowed', { name: walkerName, dog: dogName })}</span>
        </label>
      ) : null}
      <div className="row">
        <button
          type="button"
          className="button secondary small"
          disabled={pending || !changed || saved}
          onClick={() =>
            run(async () => {
              const result = await setTrust(dogId, walkerId, { idSeen, soloAllowed: solo })
              if (result.ok) setSaved(true)
              return result
            })
          }
        >
          {t('saveTrust')}
        </button>
        {saved ? <span className="pill green">{t('trustSaved')}</span> : null}
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  )
}
