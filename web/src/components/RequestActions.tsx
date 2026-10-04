'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState, useTransition, type CSSProperties } from 'react'
import { playSound, type SoundName } from '@/lib/sounds'
import { cancelRequest, respondToRequest, setTrust } from '@/server/actions/requests'
import { startWalk } from '@/server/actions/walks'
import { Icon } from './Icon'

type Result = { ok: boolean; error?: string } | void

function useAction() {
  const t = useTranslations('request.reasons')
  const te = useTranslations('errors')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  function run(fn: () => Promise<Result>, sound?: SoundName, onFail?: () => void) {
    setError(null)
    start(async () => {
      let result: Result
      try {
        result = await fn()
      } catch {
        // No connection, or no answer: one plain sentence here instead of the page-wide error (onderzoek §3.8).
        result = { ok: false, error: navigator.onLine ? 'server' : 'offline' }
      }
      if (result && !result.ok) {
        onFail?.()
        const code = result.error ?? 'invalid'
        setError(code === 'offline' || code === 'server' ? te(code) : t.has(code) ? t(code) : t('invalid'))
        playSound('error')
      } else if (sound) playSound(sound)
    })
  }
  return { pending, error, run }
}

/**
 * Requests accepted in this tab. The accepted request is drawn again by the server; when it arrives,
 * AcceptReveal sees it here and opens it as a moment, once. A reload or a later visit stays calm.
 */
const justAccepted = new Set<string>()

