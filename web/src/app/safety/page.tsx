import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { COLLIE } from '@/components/landing/looks'
import { IconTile, PageHero } from '@/components/landing/PageHero'
import { ProgressIcon } from '@/components/progress/ProgressIcon'
import { pageMetadata } from '@/lib/seo'
import { liveLocationNow } from '@/server/live-location'
import '../landing.css'

export async function generateMetadata() {
  const t = await getTranslations('safety')
  return pageMetadata({ path: '/safety', title: t('title'), description: t('lede') })
}

export default async function SafetyPage() {
  const [t, live] = await Promise.all([getTranslations(), liveLocationNow()])
  const blocks = [
    // Sharing location during a walk only while live location is on (LIVE_LOCATION); otherwise what is true now.
    { icon: 'route', tone: 'green', title: t('safety.during'), text: t(live ? 'safety.duringText' : 'safety.duringTextOff') },
    { icon: 'chat', tone: 'blue', title: t('safety.after'), text: t('safety.afterText') },
    { icon: 'lock', tone: 'warm', title: t('safety.fraud'), text: t('safety.fraudText') },
    { icon: 'shield', tone: 'green', title: t('safety.liability'), text: t('safety.liabilityText') },
  ] as const

  return (
    <div className="narrow-page stack-l">
      <PageHero
        eyebrow={t('landing.pages.safety')}
        title={t('safety.title')}
        lede={t('safety.lede')}
        art={{ dog: COLLIE, tone: 'green', badge: <Icon name="shield" /> }}
      />
      {/* The Hondenschool: what anyone can do right now, lesson 1 even without an account. */}
      <section className="lp-card soft-green lp-tip lp-touch">
        <IconTile tone="green">
          <ProgressIcon name="school" />
        </IconTile>
        <div>
          <h2>{t('school.title')}</h2>
          <p>{t('safety.schoolText')}</p>
          <div className="row">
            <Link href="/school/hello" className="button primary">
              {t('safety.schoolLink')}
            </Link>
            <Link href="/school" className="button ghost">
              {t('school.toPath')}
            </Link>
          </div>
        </div>
      </section>
      <section className="lp-card pad stack">
        <h2>{t('safety.levels')}</h2>
        <ol className="timeline">
          <li>{t('safety.level1')}</li>
          <li>{t('safety.level2')}</li>
          {/* A walk alone only starts while live location is on (LIVE_LOCATION, lib/rules.ts canRequestSolo). */}
          <li>{t(live ? 'safety.level3' : 'safety.level3Off')}</li>
        </ol>
      </section>
      <div className="safety-grid">
        {blocks.map((b) => (
          <section key={b.title} className="lp-card pad stack-s">
            <IconTile tone={b.tone} size="s">
              <Icon name={b.icon} size={20} />
            </IconTile>
            <h3>{b.title}</h3>
            <p className="small">{b.text}</p>
          </section>
        ))}
      </div>
      <section className="lp-card soft-rose lp-tip">
        <IconTile tone="alert">
          <Icon name="flag" />
        </IconTile>
        <div>
          <h2>{t('safety.report')}</h2>
          <p>{t('safety.reportText')}</p>
        </div>
      </section>
      <nav className="row lp-touch" aria-label={t('footer.terms')}>
        <Link href="/legal/conduct" className="button secondary small">
          {t('footer.conduct')}
        </Link>
        <Link href="/legal/safety" className="button ghost small">
          {t('footer.safety')}
        </Link>
        <Link href="/legal/terms" className="button ghost small">
          {t('footer.terms')}
        </Link>
        <Link href="/help" className="button ghost small">
          {t('nav.helpPill')}
        </Link>
      </nav>
    </div>
  )
}
