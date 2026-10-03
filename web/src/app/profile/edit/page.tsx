import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ProfileForm } from '@/components/ProfileForm'
import { isCountry } from '@/lib/countries'
import { adultBirthDateLimit } from '@/lib/guess-country'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('profile')
  return { title: t('edit') }
}

export default async function EditProfilePage() {
  const viewer = await requireOnboarded('/profile/edit')
  const p = viewer.profile
  const t = await getTranslations('profile')
  return (
    <div className="narrow-page stack-l">
      <header className="stack-s">
        <Link href="/profile" className="link-button">
          ← {t('title')}
        </Link>
        <h1>{t('edit')}</h1>
      </header>
      <ProfileForm
        mode="edit"
        maxBirthDate={adultBirthDateLimit()}
        initial={{
          firstName: p.firstName,
          birthDate: p.birthDate,
          country: isCountry(p.country) ? p.country : 'NL',
          city: p.city,
          lat: p.lat,
          lng: p.lng,
          bio: p.bio,
          experience: (p.experience as 'none' | 'some' | 'lots') ?? 'some',
          phone: p.phone ?? '',
          languages: p.languages,
          photoUrl: p.photoUrl,
          wantsToWalk: p.wantsToWalk,
          hasDogs: p.hasDogs,
          weeklyGoal: p.weeklyGoal ?? null,
          pppLicense: p.pppLicense,
        }}
      />
    </div>
  )
}
