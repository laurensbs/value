import { and, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { DogForm } from '@/components/DogForm'
import { DogOwnerActions } from '@/components/DogOwnerActions'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { dogInitial } from '@/server/dog-initial'
import { isOrgMember, requireOnboarded } from '@/server/session'

export default async function EditShelterDogPage({ params }: { params: Promise<{ id: string; dogId: string }> }) {
  const { id, dogId } = await params
  const viewer = await requireOnboarded(`/shelter/${id}/dogs/${dogId}`)
  if (!isOrgMember(viewer, id) && !viewer.isAdmin) notFound()
  const db = await getDb()
  const [dog] = await db.select().from(s.dog).where(and(eq(s.dog.id, dogId), eq(s.dog.orgId, id)))
  if (!dog) notFound()
  const t = await getTranslations('myDogs')
  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        <h1>{t('editTitle', { name: dog.name })}</h1>
        <DogOwnerActions dogId={dog.id} status={dog.status} viewHref={`/dogs/${dog.id}`} allowAdopted />
      </header>
      <DogForm initial={await dogInitial(dog)} orgId={id} cancelHref={`/shelter/${id}`} />
    </div>
  )
}
