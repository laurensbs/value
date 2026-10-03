import Link from 'next/link'
import { ViewTransition } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'
import { formatDistance } from '@/lib/geo'
import { isNewDog } from '@/lib/nudges'
import type { DogListItem } from '@/server/queries'
import { DogPortrait } from './DogPortrait'
import { EnergyDots } from './EnergyDots'
import { Icon } from './Icon'

export async function DogCard({ item }: { item: DogListItem }) {
  const t = await getTranslations()
  const locale = await getLocale()
  const { dog, host } = item
  return (
    <Link href={`/dogs/${dog.id}`} className="dog-card">
      <span className="portrait-wrap">
        {/* The same name on the dog page: the portrait grows into place when you open a dog. */}
        <ViewTransition name={`dog-${dog.id}`}>
          <DogPortrait dog={dog} decorative />
        </ViewTransition>
        {isNewDog(dog, new Date()) ? <span className="new-sticker">{t('dogs.new')}</span> : null}
      </span>
      <span className="dog-card-body">
        <span className="spread">
          <span className="dog-name">{dog.name}</span>
          {dog.isDemo ? (
            <span className="pill ball">{t('common.example')}</span>
          ) : host.kind === 'shelter' ? (
            <span className="pill blue">
              <Icon name="building" size={13} />
              {t('dogs.fromShelter')}
            </span>
          ) : (
            <span className="pill green">
              <Icon name="home" size={13} />
              {t('dogs.fromOwner')}
            </span>
          )}
        </span>
        <span className="muted small">
          {[dog.breed, dog.ageYears != null ? t('dogs.years', { n: dog.ageYears }) : null].filter(Boolean).join(', ')}
        </span>
        {dog.story ? <span className="hand">{dog.story.length > 90 ? `${dog.story.slice(0, 88)}…` : dog.story}</span> : null}
        <span className="meta">
          <span>
            <Icon name="clock" size={15} />
            {t('common.minutes', { n: dog.walkMinutes })}
          </span>
          <span>
            <Icon name="pin" size={15} />
            {item.distanceM != null ? t('dogs.away', { distance: formatDistance(item.distanceM, locale) }) : dog.city}
          </span>
          <EnergyDots energy={dog.energy} label={t(`dogs.energy.${dog.energy}`)} />
          {dog.level === 'experienced' ? <span className="pill">{t('dogs.level.experienced')}</span> : null}
        </span>
      </span>
    </Link>
  )
}
