import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { BulkDogAdd } from '@/components/BulkDogAdd'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isOrgMember, requireOnboarded } from '@/server/session'
import { draftDogs } from '@/server/shelter'

export async function generateMetadata() {
  const t = await getTranslations('bulk')
  return { title: t('title'), robots: { index: false } }
}

export default async function BulkDogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await requireOnboarded(`/shelter/${id}/dogs/bulk`)
  if (!isOrgMember(viewer, id) && !viewer.isAdmin) notFound()
  const db = await getDb()
  const [org] = await db.select().from(s.organization).where(eq(s.organization.id, id))
  if (!org) notFound()
  const t = await getTranslations('bulk')
  return (
    <div className="stack-l">
      <header className="stack-s">
        <Link href={`/shelter/${id}`} className="link-button">
          ← {org.name}
        </Link>
        <h1>{t('title')}</h1>
        <p className="lede">{t('lede')}</p>
      </header>
      <BulkDogAdd orgId={id} initial={await draftDogs(id)} verified={org.status === 'verified'} />
    </div>
  )
}
