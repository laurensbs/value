'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

/**
 * Shown on every other page while a walk is running, so the walker never loses it. "Live meekijken"
 * only for a walk that shares location (`live`, lib/rules.ts walkHasLiveLocation); otherwise the owner
 * or shelter simply opens the walk (the time, the report and the photos).
 */
export function ActiveWalkBanner({ walkId, dogName, role, live }: { walkId: string; dogName: string; role: 'walker' | 'watcher'; live: boolean }) {
  const t = useTranslations('walk')
  const pathname = usePathname()
  if (pathname.startsWith('/walk/') || pathname.startsWith('/follow/')) return null
  const href = role === 'walker' ? `/walk/${walkId}` : `/follow/${walkId}`
  return (
    <Link href={href} className="active-walk">
      <span className="live-dot" aria-hidden="true" />
      <span className="grow">{role === 'walker' ? t('activeBanner', { dog: dogName }) : t('watchBanner', { dog: dogName })}</span>
      <strong>{role === 'walker' ? t('activeBack') : live ? t('follow') : t('followWalk')} →</strong>
    </Link>
  )
}
