'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { logWalkCare, type CareCounts, type CareKind } from '@/server/actions/walks'

const KINDS: { kind: CareKind; label: 'carePee' | 'carePoo' | 'careWater' }[] = [
  { kind: 'pee', label: 'carePee' },
  { kind: 'poo', label: 'carePoo' },
  { kind: 'water', label: 'careWater' },
]

/** The walker's one-tap report: pee, poo, drink. A small minus takes one back after a mis-tap. */
export function WalkCareButtons({ walkId, dogName, initial }: { walkId: string; dogName: string; initial: CareCounts }) {
  const t = useTranslations('walk')
  const [care, setCare] = useState(initial)
  const [, start] = useTransition()

  function log(kind: CareKind, delta: 1 | -1) {
    // Show the tap at once; the server's answer settles the real count.
    setCare((c) => ({ ...c, [kind]: Math.min(20, Math.max(0, c[kind] + delta)) }))
    start(async () => {
      const next = await logWalkCare(walkId, kind, delta)
      if (next) setCare(next)
    })
  }

  return (
    <section className="stack-s" aria-label={t('careTitle')}>
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
      <p className="muted small">{t('careHint', { dogName })}</p>
    </section>
  )
}

/** The owner's view of the same report, live during the walk and in the summary afterwards. */
export function WalkCareTally({ care }: { care: CareCounts }) {
  const t = useTranslations('walk')
  const any = care.pee + care.poo + care.water > 0
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
