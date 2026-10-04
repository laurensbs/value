'use client'

import { usePathname } from 'next/navigation'

// Pages about Rondje itself keep the full footer, also when you are signed in.
const MARKETING = ['/about', '/support', '/safety', '/help', '/legal', '/cities', '/shelters', '/suggest', '/flyer']

export function isMarketingPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/shelter') return true
  return MARKETING.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Signed in, the app pages get a one-line footer instead of the big site footer. None at all
 * where you should not be distracted: during a walk, in the onboarding screens and in a lesson.
 */
export function FooterSwitch({ full, compact }: { full: React.ReactNode; compact: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/walk/') || pathname.startsWith('/follow/') || pathname.startsWith('/onboarding') || pathname.startsWith('/school/')) return null
  return isMarketingPath(pathname) ? full : compact
}
