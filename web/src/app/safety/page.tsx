import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'

export async function generateMetadata() {
  const t = await getTranslations('safety')
  return { title: t('title'), description: t('lede') }
}

export default async function SafetyPage() {
  const t = await getTranslations()
  const blocks = [
    { icon: 'route', title: t('safety.during'), text: t('safety.duringText') },
    { icon: 'chat', title: t('safety.after'), text: t('safety.afterText') },
    { icon: 'lock', title: t('safety.fraud'), text: t('safety.fraudText') },
    { icon: 'shield', title: t('safety.liability'), text: t('safety.liabilityText') },
  ] as const

  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        <h1>{t('safety.title')}</h1>
        <p className="lede">{t('safety.lede')}</p>
      </header>
      <section className="stack">
        <h2>{t('safety.levels')}</h2>
        <ol className="timeline">
          <li>{t('safety.level1')}</li>
          <li>{t('safety.level2')}</li>
          <li>{t('safety.level3')}</li>
        </ol>
      </section>
      <div className="safety-grid">
        {blocks.map((b) => (
          <section key={b.title} className="card stack-s">
            <Icon name={b.icon} />
            <h3>{b.title}</h3>
            <p className="small">{b.text}</p>
          </section>
        ))}
      </div>
      <section className="card flat stack-s">
        <h2>{t('safety.report')}</h2>
        <p>{t('safety.reportText')}</p>
      </section>
      <nav className="row" aria-label={t('footer.terms')}>
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
