import Link from 'next/link'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { DogTile } from './DogTile'
import { LandingIcon } from './LandingIcon'
import { TRIO } from './looks'
import { IconTile, type Tone } from './PageHero'

interface Choice {
  key: 'walk' | 'owner' | 'both' | 'shelter'
  href: string
  icon: ReactNode
  tone: Tone
}

/** "What brings you here?", like the first question in the iPhone app: each answer leads to its own next step. */
export async function Chooser({ ownerHref, bothHref }: { ownerHref: string; bothHref: string }) {
  const t = await getTranslations('landing.choose')
  const choices: Choice[] = [
    { key: 'walk', href: '/dogs', icon: <LandingIcon name="walk" size={26} />, tone: 'green' },
    { key: 'owner', href: ownerHref, icon: <Icon name="home" size={26} />, tone: 'warm' },
    { key: 'both', href: bothHref, icon: <LandingIcon name="swap" size={26} />, tone: 'blue' },
    { key: 'shelter', href: '/shelter', icon: <Icon name="building" size={26} />, tone: 'ball' },
  ]
  return (
    <section className="lp-choose" aria-labelledby="lp-choose-title">
      <div className="lp-choose-intro">
        <div className="lp-mini-fan" aria-hidden="true">
          {TRIO.map((dog, i) => (
            <span key={dog.tile} className={`n${i}`}>
              <DogTile dog={dog} />
            </span>
          ))}
        </div>
        <h2 id="lp-choose-title" className="lp-h2">
          {t('title')}
        </h2>
        <p className="lp-sub">{t('lede')}</p>
      </div>
      <ul className="lp-choices">
        {choices.map((c) => (
          <li key={c.key}>
            <Link href={c.href} className="lp-choice">
              <IconTile tone={c.tone}>{c.icon}</IconTile>
              <span className="lp-choice-text">
                <strong>{t(`${c.key}.title`)}</strong>
                <span>{t(`${c.key}.text`)}</span>
              </span>
              <span className="lp-choice-go" aria-hidden="true">
                <LandingIcon name="chevron" size={20} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
