import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { PrintButton } from '@/components/PrintButton'
import { QrCode } from '@/components/QrCode'
import { Wordmark } from '@/components/Wordmark'
import { inviteUrl } from '@/lib/invite'
import { APP_NAME, siteUrl } from '@/lib/site'
import { getViewer } from '@/server/session'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const t = await getTranslations('flyer')
  return pageMetadata({ path: '/flyer', title: t('title'), description: t('lede') })
}

/**
 * A printable flyer for the neighbourhood: one for dog owners (and their families), one for walkers.
 * Signed-in people get their own invite link in the QR code, so sign-ups count for them.
 */
export default async function FlyerPage({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  const sp = await searchParams
  const audience = sp.for === 'walker' ? 'walker' : 'owner'
  const viewer = await getViewer()
  const t = await getTranslations('flyer')
  const code = viewer?.profile?.referralCode
  const url = code
    ? inviteUrl(siteUrl(), code, audience === 'owner' ? 'owner' : undefined)
    : `${siteUrl()}/signup${audience === 'owner' ? '?intent=owner' : ''}`

  return (
    <div className="stack-l">
      <div className="no-print stack-s">
        <h1>{t('title')}</h1>
        <p className="muted">{t('lede')}</p>
        <nav className="choices" aria-label={t('title')}>
          <Link href="/flyer?for=owner" className={`chip${audience === 'owner' ? ' on' : ''}`} aria-current={audience === 'owner' ? 'page' : undefined}>
            <Icon name="home" size={15} /> {t('tabs.owner')}
          </Link>
          <Link href="/flyer?for=walker" className={`chip${audience === 'walker' ? ' on' : ''}`} aria-current={audience === 'walker' ? 'page' : undefined}>
            <Icon name="paw" size={15} /> {t('tabs.walker')}
          </Link>
        </nav>
        <p className="small">{t('where')}</p>
        {code ? <p className="muted small">{t('yourLink')}</p> : null}
        <div className="row">
          <PrintButton label={t('print')} />
        </div>
      </div>

      <article className="poster">
        <header className="poster-head">
          <p className="poster-org">
            <Wordmark label={APP_NAME} />
          </p>
        </header>
        <h2 className="poster-title">{t(`${audience}.headline`)}</h2>
        <p className="poster-text">{t(`${audience}.text`)}</p>
        <ul className="check-list poster-list">
          {(['one', 'two', 'three', 'four'] as const).map((k) => (
            <li key={k}>
              <Icon name="check" size={18} /> <span>{t(`${audience}.points.${k}`)}</span>
            </li>
          ))}
        </ul>
        {audience === 'owner' ? <p className="poster-text">{t('owner.family')}</p> : null}
        <div className="poster-qr">
          <QrCode value={url} label={t('qrLabel')} size={200} />
          <div className="stack-s">
            <p className="poster-cta">{t(`${audience}.cta`)}</p>
            <p className="poster-url">{url.replace(/^https?:\/\//, '')}</p>
          </div>
        </div>
        <footer className="poster-foot">{t('footer')}</footer>
      </article>
    </div>
  )
}
