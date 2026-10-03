import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { DogTile } from './DogTile'
import { PawMark } from './LandingIcon'
import { TRIO } from './looks'

/** The hero picture: three tilted dog cards on a dashed walking route, as on the app's welcome screen. */
export async function DogStage() {
  const t = await getTranslations('landing.stage')
  return (
    <div className="lp-stage" aria-hidden="true">
      <svg className="lp-ring" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="88" className="lp-ring-fill" />
        <circle cx="100" cy="100" r="95" className="lp-ring-dash" pathLength="100" />
      </svg>
      <span className="lp-paw-badge">
        <PawMark size={26} />
      </span>
      <div className="lp-fan">
        {TRIO.map((dog, i) => (
          <span key={dog.tile} className={`lp-fan-card n${i}`}>
            <span className="lp-float">
              <DogTile dog={dog} />
            </span>
          </span>
        ))}
      </div>
      <span className="lp-chip lp-chip-a">
        <Icon name="leaf" size={16} />
        {t('calm')}
      </span>
      <span className="lp-chip lp-chip-b">
        <span className="lp-chip-dot">
          <PawMark size={13} />
        </span>
        {t('goodWalk')}
      </span>
    </div>
  )
}
