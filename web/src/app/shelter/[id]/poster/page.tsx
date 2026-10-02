/* eslint-disable @next/next/no-img-element -- photos are Blob URLs or data URLs */
import { and, desc, eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { PrintButton } from '@/components/PrintButton'
import { QrCode } from '@/components/QrCode'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { siteUrl } from '@/lib/site'
import { isOrgMember, requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('poster')
  return { title: t('title'), robots: { index: false } }
}

/** A printable A4 poster for the shelter's notice board: scan the QR code, pick a dog, join a group walk. */
export default async function ShelterPosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await requireOnboarded(`/shelter/${id}/poster`)
  if (!isOrgMember(viewer, id) && !viewer.isAdmin) notFound()
  const db = await getDb()
  const [org] = await db.select().from(s.organization).where(eq(s.organization.id, id))
  if (!org) notFound()
  const [dog] = await db
    .select({ name: s.dog.name, photos: s.dog.photos })
    .from(s.dog)
    .where(and(eq(s.dog.orgId, id), eq(s.dog.status, 'active'), sql`cardinality(${s.dog.photos}) > 0`))
    .orderBy(desc(s.dog.createdAt))
    .limit(1)
  const url = `${siteUrl()}/dogs?org=${org.id}`
  const t = await getTranslations('poster')

  return (
    <div className="stack-l">
      <div className="no-print stack-s">
        <Link href={`/shelter/${org.id}`} className="link-button">
          ← {org.name}
        </Link>
        <h1>{t('title')}</h1>
        <p className="muted">{t('lede')}</p>
        {org.status !== 'verified' ? <p className="notice warn">{t('notVerified')}</p> : null}
        <div className="row">
          <PrintButton label={t('print')} />
        </div>
      </div>

      <article className="poster">
        <header className="poster-head">
          {org.logoUrl ? <img src={org.logoUrl} alt="" className="poster-logo" /> : null}
          <p className="poster-org">{org.name}</p>
        </header>
        <h2 className="poster-title">{t('headline')}</h2>
        {dog?.photos[0] ? <img className="poster-photo" src={dog.photos[0]} alt={dog.name} /> : org.coverUrl ? <img className="poster-photo" src={org.coverUrl} alt="" /> : null}
        <p className="poster-text">{t('text')}</p>
        {org.walkingTimes ? (
          <p className="poster-text">
            <strong>{t('when')}:</strong> {org.walkingTimes}
          </p>
        ) : null}
        <div className="poster-qr">
          <QrCode value={url} label={t('qrLabel')} size={200} />
          <div className="stack-s">
            <p className="poster-cta">{t('cta')}</p>
            <p className="poster-url">{url.replace(/^https?:\/\//, '')}</p>
          </div>
        </div>
        <footer className="poster-foot">{t('footer')}</footer>
      </article>
    </div>
  )
}
