import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { DogTile } from './DogTile'
import { LandingIcon, PawMark } from './LandingIcon'
import { BEAGLE } from './looks'

/** "How it works" as four small illustrated scenes on one dashed walking route. */
export async function HowItWorks() {
  const t = await getTranslations()
  const steps = [
    { n: 1, title: t('landing.how.s1'), text: t('home.how1'), art: <ProfileArt /> },
    { n: 2, title: t('landing.how.s2'), text: t('home.how2'), art: <DogArt /> },
    { n: 3, title: t('landing.how.s3'), text: t('home.how3'), art: <MeetArt /> },
    { n: 4, title: t('landing.how.s4'), text: t('home.how4'), art: <RouteArt /> },
  ]
  return (
    <section className="lp-how" aria-labelledby="lp-how-title">
      <div className="lp-section-head">
        <p className="lp-eyebrow">{t('landing.how.eyebrow')}</p>
        <h2 id="lp-how-title" className="lp-h2">
          {t('home.howTitle')}
        </h2>
      </div>
      <ol className="lp-steps">
        {steps.map((s) => (
          <li key={s.n} className="lp-step">
            <div className={`lp-step-art a${s.n}`} aria-hidden="true">
              {s.art}
              <span className="lp-step-n">{s.n}</span>
            </div>
            <div className="lp-step-text">
              <h3>
                <span className="visually-hidden">{t('landing.how.step', { n: s.n })}: </span>
                {s.title}
              </h3>
              <p>{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function ProfileArt() {
  return (
    <span className="lp-scene profile">
      <span className="lp-mini-card">
        <span className="lp-mini-avatar">
          <Icon name="user" size={22} />
        </span>
        <span className="lp-mini-lines">
          <i />
          <i />
          <i />
        </span>
      </span>
      <span className="lp-scene-dot ball">
        <Icon name="check" size={16} />
      </span>
    </span>
  )
}

function DogArt() {
  return (
    <span className="lp-scene dog">
      <DogTile dog={BEAGLE} className="lp-scene-dog" />
      <span className="lp-scene-dot rose">
        <Icon name="heart" size={16} />
      </span>
    </span>
  )
}

function MeetArt() {
  return (
    <span className="lp-scene meet">
      <span className="lp-meet-people">
        <span className="p1">
          <Icon name="user" size={22} />
        </span>
        <span className="p2">
          <Icon name="user" size={22} />
        </span>
      </span>
      <span className="lp-scene-dot blue">
        <LandingIcon name="idcard" size={16} />
      </span>
    </span>
  )
}

function RouteArt() {
  return (
    <span className="lp-scene route">
      <svg viewBox="0 0 100 100" className="lp-route-loop">
        <path d="M22 70c-8-14-4-34 12-42s30-6 40 4 12 28 2 38-26 12-36 6" />
      </svg>
      <span className="lp-route-paw">
        <PawMark size={18} />
      </span>
      <span className="lp-scene-dot green">
        <Icon name="calendar" size={16} />
      </span>
    </span>
  )
}
