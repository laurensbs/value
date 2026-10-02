'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

/** Shown on every other page while a walk is running, so the walker never loses it. */
export function ActiveWalkBanner({ walkId, dogName, role }: { walkId: string; dogName: string; role: 'walker' | 'watcher' }) {
  const t = useTranslations('walk')
  const pathname = usePathname()
  if (pathname.startsWith('/walk/') || pathname.startsWith('/follow/')) return null
  const href = role === 'walker' ? `/walk/${walkId}` : `/follow/${walkId}`
  return (
    <Link href={href} className="active-walk">
      <span className="live-dot" aria-hidden="true" />
      <span className="grow">{role === 'walker' ? t('activeBanner', { dog: dogName }) : t('watchBanner', { dog: dogName })}</span>
      <strong>{role === 'walker' ? t('activeBack') : t('follow')} →</strong>
    </Link>
  )
}
