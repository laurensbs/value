import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { COUNTRIES, COUNTRY_INFO } from '@/lib/countries'
import { publicCities } from '@/server/cities'

export async function generateMetadata() {
  const t = await getTranslations('cities')
  return { title: t('title'), description: t('lede') }
}

export default async function CitiesPage() {
  const t = await getTranslations()
  const cities = await publicCities()
  return (
    <div className="stack-l">
      <header className="stack-s">
        <h1>{t('cities.title')}</h1>
        <p className="lede">{t('cities.lede')}</p>
      </header>
      {COUNTRIES.map((country) => {
        const list = cities.filter((c) => c.country === country)
        if (!list.length) return null
        return (
          <section key={country} className="stack-s">
            <h2>
              {COUNTRY_INFO[country].flag} {t(`common.countries.${country}`)}
            </h2>
            <div className="choices">
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
