import Link from 'next/link'
import type { ReactNode } from 'react'
import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { factsFor, impact, sourceHost, text, TOPICS, type Topic } from '@/components/impact/facts'
import { ImpactStat } from '@/components/impact/ImpactStat'
import { LandingIcon } from '@/components/landing/LandingIcon'
import { BEAGLE, GOLDEN } from '@/components/landing/looks'
import { IconTile, PageHero, type Tone } from '@/components/landing/PageHero'
import { COUNTRY_INFO } from '@/lib/countries'
import { guessCountry } from '@/lib/guess-country'
import { APP_NAME } from '@/lib/site'
import { isNativeRequest } from '@/server/native'
import '../landing.css'
import '../impact.css'

const TOPIC_LOOK: Record<Topic, { icon: ReactNode; tone: Tone }> = {
  people: { icon: <Icon name="users" size={20} />, tone: 'blue' },
  outside: { icon: <LandingIcon name="walk" size={20} />, tone: 'green' },
  dogs: { icon: <Icon name="paw" size={20} />, tone: 'warm' },
}

export async function generateMetadata() {
  const t = await getTranslations('impact.page')
  return { title: t('title'), description: t('lede', { app: APP_NAME }) }
}

/** Why a walk together matters: checked numbers with sources, a calm word on wellbeing, the dogs, and what you can do. */
export default async function WhyPage() {
  const t = await getTranslations()
  const locale = await getLocale()
  const format = await getFormatter()
  const native = await isNativeRequest()
  // The suicide prevention line of the visitor's country, always in view on a page about how people feel.
  const country = await guessCountry()
  const lines = COUNTRY_INFO[country].helpLines.filter((l) => l.key === 'suicide')
  const checked = format.dateTime(new Date(impact.checked), { day: 'numeric', month: 'long', year: 'numeric' })

  const DO: { key: 'walk' | 'dog' | 'tip' | 'support'; href: string; icon: ReactNode; tone: Tone }[] = [
    { key: 'walk', href: '/dogs', icon: <LandingIcon name="walk" size={20} />, tone: 'green' },
    { key: 'dog', href: '/signup?intent=owner', icon: <Icon name="home" size={20} />, tone: 'warm' },
    { key: 'tip', href: '/suggest', icon: <Icon name="building" size={20} />, tone: 'blue' },
    ...(native ? [] : [{ key: 'support' as const, href: '/support', icon: <Icon name="heart" size={20} />, tone: 'rose' as const }]),
  ]

  return (
    <div className="narrow-page stack-l im-page">
      <PageHero
        eyebrow={t('impact.page.eyebrow')}
        title={t('impact.page.title')}
        lede={t('impact.page.lede', { app: APP_NAME })}
        art={{ dog: GOLDEN, friend: BEAGLE, tone: 'green', badge: <Icon name="leaf" /> }}
      />

      <section className="stack" aria-labelledby="im-facts-title">
        <div className="stack-s">
          <h2 id="im-facts-title">{t('impact.page.factsTitle')}</h2>
          <p className="muted">{t('impact.page.factsLede')}</p>
        </div>
        {TOPICS.map((topic) => {
          const facts = factsFor(topic)
          if (!facts.length) return null
          return (
            <div key={topic} className="stack-s">
              <h3 className="lp-block-title im-topic-title">
                <IconTile tone={TOPIC_LOOK[topic].tone} size="s">
                  {TOPIC_LOOK[topic].icon}
                </IconTile>
                {t(`impact.topics.${topic}`)}
              </h3>
              <ul className="im-stats wide">
                {facts.map((f) => (
                  <ImpactStat key={f.id} fact={f} locale={locale} sourceLabel={t('impact.source', { name: f.source.name, year: String(f.year) })} />
                ))}
              </ul>
            </div>
          )
        })}
      </section>

      <section className="lp-card pad soft-blue stack-s" aria-labelledby="im-mind-title">
        <div className="lp-block-title">
          <IconTile tone="blue" size="s">
            <Icon name="sun" size={20} />
          </IconTile>
          <h2 id="im-mind-title">{t('impact.page.mindTitle')}</h2>
        </div>
        <p>{t('impact.page.mind1')}</p>
        <p>{t('impact.page.mind2', { app: APP_NAME })}</p>
        <div className="notice small im-help">
          <Icon name="help" size={18} />
          <div className="stack-s">
            <p>{t('impact.page.notCare', { app: APP_NAME })}</p>
            {lines.length ? (
              <p>
                {t('impact.page.suicideLines')}{' '}
                {lines.map((l, i) => (
                  <span key={l.id}>
                    {i > 0 ? ' · ' : null}
                    {l.phone ? (
                      <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} className="im-help-line">
                        {t('impact.page.helpLine', { name: l.name, phone: l.phone })}
                      </a>
                    ) : (
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="im-help-line">
                        {l.name}
                      </a>
                    )}
                  </span>
                ))}
              </p>
            ) : null}
            <p>
              <Link href={`/help?country=${country}`}>{t('impact.page.helpAll')} →</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="lp-card pad stack-s" aria-labelledby="im-dogs-title">
        <div className="lp-block-title">
          <IconTile tone="warm" size="s">
            <Icon name="paw" size={20} />
          </IconTile>
          <h2 id="im-dogs-title">{t('impact.page.dogsTitle')}</h2>
        </div>
        <p>{t('impact.page.dogs1')}</p>
        <p>{t('impact.page.dogs2', { app: APP_NAME })}</p>
        <p>{t('impact.page.dogs3', { app: APP_NAME })}</p>
        <p className="small">
          <Link href="/safety" className="link-button">
            {t('impact.page.safetyLink')} →
          </Link>
        </p>
      </section>

      <section className="stack" aria-labelledby="im-do-title">
        <h2 id="im-do-title">{t('impact.page.doTitle')}</h2>
        <ul className="benefits im-do">
          {DO.map((d) => (
            <li key={d.key} className="lp-card pad">
              <IconTile tone={d.tone} size="s">
                {d.icon}
              </IconTile>
              <h3>{t(`impact.page.do.${d.key}.title`)}</h3>
              <p className="muted small">{t(`impact.page.do.${d.key}.text`, { app: APP_NAME })}</p>
              <Link href={d.href} className="link-button small">
                {t(`impact.page.do.${d.key}.link`)} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="stack-s im-sources" aria-labelledby="im-sources-title">
        <h2 id="im-sources-title">{t('impact.page.sourcesTitle')}</h2>
        <p className="muted small">{t('impact.page.sourcesLede', { date: checked })}</p>
        <ol>
          {impact.facts.map((f) => (
            <li key={f.id}>
              <span>
                <strong>{text(f.value, locale)}</strong> {text(f.label, locale)}
              </span>
              <span className="muted small">
                <a href={f.source.url} target="_blank" rel="noopener noreferrer">
                  {f.source.name}
                </a>{' '}
                ({f.year}) · {sourceHost(f.source.url)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
