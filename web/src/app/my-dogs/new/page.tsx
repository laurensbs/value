import { getTranslations } from 'next-intl/server'
import { DogForm } from '@/components/DogForm'
import { emptyDog } from '@/server/dog-initial'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('myDogs')
  return { title: t('newTitle') }
}

export default async function NewDogPage() {
  const viewer = await requireOnboarded('/my-dogs/new')
  const t = await getTranslations('myDogs')
  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        <h1>{t('newTitle')}</h1>
        <p className="lede">{t('newLede')}</p>
      </header>
      <DogForm initial={emptyDog(viewer.profile)} cancelHref="/my-dogs" />
    </div>
  )
}
