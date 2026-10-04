import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { COLLIE } from '@/components/landing/looks'
import { IconTile, PageHero } from '@/components/landing/PageHero'
import { pageMetadata } from '@/lib/seo'
import '../landing.css'

export async function generateMetadata() {
  const t = await getTranslations('safety')
  return pageMetadata({ path: '/safety', title: t('title'), description: t('lede') })
}

export default async function SafetyPage() {
  const t = await getTranslations()
  const blocks = [
    { icon: 'route', tone: 'green', title: t('safety.during'), text: t('safety.duringText') },
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
      <section className="lp-card pad stack">
        <h2>{t('safety.levels')}</h2>
        <ol className="timeline">
          <li>{t('safety.level1')}</li>
          <li>{t('safety.level2')}</li>
          <li>{t('safety.level3')}</li>
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
