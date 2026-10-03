import { getTranslations } from 'next-intl/server'
import { DogForm } from '@/components/DogForm'
import { emptyDog } from '@/server/dog-initial'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('myDogs')
  return { title: t('newTitle') }
}

export default async function NewDogPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const viewer = await requireOnboarded('/my-dogs/new')
  const t = await getTranslations('myDogs')
  // One question at a time, with Rondje's dog asking. Straight from onboarding, it says hello first.
  const welcome = (await searchParams).welcome === '1'
  return (
    <DogForm
      initial={emptyDog(viewer.profile)}
      cancelHref="/my-dogs"
      stepped
      welcome={welcome ? t('welcomeTitle', { name: viewer.profile.firstName }) : undefined}
    />
  )
}
