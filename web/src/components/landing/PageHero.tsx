import type { ReactNode } from 'react'
import { DogTile } from './DogTile'
import type { TiledLook } from './looks'

export type Tone = 'green' | 'blue' | 'warm' | 'ball' | 'rose' | 'alert'

interface Art {
  dog: TiledLook
  /** A second dog peeking out behind the first one. */
  friend?: TiledLook
  /** The icon on the little badge tile. */
  badge: ReactNode
  tone: Tone
}

/** A page header in the app's style: title and lede, with a small illustrated scene next to it. */
export function PageHero({
  eyebrow,
  title,
  lede,
  art,
  children,
}: {
  eyebrow?: string
  title: string
  lede?: string
  art: Art
  children?: ReactNode
}) {
  return (
    <header className="lp-page-hero">
      <div className="lp-page-hero-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
        {children}
      </div>
      <HeroArt {...art} />
    </header>
  )
}

export function HeroArt({ dog, friend, badge, tone }: Art) {
  return (
    <div className="lp-art-scene" aria-hidden="true">
      <svg className="lp-ring mini" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="88" className="lp-ring-fill" />
        <circle cx="100" cy="100" r="95" className="lp-ring-dash" pathLength="100" />
      </svg>
      {friend ? (
        <span className="lp-scene-card friend">
          <DogTile dog={friend} />
        </span>
      ) : null}
      <span className="lp-scene-card lead">
        <span className="lp-float">
          <DogTile dog={dog} />
        </span>
      </span>
      <span className={`lp-scene-badge lp-tone-${tone}`}>{badge}</span>
    </div>
  )
}

/** A round-cornered square with an icon, in one of the soft app colours. */
export function IconTile({ tone, children, size = 'm' }: { tone: Tone; children: ReactNode; size?: 's' | 'm' | 'l' }) {
  return (
    <span className={`lp-icon-tile ${size} lp-tone-${tone}`} aria-hidden="true">
      {children}
    </span>
  )
}
