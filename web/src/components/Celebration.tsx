'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { MASCOT } from '@/lib/avatar'
import type { BadgeIcon } from '@/lib/progress'
import { celebrationSeen } from '@/server/actions/progress'
import { DogFace } from './DogFace'
import { Medal } from './Medal'

export interface CelebrationAward {
  key: string
  tier: number
  icon: BadgeIcon
  title: string
  color: 'bronze' | 'silver' | 'gold' | 'green' | 'ball'
}

interface Props {
  level: number
  /** The new level's name when someone went up a level, otherwise null. */
  levelUp: string | null
  awards: CelebrationAward[]
}

const COLORS = ['var(--ball)', 'var(--grass)', '#e9c46a', '#e07a5f', 'var(--calm)']

/** A short party for a new level or badge. Shown once: closing it remembers that it was seen. */
export function Celebration({ level, levelUp, awards }: Props) {
  const t = useTranslations('progress.celebrate')
  const dialog = useRef<HTMLDialogElement>(null)
  const done = useRef(false)

  useEffect(() => {
    const d = dialog.current
    if (d && !d.open) d.showModal()
  }, [])

  function seen() {
    if (done.current) return
    done.current = true
    void celebrationSeen(level)
  }

  const shown = awards.slice(0, 4)
  const title = levelUp ? t('levelUp') : awards.length > 1 ? t('newBadges', { n: awards.length }) : t('newBadge')

  return (
    <dialog ref={dialog} className="celebration" aria-labelledby="celebration-title" onClose={seen}>
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <i
            key={i}
            style={
              {
                '--x': `${(i * 37) % 100}%`,
                '--delay': `${(i % 7) * 0.12}s`,
                '--spin': `${(i % 2 ? 1 : -1) * (180 + ((i * 53) % 360))}deg`,
                '--color': COLORS[i % COLORS.length],
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="celebration-body">
        <div className="celebration-hero">
          {levelUp ? <span className="level-badge big">{level}</span> : <DogFace look={MASCOT} size={96} />}
        </div>
        <h2 id="celebration-title">{title}</h2>
        {levelUp ? <p className="lede">{t('levelUpText', { name: levelUp, n: level })}</p> : null}
        {shown.length ? (
          <ul className="celebration-medals">
            {shown.map((a) => (
              <li key={`${a.key}:${a.tier}`}>
                <Medal icon={a.icon} color={a.color} size={64} />
                <span>{a.title}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <form method="dialog" className="stack-s">
          <button className="button primary wide big" autoFocus>
            {t('close')}
          </button>
        </form>
        {awards.length ? (
          <Link href="/progress" className="link-button" onClick={() => dialog.current?.close()}>
            {t('allBadges')}
          </Link>
        ) : null}
      </div>
    </dialog>
  )
}
