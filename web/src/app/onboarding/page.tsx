import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ProfileForm } from '@/components/ProfileForm'
import { adultBirthDateLimit, guessCountry } from '@/lib/guess-country'
import { safeNext } from '@/lib/site'
import { requireViewer } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('onboarding')
  return { title: t('title') }
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string; intent?: string }> }) {
  const params = await searchParams
  const viewer = await requireViewer('/onboarding')
  const intent = params.intent
  const next = safeNext(params.next, intent === 'owner' ? '/my-dogs/new' : intent === 'shelter' ? '/shelter' : '/dogs')
  if (viewer.profile) redirect(viewer.profile.bannedAt ? '/banned' : next)
  const t = await getTranslations('onboarding')

  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        <p className="eyebrow">{t('step')}</p>
        <h1>{t('title')}</h1>
        <p className="lede">{t('lede')}</p>
      </header>
      <ProfileForm
        mode="onboarding"
        next={next}
        maxBirthDate={adultBirthDateLimit()}
        initial={{
          firstName: viewer.name?.split(' ')[0] ?? '',
          birthDate: '',
          country: await guessCountry(),
          city: '',
          lat: null,
          lng: null,
          bio: '',
          experience: 'some',
          phone: '',
          languages: [],
          photoUrl: viewer.image,
          wantsToWalk: intent !== 'owner',
          hasDogs: intent === 'owner',
          pppLicense: false,
        }}
      />
    </div>
  )
}
