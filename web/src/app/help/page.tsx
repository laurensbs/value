import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { CONTACT_PATH } from '@/lib/contact'
import { COUNTRIES, COUNTRY_INFO, isCountry } from '@/lib/countries'
import { guessCountry } from '@/lib/guess-country'
import { getViewer } from '@/server/session'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const t = await getTranslations('help')
  return pageMetadata({ path: '/help', title: t('title'), description: t('metaDescription') })
}

const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, '')}`

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const sp = await searchParams
  const viewer = await getViewer()
  const country = isCountry(sp.country) ? sp.country : isCountry(viewer?.profile?.country) ? viewer.profile.country : await guessCountry()
  const info = COUNTRY_INFO[country]
  const t = await getTranslations()

  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        <h1>{t('help.title')}</h1>
        <p className="lede">{t('help.lede')}</p>
      </header>
      <nav className="choices" aria-label={t('common.country')}>
        {COUNTRIES.map((c) => (
          <Link key={c} href={`/help?country=${c}`} className={`chip${c === country ? ' on' : ''}`}>
            {COUNTRY_INFO[c].flag} {t(`common.countries.${c}`)}
          </Link>
        ))}
      </nav>
      <a href={tel(info.emergency)} className="emergency-card">
        <Icon name="phone" size={22} />
        <span>{t('help.emergency', { number: info.emergency })}</span>
      </a>
      <ul className="list">
        {info.helpLines.map((line) => (
          <li key={line.id} className="list-item helpline">
            <div className="grow stack-s">
              <strong>{line.name}</strong>
              <p className="muted small">
                {t(`help.lines.${line.key}`)}
                {line.region ? ` · ${line.region}` : ''}
              </p>
              <div className="row">
                {line.phone ? (
                  <a href={tel(line.phone)} className="button secondary small">
                    <Icon name="phone" size={15} /> {line.phone}
                  </a>
                ) : null}
                <a href={line.url} target="_blank" rel="noopener noreferrer" className="button ghost small">
                  {t('help.website')} ↗
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="notice">{t('help.notTherapy')}</p>
      <section className="card flat stack-s">
        <h2>{t('help.dogTitle')}</h2>
        {info.animalEmergency ? (
          <p>
            {t('help.animalEmergency', { name: info.animalEmergency.name })}
            {info.animalEmergency.phone ? (
              <>
                {' '}
                · <a href={tel(info.animalEmergency.phone)}>{info.animalEmergency.phone}</a>
              </>
            ) : null}
          </p>
        ) : null}
        <p>
          {t('help.lostPets', { name: info.lostPets.name })} ·{' '}
          <a href={info.lostPets.url} target="_blank" rel="noopener noreferrer">
            {info.lostPets.url.replace(/^https?:\/\/(www\.)?/, '')}
          </a>
        </p>
        <p className="muted small">{t('help.police', { number: info.policeNonEmergency })}</p>
      </section>
      <div className="tap-item">
        <p className="muted small">{t('help.contact')}</p>
        <Link href={CONTACT_PATH} className="button ghost small tap">
          {t('help.contactLink')}
        </Link>
      </div>
    </div>
  )
}