export function DecideButtons({ requestId }: { requestId: string }) {
  const t = useTranslations('requests')
  const { pending, error, run } = useAction()
  const [choice, setChoice] = useState<'accept' | 'decline' | null>(null)
  function decide(decision: 'accept' | 'decline') {
    setChoice(decision)
    if (decision === 'accept') justAccepted.add(requestId)
    run(() => respondToRequest(requestId, decision), decision === 'accept' ? 'success' : undefined, () => justAccepted.delete(requestId))
  }
  return (
    <div className="stack-s">
      <div className="decide-buttons">
        <button type="button" className="button primary" disabled={pending} aria-busy={pending && choice === 'accept'} onClick={() => decide('accept')}>
          <Icon name="check" size={18} /> {t('accept')}
        </button>
        <button type="button" className="button ghost" disabled={pending} aria-busy={pending && choice === 'decline'} onClick={() => decide('decline')}>
          {t('decline')}
        </button>
      </div>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/**
 * What an accepted request shows: contact details, what to talk about, trust. Right after the owner
 * said yes in this tab, it opens as a moment (onderzoek §3.4): a warm line, then the contact details
 * slide in (scherm), and the status label changes colour (klein). The sound comes with the answer.
 */
export function AcceptReveal({ requestId, walkerName, children }: { requestId: string; walkerName: string; children: React.ReactNode }) {
  const t = useTranslations('requests')
  const [fresh] = useState(() => justAccepted.has(requestId))
  const note = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (!fresh) return
    justAccepted.delete(requestId)
    // The buttons that had focus are gone: keyboard and screen reader users continue at the news.
    note.current?.focus({ preventScroll: true })
  }, [fresh, requestId])
  return (
    <div className={`accept-reveal stack${fresh ? ' is-new' : ''}`}>
      {fresh ? (
        <p className="accept-note" ref={note} tabIndex={-1}>
          <span className="accept-note-icon" aria-hidden="true">
            <Icon name="check" size={18} />
          </span>
          <span>{t('acceptedNote', { walker: walkerName })}</span>
        </p>
      ) : null}
      {children}
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
      <button type="button" className="button danger small" disabled={pending} aria-busy={pending} onClick={() => run(() => cancelRequest(requestId))}>
        {t('cancel')}
      </button>
      <button type="button" className="button ghost small" onClick={() => setConfirming(false)}>
        {t('keep')}
      </button>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function StartButton({ requestId, enabled, hint }: { requestId: string; enabled: boolean; hint: string }) {
  const t = useTranslations('requests')
  const tw = useTranslations('walk')
  const { pending, error, run } = useAction()
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState<string[]>([])
  // Bags and treats are the owner's (dog.provides); the walker checks what is theirs to check.
  const checks = ['checkLeash', 'checkPhone'] as const
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
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

interface Trust {
  idSeen: boolean
  soloAllowed: boolean
}

/**
 * The trust ladder: first meeting, ID seen, walks on their own (that last rung only for a private
 * owner's dog). Shown small in the form, and as a moment after trust is given: each tick pops 120 ms
 * after the one before (with less motion: fades 150 ms apart).
 */
function TrustSteps({ trust, allowSolo, animate }: { trust: Trust; allowSolo: boolean; animate?: boolean }) {
  const t = useTranslations('requests')
  const rungs = [
    { key: 'meet', label: t('ladderMeet'), done: true },
    { key: 'id', label: t('ladderId'), done: trust.idSeen },
    ...(allowSolo ? [{ key: 'solo', label: t('ladderSolo'), done: trust.soloAllowed }] : []),
  ]
  return (
    <ol className={`trust-steps${animate ? ' animate' : ''}`} role="list" aria-label={t('ladderLabel')}>
      {rungs.map((rung, i) => (
        <li key={rung.key} className={rung.done ? 'done' : undefined} style={{ '--n': i } as CSSProperties}>
          <span className="trust-step-mark" aria-hidden="true">
            {rung.done ? <Icon name="check" size={16} /> : null}
          </span>
          <span>
            {rung.label}
            <span className="visually-hidden">: {rung.done ? t('ladderDone') : t('ladderNotYet')}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Milliseconds from opening the sheet until the last tick has popped: then the success sound, once. */
function lastTickAt(trust: Trust, allowSolo: boolean, reduce: boolean): number {
  const last = allowSolo && trust.soloAllowed ? 2 : trust.idSeen ? 1 : 0
  return reduce ? last * 150 + 200 : last * 120 + 360
}

function TrustLadder({
  trust,
  allowSolo,
  walkerName,
  dogName,
  quizPassed,
  onClose,
}: {
  trust: Trust
  allowSolo: boolean
  walkerName: string
  dogName: string
  quizPassed: boolean
  onClose: () => void
}) {
  const t = useTranslations('requests')
  const id = useId()
  const ref = useRef<HTMLDialogElement>(null)
  const solo = allowSolo && trust.soloAllowed

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => playSound('success'), lastTickAt(trust, allowSolo, reduce))
    return () => window.clearTimeout(timer)
  }, [trust, allowSolo])

  return (
    <dialog ref={ref} className="sheet trust-ladder" aria-labelledby={`${id}-title`} aria-describedby={`${id}-text`} onClose={onClose}>
      <div className="stack">
        <h2 id={`${id}-title`} className="trust-ladder-title">
          {solo ? t('ladderTitleSolo', { walker: walkerName, dog: dogName }) : t('ladderTitleId', { walker: walkerName })}
        </h2>
        <TrustSteps trust={trust} allowSolo={allowSolo} animate />
        <div id={`${id}-text`} className="stack-s trust-ladder-text">
          <p>{solo ? t('ladderTextSolo') : allowSolo ? t('ladderTextId', { walker: walkerName, dog: dogName }) : t('ladderTextShelter')}</p>
          {solo && !quizPassed ? <p className="muted small">{t('ladderQuiz', { walker: walkerName })}</p> : null}
        </div>
        <button type="button" className="button primary big wide" onClick={() => ref.current?.close()} autoFocus>
          {t('ladderClose')}
        </button>
      </div>
    </dialog>
  )
}

export function TrustForm({
  dogId,
  dogName,
  walkerId,
  walkerName,
  initial,
  allowSolo,
  quizPassed,
}: {
  dogId: string
  dogName: string
  walkerId: string
  walkerName: string
  initial: Trust
  allowSolo: boolean
  /** Solo walks are asked for only after the safety quiz: the ladder says so when it is not done yet. */
  quizPassed: boolean
}) {
  const t = useTranslations('requests')
  const { pending, error, run } = useAction()
  const [idSeen, setIdSeen] = useState(initial.idSeen)
  const [solo, setSolo] = useState(initial.soloAllowed)
  // What is saved now: the form compares against it, and the ladder shows it.
  const [saved, setSaved] = useState<Trust>(initial)
  const [ladder, setLadder] = useState<Trust | null>(null)
  const [off, setOff] = useState<'solo' | 'id' | null>(null)
  const title = useRef<HTMLElement>(null)
  const changed = idSeen !== saved.idSeen || solo !== saved.soloAllowed

  function save() {
    const before = saved
    const after = { idSeen, soloAllowed: allowSolo && solo }
    run(async () => {
      const result = await setTrust(dogId, walkerId, after)
      if (!result.ok) return result
      setSaved(after)
      // A rung was added: the ladder, with its sound. Only taken back: one plain sentence, no party.
      if ((after.idSeen && !before.idSeen) || (after.soloAllowed && !before.soloAllowed)) setLadder(after)
      else setOff(before.soloAllowed && !after.soloAllowed ? 'solo' : 'id')
      return result
    })
  }

  return (
    <div className="trust-form stack-s">
      <strong ref={title} tabIndex={-1} className="trust-form-title">
        {t('trustTitle')}
      </strong>
      <TrustSteps trust={saved} allowSolo={allowSolo} />
      <label className="check">
        <input
          type="checkbox"
          checked={idSeen}
          onChange={(e) => {
            setIdSeen(e.target.checked)
            setOff(null)
          }}
        />
        <span>{t('idSeen')}</span>
      </label>
      {allowSolo ? (
        <label className="check">
          <input
            type="checkbox"
            checked={solo}
            onChange={(e) => {
              setSolo(e.target.checked)
              setOff(null)
            }}
          />
          <span>{t('soloAllowed', { name: walkerName, dog: dogName })}</span>
        </label>
      ) : null}
      <div className="row">
        <button type="button" className="button secondary" disabled={pending || !changed} aria-busy={pending} onClick={save}>
          {t('saveTrust')}
        </button>
      </div>
      {off ? (
        <p className="trust-off" role="status">
          {off === 'solo' ? t('trustSoloOff', { walker: walkerName, dog: dogName }) : t('trustIdOff')}
        </p>
      ) : null}
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      {ladder ? (
        <TrustLadder
          trust={ladder}
          allowSolo={allowSolo}
          walkerName={walkerName}
          dogName={dogName}
          quizPassed={quizPassed}
          onClose={() => {
            setLadder(null)
            title.current?.focus({ preventScroll: true })
          }}
        />
      ) : null}
    </div>
  )
}
