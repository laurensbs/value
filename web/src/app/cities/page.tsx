import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { Flag } from '@/components/landing/Flag'
import { BEAGLE } from '@/components/landing/looks'
import { PageHero } from '@/components/landing/PageHero'
import { COUNTRIES } from '@/lib/countries'
import { publicCities } from '@/server/cities'
import { pageMetadata } from '@/lib/seo'
import { APP_NAME } from '@/lib/site'
import '../landing.css'

export async function generateMetadata() {
  const t = await getTranslations('cities')
  return pageMetadata({ path: '/cities', title: t('title'), description: t('indexDescription', { app: APP_NAME }) })
}

export default async function CitiesPage() {
  const t = await getTranslations()
  const cities = await publicCities()
  return (
    <div className="stack-l">
      <PageHero
        eyebrow={t('landing.pages.cities')}
        title={t('cities.title')}
        lede={t('cities.lede')}
        art={{ dog: BEAGLE, tone: 'warm', badge: <Icon name="pin" /> }}
      />
      {COUNTRIES.map((country) => {
        const list = cities.filter((c) => c.country === country)
        if (!list.length) return null
        return (
          <section key={country} className="lp-card lp-country-card">
            <h2>
              <Flag country={country} /> {t(`common.countries.${country}`)}
            </h2>
            <div className="choices lp-touch">
              {list.map((c) => (
                <Link key={c.slug} href={`/cities/${c.slug}`} className="chip">
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
