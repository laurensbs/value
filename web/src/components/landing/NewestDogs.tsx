/* eslint-disable @next/next/no-img-element -- photos can be data URLs or Blob URLs */
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { DogFace } from '@/components/DogFace'
import { Icon } from '@/components/Icon'
import { lookFor, tileFor } from '@/lib/avatar'
import type { NewestDog } from '@/lib/newest-dogs'
import { DogTile } from './DogTile'
import { LandingIcon } from './LandingIcon'
import { BEAGLE } from './looks'

/**
 * "Net aangemeld": the newest real dogs, Netherlands first (server/newest-dogs.ts). Never an example
 * dog: until the first real dog is online, one invitation to add a dog instead.
 */
export async function NewestDogs({ dogs }: { dogs: NewestDog[] }) {
  const t = await getTranslations()
  if (!dogs.length) {
    return (
      <section className="lp-card lp-new-empty" aria-labelledby="lp-new-title">
        <span className="lp-new-empty-dog" aria-hidden="true">
          <DogTile dog={BEAGLE} />
        </span>
        <div className="lp-new-empty-copy">
          <h2 id="lp-new-title" className="lp-h3">
            {t('landing.dogs.emptyTitle')}
          </h2>
          <p className="muted">{t('landing.dogs.emptyText')}</p>
          <Link href="/aanmelden?bron=voorpagina" className="button primary lp-cta">
            {t('landing.dogs.emptyCta')}
            <Icon name="arrow" size={18} />
          </Link>
        </div>
      </section>
    )
  }
  return (
    <section className="lp-peek lp-new" aria-labelledby="lp-new-title">
      <div className="lp-section-head row-end">
        <div>
          <h2 id="lp-new-title" className="lp-h2">
            {t('landing.dogs.title')}
          </h2>
          <p className="lp-sub">{t('landing.dogs.lede')}</p>
        </div>
        <Link href="/dogs" className="link-button lp-peek-all">
          {t('landing.dogs.all')} →
        </Link>
      </div>
      <ul className="lp-peek-list">
        {dogs.map((dog) => (
          <li key={dog.id}>
            <Link href={`/dogs/${dog.id}`} className="lp-peek-card">
              <span className="lp-peek-photo" style={{ '--tile': tileFor(dog.id) } as CSSProperties}>
                {dog.photo ? <img src={dog.photo} alt="" loading="lazy" /> : <DogFace look={lookFor(dog)} size={150} />}
                <span className="pill lp-peek-flag lp-peek-host">
                  <Icon name={dog.host === 'shelter' ? 'building' : 'home'} size={13} />
                  {dog.host === 'shelter' ? t('dogs.fromShelter') : t('dogs.fromOwner')}
                </span>
              </span>
              <span className="lp-peek-body">
                <span className="lp-peek-name">
                  <strong>{dog.name}</strong>
                  {dog.breed ? <span className="muted">{dog.breed}</span> : null}
                </span>
                <span className="lp-peek-pills">
                  <span className="pill green">
                    <LandingIcon name="bolt" size={13} />
                    {t(`dogs.energy.${dog.energy}`)}
                  </span>
                  <span className="pill blue">
                    <Icon name="clock" size={13} />
                    {t('common.minutes', { n: dog.walkMinutes })}
                  </span>
                  {dog.city ? (
                    <span className="pill">
                      <Icon name="pin" size={13} />
                      {dog.city}
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
