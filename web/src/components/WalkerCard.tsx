import { getTranslations } from 'next-intl/server'
import { ageBand, trustBadges, type TrustSignals } from '@/lib/rules'
import { Avatar } from './Avatar'
import { Icon } from './Icon'

export interface WalkerPublic {
  firstName: string
  photoUrl: string | null
  bio: string
  birthDate: string
  city: string
  experience: string
}

/** What an owner or shelter sees about a walker: photo, age band, story and earned trust. */
export async function WalkerCard({ walker, signals }: { walker: WalkerPublic; signals: TrustSignals }) {
  const t = await getTranslations()
  const badges = trustBadges(signals)
  const exp = walker.experience === 'none' ? 'None' : walker.experience === 'lots' ? 'Lots' : 'Some'
  return (
    <div className="walker-card">
      <Avatar name={walker.firstName} src={walker.photoUrl} size="large" />
      <div className="stack-s grow">
        <div>
          <strong className="walker-name">{walker.firstName}</strong>
          <p className="muted small">
            {[t('profile.ageBand', { band: ageBand(walker.birthDate) }), walker.city, t('profile.memberSince', { year: signals.memberSinceYear })].join(' · ')}
          </p>
        </div>
        <ul className="badges">
          {badges.includes('new') ? <li className="pill">{t('requests.newBadge')}</li> : null}
          {badges.includes('id-seen') ? (
            <li className="pill green">
              <Icon name="shield" size={13} /> {t('requests.idChecks', { n: signals.idChecks })}
            </li>
          ) : null}
          {badges.includes('quiz') ? (
            <li className="pill blue">
              <Icon name="check" size={13} /> {t('requests.quizBadge')}
            </li>
          ) : null}
          {signals.walks > 0 ? (
            <li className="pill ball">
              <Icon name="paw" size={13} /> {t('requests.walks', { n: signals.walks })}
            </li>
          ) : null}
          <li className="pill">{t(`onboarding.experience${exp}`)}</li>
        </ul>
        {walker.bio ? <p className="small walker-bio">{walker.bio}</p> : null}
      </div>
    </div>
  )
}
