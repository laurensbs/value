import Link from 'next/link'
import { ViewTransition } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'
import { formatDistance } from '@/lib/geo'
import { storyLanguage } from '@/lib/story-language'
import type { DogListItem } from '@/server/queries'
import { Sym } from './discover/Sym'
import { DogPortrait } from './DogPortrait'
import { Icon } from './Icon'

/**
 * A dog as a big, image-first card, like in the iPhone app: the photo or illustrated portrait
 * on its own tint, the distance floating on top, then name, breed, one line of story and pills.
 * `showDistance` is off when we only guess where someone is (then the dog's town is shown).
 */
export async function DogCard({ item, showDistance = true }: { item: DogListItem; showDistance?: boolean }) {
  const t = await getTranslations()
  const locale = await getLocale()
  const { dog, host } = item
  const lang = storyLanguage(dog.story)
  const foreign = lang && lang !== locale ? lang : null
  const languageName = foreign ? new Intl.DisplayNames([locale], { type: 'language' }).of(foreign) : null
  const distance = showDistance && item.distanceM != null ? formatDistance(item.distanceM, locale) : null
  const shelter = host.kind === 'shelter'
  return (
    <Link href={`/dogs/${dog.id}`} className="dcard">
      <span className="dcard-media">
        {/* The same name on the dog page: the portrait grows into place when you open a dog. */}
        <ViewTransition name={`dog-${dog.id}`}>
          <DogPortrait dog={dog} cover />
        </ViewTransition>
        <span className="dcard-float">
          {dog.isDemo ? <span className="dcard-tag">{t('common.example')}</span> : <span />}
          {distance ? (
            <span className="dcard-distance" aria-label={t('dogs.away', { distance })}>
              <Sym name="navigate" size={15} />
              {distance}
            </span>
          ) : (
            <span className="dcard-distance">
              <Icon name="pin" size={15} />
              {dog.city}
            </span>
          )}
        </span>
      </span>
      <span className="dcard-body">
        <span className="dcard-title">
          <span className="dcard-name">{dog.name}</span>
          <span className="dcard-breed">
            {[dog.breed, dog.ageYears != null ? t('dogs.years', { n: dog.ageYears }) : null].filter(Boolean).join(' · ')}
          </span>
          <span className="dcard-host" title={shelter ? host.name || t('dogs.fromShelter') : t('dogs.fromOwner')}>
            <Icon name={shelter ? 'building' : 'home'} size={20} />
            <span className="visually-hidden">{shelter ? t('dogs.fromShelter') : t('dogs.fromOwner')}</span>
          </span>
        </span>
        {dog.story ? (
          <span className="dcard-story" lang={lang ?? undefined}>
            {foreign ? (
              <abbr className="lang-tag" title={t('discover.storyIn', { language: languageName ?? foreign })}>
                {foreign.toUpperCase()}
              </abbr>
            ) : null}
            {dog.story}
          </span>
        ) : null}
        <span className="dcard-pills">
          <span className="pill green">
            <Sym name="bolt" size={14} />
            {t(`dogs.energy.${dog.energy}`)}
          </span>
          <span className="pill blue">
            <Icon name="clock" size={14} />
            {t('common.minutes', { n: dog.walkMinutes })}
          </span>
          {dog.level === 'experienced' ? (
            <span className="pill warn">
              <Sym name="award" size={14} />
              {t('dogs.level.experienced')}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  )
}
