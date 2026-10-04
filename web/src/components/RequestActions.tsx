'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState, useSyncExternalStore, useTransition, type CSSProperties } from 'react'
import { playSound, type SoundName } from '@/lib/sounds'
import { cancelRequest, respondToRequest, setTrust } from '@/server/actions/requests'
import { startWalk } from '@/server/actions/walks'
import { ActionError, useActionErrorText } from './ActionError'
import { Icon } from './Icon'

type Result = { ok: boolean; error?: string } | void

function useAction() {
  const errorText = useActionErrorText()
  const [pending, start] = useTransition()
  const [error, setError] = useState<{ code: string; text: string } | null>(null)
  function run<R extends Result>(fn: () => Promise<R>, opts: { sound?: SoundName; onFail?: () => void; onOk?: (result: R) => void } = {}) {
    setError(null)
    start(async () => {
      let result: R | { ok: false; error: string }
      try {
        result = await fn()
      } catch {
        // No connection, or no answer: one plain sentence here instead of the page-wide error (onderzoek §3.8).
        result = { ok: false, error: navigator.onLine ? 'server' : 'offline' }
      }
      if (result && !result.ok) {
        opts.onFail?.()
        const code = result.error ?? 'invalid'
        setError({ code, text: errorText(code) })
        playSound('error')
      } else {
        opts.onOk?.(result as R)
        if (opts.sound) playSound(opts.sound)
      }
    })
  }
  const errorLine = error ? <ActionError code={error.code} text={error.text} /> : null
  return { pending, errorLine, run }
}

/**
 * Requests accepted in this tab. The accepted request is drawn again by the server; when it arrives,
 * AcceptReveal sees it here and opens it as a moment, once. A reload or a later visit stays calm.
 */
const justAccepted = new Set<string>()

/** The request just said no to in this tab: the page says so, and keeps the focus there. */
let declined: { walker: string; dog: string } | null = null
const declinedListeners = new Set<() => void>()
function setDeclined(value: typeof declined) {
  declined = value
  for (const listener of declinedListeners) listener()
}
function subscribeDeclined(listener: () => void) {
  declinedListeners.add(listener)
  return () => declinedListeners.delete(listener)
}

export function DecideButtons({ requestId, walkerName, dogName }: { requestId: string; walkerName: string; dogName: string }) {
  const t = useTranslations('requests')
  const { pending, errorLine, run } = useAction()
  const [choice, setChoice] = useState<'accept' | 'decline' | null>(null)
  function decide(decision: 'accept' | 'decline') {
    setChoice(decision)
    if (decision === 'accept') {
      justAccepted.add(requestId)
      // Only for the answer that is on its way: never as a surprise on a later visit.
      window.setTimeout(() => justAccepted.delete(requestId), 10_000)
    }
    run(() => respondToRequest(requestId, decision), {
      sound: decision === 'accept' ? 'success' : undefined,
      onFail: () => justAccepted.delete(requestId),
      onOk: () => {
        if (decision === 'decline') setDeclined({ walker: walkerName, dog: dogName })
      },
    })
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
      {errorLine}
    </div>
  )
}

/**
 * After "Afwijzen" the request moves out of the list, and with it the button that had focus. This
 * line takes its place at the top: what happened, and that the walker hears it.
 */
export function DeclinedNote() {
  const t = useTranslations('requests')
  const value = useSyncExternalStore(subscribeDeclined, () => declined, () => null)
  const note = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (value) note.current?.focus({ preventScroll: false })
  }, [value])
  // Leaving the page forgets it.
  useEffect(() => () => setDeclined(null), [])
  if (!value) return null
  return (
    <p className="decline-note" ref={note} tabIndex={-1} role="status">
      {t('declinedNote', { walker: value.walker, dog: value.dog })}
    </p>
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
  const { pending, errorLine, run } = useAction()
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
      {errorLine}
    </div>
  )
}

export function StartButton({ requestId, enabled, hint }: { requestId: string; enabled: boolean; hint: string }) {
  const t = useTranslations('requests')
  const tw = useTranslations('walk')
  const { pending, errorLine, run } = useAction()
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
      {errorLine}
    </div>
  )
}

interface Trust {
  idSeen: boolean
  soloAllowed: boolean
}

const sameTrust = (a: Trust, b: Trust) => a.idSeen === b.idSeen && a.soloAllowed === b.soloAllowed

