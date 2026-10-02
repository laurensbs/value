import { getTranslations } from 'next-intl/server'
import { DogFace } from '@/components/DogFace'
import { DogForm } from '@/components/DogForm'
import { MASCOT } from '@/lib/avatar'
import { emptyDog } from '@/server/dog-initial'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('myDogs')
  return { title: t('newTitle') }
}

export default async function NewDogPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const viewer = await requireOnboarded('/my-dogs/new')
  const t = await getTranslations('myDogs')
  // Straight from onboarding, owners start here: Rondje's dog says hello first.
  const welcome = (await searchParams).welcome === '1'
  return (
    <div className="narrow-page stack-l">
      {welcome ? (
        <header className="mascot">
          <DogFace look={MASCOT} size={64} />
          <div className="bubble stack-s">
            <h1>{t('welcomeTitle', { name: viewer.profile.firstName })}</h1>
            <p className="muted">{t('welcomeLede')}</p>
          </div>
        </header>
      ) : (
        <header className="stack-s">
          <h1>{t('newTitle')}</h1>
          <p className="lede">{t('newLede')}</p>
        </header>
      )}
      <DogForm initial={emptyDog(viewer.profile)} cancelHref="/my-dogs" />
    </div>
  )
}
