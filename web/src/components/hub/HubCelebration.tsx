'use client'

import { useEffect, useRef } from 'react'
import { HubIcon } from './HubIcon'

interface Props {
  /** The new level, when you just went up one. */
  level: { level: number; name: string } | null
  milestones: { id: string; title: string; text: string; xp: number }[]
}

const COLORS = ['var(--ball)', 'var(--grass)', '#e9c46a', '#e07a5f', 'var(--calm)']

/** A short party for a new founder level or milestone. The server already noted it, so it shows once. */
export function HubCelebration({ level, milestones }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialog.current
    if (d && !d.open) d.showModal()
  }, [])

  const shown = milestones.slice(0, 4)
  const title = level ? `Niveau ${level.level}: ${level.name}` : milestones.length > 1 ? `${milestones.length} mijlpalen gehaald` : 'Mijlpaal gehaald'

  return (
    <dialog ref={dialog} className="celebration" aria-labelledby="hub-celebration-title">
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
          {level ? (
            <span className="level-badge big">{level.level}</span>
          ) : (
            <span className="medal ball" style={{ '--size': '96px' } as React.CSSProperties}>
              <HubIcon name="trophy" size={42} />
            </span>
          )}
        </div>
        <h2 id="hub-celebration-title">{title}</h2>
        {level ? <p className="lede">Elke stap telt. Op naar het volgende niveau.</p> : null}
        {shown.length ? (
          <ul className="celebration-medals">
            {shown.map((m) => (
              <li key={m.id}>
                <span className="medal green" style={{ '--size': '64px' } as React.CSSProperties}>
                  <HubIcon name="star" size={28} />
                </span>
                <span>{m.title}</span>
                <span className="muted small">{m.text}</span>
                <span className="hub-xp">+{m.xp}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <form method="dialog">
          <button className="button primary wide" autoFocus>
            Verder
          </button>
        </form>
      </div>
    </dialog>
  )
}
