import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { LandingIcon } from '@/components/landing/LandingIcon'
import { IconTile, type Tone } from '@/components/landing/PageHero'
import { Logo } from '@/components/Logo'
import { JOIN_CHOICES, JOIN_PATH, joinDestination, type JoinChoice } from '@/lib/join'
import { pageMetadata } from '@/lib/seo'
import { isNativeRequest } from '@/server/native'
import { getViewer } from '@/server/session'
import '../landing.css'
import '../join.css'

const LOOK: Record<JoinChoice, { icon: ReactNode; tone: Tone }> = {
  walker: { icon: <LandingIcon name="walk" size={24} />, tone: 'green' },
  owner: { icon: <Icon name="home" size={24} />, tone: 'warm' },
  shelter: { icon: <Icon name="building" size={24} />, tone: 'ball' },
}

export async function generateMetadata() {
  const t = await getTranslations('join')
  // ?bron=poster and the like are views of the same page: the canonical address drops them.
  return pageMetadata({ path: JOIN_PATH, title: t('metaTitle'), description: t('metaDescription') })
}

/**
 * The one short link for posters, WhatsApp, the crowdfunding and the shelters: three choices, each
 * the sign-up that already exists for it. Someone who is signed in goes straight to their next step.
 */
export default async function JoinPage() {
  const viewer = await getViewer()
  if (viewer) redirect(joinDestination(viewer.profile))
  const [t, ta, native] = await Promise.all([getTranslations('join'), getTranslations('auth'), isNativeRequest()])

  return (
    <div className="auth join">
      <div className="auth-card join-card">
        <div className="join-head">
          <Logo size={40} />
          <h1>{t('title')}</h1>
          <p className="muted" id="join-lede">
            {t('lede')}
          </p>
        </div>
        <ul className="join-choices" aria-labelledby="join-lede">
          {JOIN_CHOICES.map((c) => (
            <li key={c.key}>
              <Link href={c.href} className="lp-choice join-choice">
                <IconTile tone={LOOK[c.key].tone} size="s">
                  {LOOK[c.key].icon}
                </IconTile>
                <strong className="join-choice-text">{t(c.key)}</strong>
                <span className="lp-choice-go" aria-hidden="true">
                  <LandingIcon name="chevron" size={20} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {/* Inside the app shell this would be news about itself. */}
        {native ? null : (
          <p className="join-app small">
            <Icon name="phone" size={18} />
            <span>{t('app')}</span>
          </p>
        )}
        <p className="join-login">
          {ta('hasAccount')} <Link href="/login">{ta('login')}</Link>
        </p>
        <p className="join-trust muted small">{t('trust')}</p>
      </div>
    </div>
  )
}
