import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { BEAGLE } from '@/components/landing/looks'
import { IconTile, PageHero } from '@/components/landing/PageHero'
import { COUNTRY_INFO } from '@/lib/countries'
import { guessCountry } from '@/lib/guess-country'
import { supportConfig } from '@/lib/support'
import '../landing.css'

export async function generateMetadata() {
  const t = await getTranslations('contact')
  return { title: t('title'), description: t('lede') }
}

const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, '')}`

/**
 * How to reach Rondje (also the support URL for the app stores). The address comes from CONTACT_EMAIL only;
 * without it the page says so honestly and shows what already works: reporting, help lines and the emergency number.
 */
export default async function ContactPage() {
  const t = await getTranslations()
  const { contactEmail } = supportConfig()
  const emergency = COUNTRY_INFO[await guessCountry()].emergency

  return (
    <div className="narrow-page stack-l">
      <PageHero
        eyebrow={t('contact.title')}
        title={t('contact.heading')}
        lede={t('contact.lede')}
        art={{ dog: BEAGLE, tone: 'blue', badge: <Icon name="chat" /> }}
      />

      {contactEmail ? (
        <section className="lp-card pad stack-s">
          <div className="lp-block-title">
            <IconTile tone="blue" size="s">
              <Icon name="chat" size={20} />
            </IconTile>
            <h2>{t('contact.emailTitle')}</h2>
          </div>
          <p>
            <a href={`mailto:${contactEmail}`} className="button secondary tap">
              {contactEmail}
            </a>
          </p>
          <p className="small">{t('contact.emailText')}</p>
        </section>
      ) : (
        <section className="lp-card pad stack-s">
          <div className="lp-block-title">
            <IconTile tone="warm" size="s">
              <Icon name="clock" size={20} />
            </IconTile>
            <h2>{t('contact.soonTitle')}</h2>
          </div>
          <p>{t('contact.soonText')}</p>
        </section>
      )}

      <section className="lp-card pad stack-s">
        <h2>{t('contact.nowTitle')}</h2>
        <ul className="check-list">
          <li>
            <Icon name="flag" size={18} />{' '}
            <span className="tap-item">
              {t('contact.report')}
              <Link href="/safety" className="button ghost small tap">
                {t('landing.pages.safety')}
              </Link>
            </span>
          </li>
          <li>
            <Icon name="help" size={18} />{' '}
            <span className="tap-item">
              {t('contact.help')}
              <Link href="/help" className="button ghost small tap">
                {t('contact.helpLink')}
              </Link>
            </span>
          </li>
          <li>
            <Icon name="building" size={18} />{' '}
            <span className="tap-item">
              {t('contact.suggest')}
              <Link href="/suggest" className="button ghost small tap">
                {t('suggest.title')}
              </Link>
            </span>
          </li>
        </ul>
      </section>

      <a href={tel(emergency)} className="emergency-card">
        <Icon name="phone" size={22} />
        <span>{t('help.emergency', { number: emergency })}</span>
      </a>

      <nav className="row lp-touch" aria-label={t('contact.moreTitle')}>
        <Link href="/legal/privacy" className="button ghost small">
          {t('footer.privacy')}
        </Link>
        <Link href="/legal/terms" className="button ghost small">
          {t('footer.terms')}
        </Link>
        <Link href="/about" className="button ghost small">
          {t('footer.about')}
        </Link>
      </nav>
    </div>
  )
}
