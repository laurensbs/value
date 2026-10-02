import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { loadMarkdown } from '@/lib/content'
import { supportConfig } from '@/lib/support'
import { isNativeRequest } from '@/server/native'
import { getViewer } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('about')
  return { title: t('title'), description: t('lede') }
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
      <header className="stack-s">
        <p className="eyebrow">{t('about.eyebrow')}</p>
        <h1>{t('about.title')}</h1>
        <p className="lede">{t('about.lede')}</p>
      </header>

      <section className="stack-s">
        <h2>{t('about.whyTitle')}</h2>
        <p>{t('about.why1')}</p>
        <p>{t('about.why2')}</p>
        <p className="muted">{t('about.why3')}</p>
      </section>

      <section className="stack-s">
        <h2>{t('about.howTitle')}</h2>
        <ul className="check-list">
          {(['meet', 'adults', 'shelters', 'free'] as const).map((k) => (
            <li key={k}>
              <Icon name="check" size={18} /> <span>{t(`about.how.${k}`)}</span>
            </li>
          ))}
        </ul>
        <p className="small">
          <Link href="/safety">{t('about.safetyLink')} →</Link>
        </p>
      </section>

      {storyHtml ? (
        <section className="card stack-s about-story">
          {showDraft ? <span className="pill warn">{t('about.draft')}</span> : null}
          {story?.data.title ? <h2>{story.data.title}</h2> : null}
          {story && story.locale !== locale ? <p className="muted small">{t('about.storyFallback')}</p> : null}
          <div className="prose" dangerouslySetInnerHTML={{ __html: storyHtml }} />
          <p className="notice small">
            {t('about.helpLine')} <Link href="/help">{t('about.helpLink')}</Link>
          </p>
        </section>
      ) : (
        <section className="stack-s">
          <h2>{t('about.whoTitle')}</h2>
          <p>{cfg.operator ? t('about.whoOperator', { operator: cfg.operator }) : t('about.who')}</p>
        </section>
      )}

      <section className="card flat stack-s" id="delen">
        <h2>{t('about.shareTitle')}</h2>
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

      <section className="stack-s">
        <h2>{t('about.contactTitle')}</h2>
        <p>
          {cfg.contactEmail ? (
            <>
              {t('about.contactEmail')} <a href={`mailto:${cfg.contactEmail}`}>{cfg.contactEmail}</a>
            </>
          ) : (
            t('about.contact')
          )}
        </p>
        <div className="row">
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
