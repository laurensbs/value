import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { DogForm } from '@/components/DogForm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { emptyDog } from '@/server/dog-initial'
import { isOrgMember, requireOnboarded } from '@/server/session'

export default async function NewShelterDogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await requireOnboarded(`/shelter/${id}/dogs/new`)
  if (!isOrgMember(viewer, id) && !viewer.isAdmin) notFound()
  const db = await getDb()
  const [org] = await db.select().from(s.organization).where(eq(s.organization.id, id))
  if (!org) notFound()
  const t = await getTranslations('myDogs')
  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        <p className="eyebrow">{org.name}</p>
        <h1>{t('newTitle')}</h1>
      </header>
      <DogForm initial={{ ...emptyDog(org), provides: ['bags', 'leash'] }} orgId={org.id} cancelHref={`/shelter/${org.id}`} />
    </div>
  )
}
