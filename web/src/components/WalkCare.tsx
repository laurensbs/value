'use client'

import { useTranslations } from 'next-intl'
import { useRef, useState, useTransition } from 'react'
import { logWalkCare } from '@/server/actions/walks'
import type { CareCounts, CareKind } from '@/server/walks'

const KINDS: { kind: CareKind; label: 'carePee' | 'carePoo' | 'careWater' }[] = [
  { kind: 'pee', label: 'carePee' },
  { kind: 'poo', label: 'carePoo' },
  { kind: 'water', label: 'careWater' },
]

const clamp = (n: number) => Math.min(20, Math.max(0, n))

interface Tap {
  id: number
  kind: CareKind
  delta: 1 | -1
}

/** Taps still on their way, on top of the last counts the server confirmed, applied as the server does. */
function withTaps(confirmed: CareCounts, taps: Tap[]): CareCounts {
  return taps.reduce((care, tap) => ({ ...care, [tap.kind]: clamp(care[tap.kind] + tap.delta) }), confirmed)
}

/** The walker's one-tap report: pee, poo, drink. A small minus takes one back after a mis-tap. */
export function WalkCareButtons({ walkId, dogName, initial }: { walkId: string; dogName: string; initial: CareCounts }) {
  const t = useTranslations('walk')
  // A tap shows at once. Each answer from the server replaces the confirmed counts and settles its
  // own tap; a tap that fails is simply dropped. Quick taps never undo one another that way, and
  // the walker never sees more than the owner does.
  const [confirmed, setConfirmed] = useState(initial)
  const [taps, setTaps] = useState<Tap[]>([])
  const [failed, setFailed] = useState(false)
  const [, start] = useTransition()
  const nextTap = useRef(0)
  const care = withTaps(confirmed, taps)

  function log(kind: CareKind, delta: 1 | -1) {
    const tap: Tap = { id: nextTap.current++, kind, delta }
    setTaps((list) => [...list, tap])
    setFailed(false)
    const settle = () => setTaps((list) => list.filter((other) => other.id !== tap.id))
    start(async () => {
      try {
        const next = await logWalkCare(walkId, kind, delta)
        if (next) setConfirmed(next)
        settle()
      } catch {
        // Out of range: the tap is dropped, and a short note says so.
        settle()
        setFailed(true)
      }
    })
  }

  return (
    <section className="stack-s" aria-label={t('careTitle')} aria-busy={taps.length > 0}>
      <h2 className="small-title">{t('careTitle')}</h2>
      <div className="care-buttons">
        {KINDS.map(({ kind, label }) => (
          <div key={kind} className="care-button">
            <button type="button" className="button secondary" onClick={() => log(kind, 1)} aria-label={`${t(label)}: ${care[kind]}`}>
              <span>{t(label)}</span>
              <strong aria-hidden="true">{care[kind]}</strong>
            </button>
            {care[kind] > 0 ? (
              <button type="button" className="care-undo" onClick={() => log(kind, -1)} aria-label={t('careUndo', { kind: t(label) })}>
                −
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {failed ? (
        <p className="notice warn small" role="status">
          {t('careFailed')}
        </p>
      ) : null}
      <p className="muted small">{t('careHint', { dogName })}</p>
    </section>
  )
}

/** The owner's view of the same report, live during the walk and in the summary afterwards. */
export function WalkCareTally({ care, hideEmpty = false }: { care: CareCounts; hideEmpty?: boolean }) {
  const t = useTranslations('walk')
  const any = care.pee + care.poo + care.water > 0
  if (!any && hideEmpty) return null
  return (
    <section className="stack-s" aria-label={t('careTitle')}>
      <h2 className="small-title">{t('careTitle')}</h2>
      {any ? (
        <ul className="care-tally">
          {KINDS.map(({ kind, label }) => (
            <li key={kind} className={care[kind] ? undefined : 'muted'}>
              <strong>{care[kind]}×</strong> {t(label)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">{t('careNone')}</p>
      )}
    </section>
  )
}
