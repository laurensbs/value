import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { DogPortrait } from '@/components/DogPortrait'
import { Icon } from '@/components/Icon'
import { PrintButton } from '@/components/PrintButton'
import { QrCode } from '@/components/QrCode'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { dogShareUrl } from '@/lib/invite'
import { siteUrl } from '@/lib/site'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('dogShare')
  return { title: t('posterMetaTitle'), robots: { index: false } }
}

/**
 * A printable poster for the owner's own dog: its photo, what a walk with it is like, and a QR code
 * to its page that counts as the owner's invite. For the supermarket, the library or the porch.
 */
export default async function DogPosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await requireOnboarded(`/my-dogs/${id}/poster`)
  const db = await getDb()
  const [dog] = await db.select().from(s.dog).where(eq(s.dog.id, id))
  // A dog hidden by Rondje can't be put back online by its owner: no poster for it.
  if (!dog || dog.ownerId !== viewer.userId || dog.isDemo || dog.status === 'hidden') notFound()
  const t = await getTranslations()
  const url = dogShareUrl(siteUrl(), viewer.profile.referralCode, dog.id)
  const facts = [dog.breed, dog.ageYears != null ? t('dogs.years', { n: dog.ageYears }) : null, dog.city].filter(Boolean).join(' · ')

  return (
    <div className="stack-l">
      <div className="no-print stack-s">
        <Link href={`/dogs/${dog.id}`} className="link-button">
          ← {dog.name}
        </Link>
        <h1>{t('dogShare.posterTitle', { name: dog.name })}</h1>
        <p className="muted">{t('dogShare.posterLede')}</p>
        {dog.status !== 'active' ? <p className="notice warn">{t('dogShare.posterOffline', { name: dog.name })}</p> : null}
        <p className="muted small">{t('flyer.yourLink')}</p>
        <div className="row">
          <PrintButton label={t('flyer.print')} />
        </div>
      </div>

      <article className="poster">
        <header className="poster-head">
          <p className="poster-org">Rondje</p>
        </header>
        <h2 className="poster-title">{t('dogShare.posterHeadline', { name: dog.name })}</h2>
        <div className="poster-dog">
          <DogPortrait dog={dog} large />
        </div>
        {facts ? <p className="poster-facts">{facts}</p> : null}
        <p className="poster-text">{t('dogShare.posterText', { name: dog.name, minutes: dog.walkMinutes, city: dog.city })}</p>
        <ul className="check-list poster-list">
          {(['one', 'two', 'four'] as const).map((k) => (
            <li key={k}>
              <Icon name="check" size={18} /> <span>{t(`flyer.walker.points.${k}`)}</span>
            </li>
          ))}
        </ul>
        <div className="poster-qr">
          <QrCode value={url} label={t('dogShare.posterQr', { name: dog.name })} size={200} />
          <div className="stack-s">
            <p className="poster-cta">{t('dogShare.posterCta', { name: dog.name })}</p>
            <p className="poster-url">{url.replace(/^https?:\/\//, '')}</p>
          </div>
        </div>
        <footer className="poster-foot">{t('flyer.footer')}</footer>
      </article>
    </div>
  )
}
