/* eslint-disable @next/next/no-img-element -- photos can be data URLs or Blob URLs */
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { DogFace } from '@/components/DogFace'
import { Icon } from '@/components/Icon'
import { lookFor, tileFor } from '@/lib/avatar'
import type { DogListItem } from '@/server/queries'
import { LandingIcon } from './LandingIcon'

/** "Who's coming along today?": a few dogs as big cards, like the Discover screen in the app. */
export async function DogPeek({ items }: { items: DogListItem[] }) {
  const t = await getTranslations()
  if (!items.length) return null
  return (
    <section className="lp-peek" aria-labelledby="lp-peek-title">
      <div className="lp-section-head row-end">
        <div>
          <h2 id="lp-peek-title" className="lp-h2">
            {t('landing.dogs.title')}
          </h2>
          <p className="lp-sub">{t('landing.dogs.lede')}</p>
        </div>
        <Link href="/dogs" className="link-button lp-peek-all">
          {t('landing.dogs.all')} →
        </Link>
      </div>
      <ul className="lp-peek-list">
        {items.map(({ dog, host }) => (
          <li key={dog.id}>
            <Link href={`/dogs/${dog.id}`} className="lp-peek-card">
              <span className="lp-peek-photo" style={{ '--tile': tileFor(dog.id) } as CSSProperties}>
                {dog.photos[0] ? <img src={dog.photos[0]} alt="" loading="lazy" /> : <DogFace look={lookFor(dog)} size={150} />}
                {dog.isDemo ? (
                  <span className="pill ball lp-peek-flag">{t('common.example')}</span>
                ) : (
                  <span className="pill lp-peek-flag lp-peek-host">
                    <Icon name={host.kind === 'shelter' ? 'building' : 'home'} size={13} />
                    {host.kind === 'shelter' ? t('dogs.fromShelter') : t('dogs.fromOwner')}
                  </span>
                )}
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
