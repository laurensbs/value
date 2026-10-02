import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { adultBirthDateLimit, guessCountry } from '@/lib/guess-country'
import { safeNext } from '@/lib/site'
import { requireViewer } from '@/server/session'
import { OnboardingFlow, type Role } from './OnboardingFlow'

export async function generateMetadata() {
  const t = await getTranslations('onboarding')
  return { title: t('title') }
}

// The defaults the sign-up page passes along when someone was not going anywhere in particular.
// Then the flow picks the start that fits the role they choose (Ontdek, a new dog, the shelter).
const DEFAULT_NEXT = new Set(['/', '/dogs', '/my-dogs/new', '/shelter'])

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string; intent?: string }> }) {
  const params = await searchParams
  const viewer = await requireViewer('/onboarding')
  const target = safeNext(params.next, '')
  const next = target && !DEFAULT_NEXT.has(target) ? target : null
  // Already done: straight on to where they were going, or home (Ontdek).
  if (viewer.profile) redirect(viewer.profile.bannedAt ? '/banned' : (next ?? '/dogs'))
  const intent: Role | null = params.intent === 'owner' ? 'owner' : params.intent === 'shelter' ? 'shelter' : params.intent === 'walker' ? 'walker' : null

  return (
    <OnboardingFlow
      initial={{ firstName: viewer.name?.split(' ')[0] ?? '', country: await guessCountry(), photoUrl: viewer.image }}
      intent={intent}
      next={next}
      maxBirthDate={adultBirthDateLimit()}
    />
  )
}
