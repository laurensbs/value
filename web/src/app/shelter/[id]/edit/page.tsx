import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ShelterDetailsForm } from '@/components/ShelterTools'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isOrgMember, requireOnboarded } from '@/server/session'
import { orgInitial } from '@/server/shelter'

export async function generateMetadata() {
  const t = await getTranslations('shelter')
  return { title: t('details'), robots: { index: false } }
}

export default async function EditShelterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await requireOnboarded(`/shelter/${id}/edit`)
  if (!isOrgMember(viewer, id) && !viewer.isAdmin) notFound()
  const db = await getDb()
  const [org] = await db.select().from(s.organization).where(eq(s.organization.id, id))
  if (!org) notFound()
  const t = await getTranslations('shelter')
  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        <Link href={`/shelter/${id}`} className="link-button">
          ← {org.name}
        </Link>
        <h1>{t('details')}</h1>
        <p className="muted">{t('detailsLede')}</p>
      </header>
      <ShelterDetailsForm orgId={id} initial={orgInitial(org)} lockIdentity={org.status === 'verified' && !viewer.isAdmin} />
    </div>
  )
}