/** What can still stop a solo walk once the owner allowed it (rules.ts canRequestSolo), said in the ladder. */
export type SoloCaveat = 'needs-quiz' | 'experience' | 'ppp-licence' | null

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
            {rung.done ? <Icon name="check" size={14} /> : null}
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
  caveat,
  onClose,
}: {
  trust: Trust
  allowSolo: boolean
  walkerName: string
  dogName: string
  caveat: SoloCaveat
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

  const caveatText =
    caveat === 'needs-quiz'
      ? t('ladderQuiz', { walker: walkerName })
      : caveat === 'experience'
        ? t('ladderExperience', { walker: walkerName, dog: dogName })
        : caveat === 'ppp-licence'
          ? t('ladderPpp', { walker: walkerName, dog: dogName })
          : null

  return (
    <dialog ref={ref} className="sheet trust-ladder" aria-labelledby={`${id}-title`} aria-describedby={`${id}-text`} onClose={onClose}>
      <div className="stack">
        <h2 id={`${id}-title`} className="trust-ladder-title">
          {solo ? t('ladderTitleSolo', { walker: walkerName, dog: dogName }) : t('ladderTitleId', { walker: walkerName })}
        </h2>
        <TrustSteps trust={trust} allowSolo={allowSolo} animate />
        <div id={`${id}-text`} className="stack-s trust-ladder-text">
          <p>{solo ? t('ladderTextSolo') : allowSolo ? t('ladderTextId', { walker: walkerName, dog: dogName }) : t('ladderTextShelter')}</p>
          {solo && caveatText ? <p className="muted small">{caveatText}</p> : null}
        </div>
        <button type="button" className="button primary big wide" onClick={() => ref.current?.close()} autoFocus>
          {t('ladderClose')}
        </button>
      </div>
    </dialog>
  )
}

/**
 * ID seen and walks on their own, for one walker and one dog (one form per pair on the page). What is
 * shown comes from the server; only an edit that is not saved yet lives here, and it is dropped as
 * soon as the server's answer arrives. Walks on their own need the ID seen (besluit 4 okt 2026).
 */
export function TrustForm({
  dogId,
  dogName,
  walkerId,
  walkerName,
  title,
  initial,
  allowSolo,
  caveat,
}: {
  dogId: string
  dogName: string
  walkerId: string
  walkerName: string
  /** Who this is about: the walker and the dog. */
  title: string
  /** The trust stored on the server. */
  initial: Trust
  allowSolo: boolean
  caveat: SoloCaveat
}) {
  const t = useTranslations('requests')
  const { pending, errorLine, run } = useAction()
  // An edit belongs to the stored trust it started from; once the server has something else, it is gone.
  const [draft, setDraft] = useState<{ base: Trust; value: Trust } | null>(null)
  const editing = draft && sameTrust(draft.base, initial) ? draft.value : null
  const value = editing ?? initial
  const changed = editing !== null && !sameTrust(editing, initial)
  const [ladder, setLadder] = useState<Trust | null>(null)
  const [off, setOff] = useState<'solo' | 'id' | null>(null)
  const titleRef = useRef<HTMLElement>(null)
  // Turning the ID off takes walks on their own with it; the form says so before saving.
  const soloDropped = initial.soloAllowed && !value.idSeen

  function edit(next: Trust) {
    setOff(null)
    setDraft({ base: initial, value: next.idSeen ? next : { idSeen: false, soloAllowed: false } })
  }

  function save() {
    const before = initial
    run(() => setTrust(dogId, walkerId, { idSeen: value.idSeen, soloAllowed: allowSolo && value.soloAllowed }), {
      onOk: (result) => {
        const after = result && 'trust' in result && result.trust ? result.trust : value
        // A rung was added: the ladder, with its sound. Only taken back: one plain sentence, no party.
        if ((after.idSeen && !before.idSeen) || (after.soloAllowed && !before.soloAllowed)) setLadder(after)
        else setOff(before.soloAllowed && !after.soloAllowed ? 'solo' : 'id')
      },
    })
  }

  return (
    <div className="trust-form stack-s">
      <strong ref={titleRef} tabIndex={-1} className="trust-form-title">
        {title}
      </strong>
      <TrustSteps trust={initial} allowSolo={allowSolo} />
      <label className="check">
        <input type="checkbox" checked={value.idSeen} onChange={(e) => edit({ ...value, idSeen: e.target.checked })} />
        <span>{t('idSeen')}</span>
      </label>
      {allowSolo ? (
        <>
          <label className={`check${value.idSeen ? '' : ' is-disabled'}`}>
            <input
              type="checkbox"
              checked={value.soloAllowed}
              disabled={!value.idSeen}
              aria-describedby={value.idSeen ? undefined : `${dogId}-${walkerId}-solo-hint`}
              onChange={(e) => edit({ ...value, soloAllowed: e.target.checked })}
            />
            <span>{t('soloAllowed', { name: walkerName, dog: dogName })}</span>
          </label>
          {soloDropped ? (
            <p className="muted small" id={`${dogId}-${walkerId}-solo-hint`}>
              {t('soloOffWithId', { walker: walkerName, dog: dogName })}
            </p>
          ) : !value.idSeen ? (
            <p className="muted small" id={`${dogId}-${walkerId}-solo-hint`}>
              {t('soloNeedsId')}
            </p>
          ) : null}
        </>
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
      {errorLine}
      {ladder ? (
        <TrustLadder
          trust={ladder}
          allowSolo={allowSolo}
          walkerName={walkerName}
          dogName={dogName}
          caveat={caveat}
          onClose={() => {
            setLadder(null)
            titleRef.current?.focus({ preventScroll: true })
          }}
        />
      ) : null}
    </div>
  )
}
