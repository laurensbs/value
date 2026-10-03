'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, type CSSProperties } from 'react'
import { playSound } from '@/lib/sounds'
import { celebrationSeen } from '@/server/actions/progress'
import { ProgressIcon } from './ProgressIcon'

export interface Celebration {
  level: number
  name: string
  levelUp: boolean
  awards: { key: string; title: string; color: string }[]
}

/**
 * A short, happy moment for a new level or badge, like the iPhone app: shown once, then marked as seen.
 * No pressure and nothing to keep up: just "look what you did".
 */
export function LevelUp({ celebration: c, onDone }: { celebration: Celebration; onDone?: () => void }) {
  const t = useTranslations('progress.celebrate')
  const common = useTranslations('common')
  const ref = useRef<HTMLDialogElement>(null)
  const closed = useRef(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    playSound('levelup')
  }, [])

  function close() {
    if (closed.current) return
    closed.current = true
    ref.current?.close()
    const seen = celebrationSeen(c.level).catch(() => undefined)
    // Move on once it is saved as seen, so the next page (home, after "Klaar") doesn't celebrate it again.
    if (onDone) void seen.then(onDone)
  }

  const heading = c.levelUp ? t('levelUp') : c.awards.length > 1 ? t('newBadges', { n: c.awards.length }) : t('newBadge')

  return (
    <dialog
      ref={ref}
      className="level-up"
      aria-labelledby="level-up-title"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
    >
      <div className="level-up-inner">
        <div className="level-up-burst" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="level-up-paw" style={{ '--i': i } as CSSProperties}>
              <ProgressIcon name="paw" size={18} />
            </span>
          ))}
          <span className="level-up-ball">{c.level}</span>
        </div>
        <p className="level-up-eyebrow" id="level-up-title">
          {heading}
        </p>
        {c.levelUp ? <h2 className="level-up-name">{c.name}</h2> : null}
        {c.awards.length ? (
          <ul className="level-up-awards">
            {c.awards.map((a) => (
              <li key={`${a.key}-${a.title}`}>
                <ProgressIcon name="award" size={20} /> {a.title}
              </li>
            ))}
          </ul>
        ) : null}
        <button type="button" className="button ball big level-up-button" onClick={close} autoFocus>
          {common('continue')}
        </button>
      </div>
    </dialog>
  )
}
