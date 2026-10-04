import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { BROWN, GOLDEN } from '@/components/landing/looks'
import { IconTile, PageHero, type Tone } from '@/components/landing/PageHero'
import { CONTACT_PATH } from '@/lib/contact'
import { loadMarkdown } from '@/lib/content'
import { supportConfig } from '@/lib/support'
import { isNativeRequest } from '@/server/native'
import { getViewer } from '@/server/session'
import { pageMetadata } from '@/lib/seo'
import { APP_NAME } from '@/lib/site'
import '../landing.css'

const HOW: { key: 'meet' | 'adults' | 'shelters' | 'free'; icon: 'users' | 'shield' | 'building' | 'heart'; tone: Tone }[] = [
  { key: 'meet', icon: 'users', tone: 'green' },
  { key: 'adults', icon: 'shield', tone: 'warm' },
  { key: 'shelters', icon: 'building', tone: 'blue' },
  { key: 'free', icon: 'heart', tone: 'rose' },
]

export async function generateMetadata() {
  const t = await getTranslations('about')
  return pageMetadata({ path: '/about', title: t('title'), description: t('metaDescription', { app: APP_NAME }) })
}

/** Who is behind Rondje and why, how it works, and how to share your walks (with consent). */
export default async function AboutPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { preview } = await searchParams
  const t = await getTranslations()
  const locale = await getLocale()
  const cfg = supportConfig()
  const native = await isNativeRequest()
  const story = await loadMarkdown('about', 'story', locale)
  const published = story?.data.published === 'true'
  // The founder's story only appears once he publishes it; admins can preview the draft.
  const showDraft = !published && preview === '1' && Boolean((await getViewer())?.isAdmin)
  const storyHtml = story && (published || showDraft) ? story.html.replace(/<!--[\s\S]*?-->/g, '') : null

  return (
    <div className="narrow-page stack-l">
      <PageHero
        eyebrow={t('about.eyebrow')}
        title={t('about.title')}
        lede={t('about.lede')}
        art={{ dog: GOLDEN, friend: BROWN, tone: 'rose', badge: <Icon name="heart" /> }}
      />

      <section className="lp-card pad stack-s">
        <h2>{t('about.whyTitle')}</h2>
        <p>{t('about.why1')}</p>
        <p>{t('about.why2')}</p>
        <p className="notice small">
          <Icon name="help" size={18} />
          <span>
            {t('about.why3')} <Link href="/help">{t('about.helpLink')}</Link>
          </span>
        </p>
      </section>

      <section className="lp-block">
        <h2>{t('about.howTitle')}</h2>
        <ul className="lp-features">
          {HOW.map((h) => (
            <li key={h.key} className="lp-card lp-feature">
              <IconTile tone={h.tone} size="s">
                <Icon name={h.icon} size={20} />
              </IconTile>
              <p>{t(`about.how.${h.key}`)}</p>
            </li>
          ))}
        </ul>
        <p className="small">
          <Link href="/safety" className="link-button">
            {t('about.safetyLink')} →
          </Link>
        </p>
      </section>

      {storyHtml ? (
        <section className="lp-card pad stack-s about-story">
          {showDraft ? <span className="pill warn">{t('about.draft')}</span> : null}
          {story?.data.title ? <h2>{story.data.title}</h2> : null}
          {story && story.locale !== locale ? <p className="muted small">{t('about.storyFallback')}</p> : null}
          <div className="prose" dangerouslySetInnerHTML={{ __html: storyHtml }} />
          <p className="notice small">
            {t('about.helpLine')} <Link href="/help">{t('about.helpLink')}</Link>
          </p>
        </section>
      ) : (
        <section className="lp-card pad lp-tip">
          <IconTile tone="green">
            <Icon name="leaf" />
          </IconTile>
          <div>
            <h2>{t('about.whoTitle')}</h2>
            <p>{cfg.operator ? t('about.whoOperator', { operator: cfg.operator }) : t('about.who')}</p>
          </div>
        </section>
      )}

      <section className="lp-card pad soft-green stack-s" id="delen">
        <div className="lp-block-title">
          <IconTile tone="ball" size="s">
            <Icon name="camera" size={20} />
          </IconTile>
          <h2>{t('about.shareTitle')}</h2>
        </div>
        <p>{cfg.instagram ? t('about.shareInstagram', { handle: cfg.instagram }) : t('about.share')}</p>
        <ul className="check-list">
          {(['askOwner', 'people', 'noAddress', 'shelterRules', 'repost', 'remove'] as const).map((k) => (
            <li key={k}>
              <Icon name="shield" size={18} /> <span>{t(`about.shareRules.${k}`)}</span>
            </li>
          ))}
        </ul>
        {cfg.instagram ? (
          <div>
            <a href={`https://www.instagram.com/${cfg.instagram}/`} target="_blank" rel="noopener noreferrer" className="button secondary">
              @{cfg.instagram} ↗
            </a>
          </div>
        ) : null}
      </section>

      <section className="lp-card pad stack-s">
        <div className="lp-block-title">
          <IconTile tone="blue" size="s">
            <Icon name="chat" size={20} />
          </IconTile>
          <h2>{t('about.contactTitle')}</h2>
        </div>
        <p>
          {cfg.contactEmail ? (
            <>
              {t('about.contactEmail')} <a href={`mailto:${cfg.contactEmail}`}>{cfg.contactEmail}</a>
            </>
          ) : (
            t('about.contact')
          )}
        </p>
        <div className="row lp-touch">
          <Link href={CONTACT_PATH} className="button ghost small">
            <Icon name="chat" size={16} /> {t('footer.contact')}
          </Link>
          {native ? null : (
            <Link href="/support" className="button ghost small">
              <Icon name="heart" size={16} /> {t('support.title')}
            </Link>
          )}
          <Link href="/suggest" className="button ghost small">
            <Icon name="building" size={16} /> {t('suggest.title')}
          </Link>
        </div>
      </section>
    </div>
  )
}
