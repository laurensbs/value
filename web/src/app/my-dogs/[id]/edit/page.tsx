import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { DogForm } from '@/components/DogForm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { dogInitial } from '@/server/dog-initial'
import { requireOnboarded } from '@/server/session'

export default async function EditDogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await requireOnboarded(`/my-dogs/${id}/edit`)
  const db = await getDb()
  const [dog] = await db.select().from(s.dog).where(eq(s.dog.id, id))
  if (!dog || dog.ownerId !== viewer.userId) notFound()
  const t = await getTranslations('myDogs')
  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        <h1>{t('editTitle', { name: dog.name })}</h1>
      </header>
      <DogForm initial={await dogInitial(dog)} cancelHref={`/dogs/${dog.id}`} />
    </div>
  )
}
