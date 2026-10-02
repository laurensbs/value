'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HubIcon, type HubIconName } from './HubIcon'

interface Item {
  href: string
  label: string
  icon: HubIconName
  /** Shown in the bottom tabs on a phone; the rest live under "Meer". */
  tab?: boolean
}

const ITEMS: Item[] = [
  { href: '/hub', label: 'Vandaag', icon: 'sun', tab: true },
  { href: '/hub/plan', label: 'Plan', icon: 'list', tab: true },
  { href: '/hub/partners', label: 'Partners', icon: 'users', tab: true },
  { href: '/hub/mails', label: 'Mails', icon: 'mail', tab: true },
  { href: '/hub/content', label: 'Content', icon: 'video' },
  { href: '/hub/cijfers', label: 'Cijfers', icon: 'chart' },
  { href: '/hub/kosten', label: 'Kosten', icon: 'euro' },
  { href: '/hub/jij', label: 'Jij', icon: 'user' },
]

const MORE = ['/hub/meer', '/hub/content', '/hub/cijfers', '/hub/kosten', '/hub/jij']

function isCurrent(pathname: string, href: string): boolean {
  return href === '/hub' ? pathname === '/hub' : pathname === href || pathname.startsWith(`${href}/`)
}

/** Badges: open follow-ups on Partners. */
export function HubSideNav({ followUps }: { followUps: number }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Hub">
      {ITEMS.map((item) => (
        <Link key={item.href} href={item.href} aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}>
          <HubIcon name={item.icon} size={20} />
          {item.label}
          {item.href === '/hub/partners' && followUps > 0 ? <span className="hub-tab-dot">{followUps}</span> : null}
        </Link>
      ))}
    </nav>
  )
}

export function HubTabs({ followUps }: { followUps: number }) {
  const pathname = usePathname()
  const moreOn = MORE.some((href) => isCurrent(pathname, href))
  return (
    <nav className="hub-tabs" aria-label="Hub">
      {ITEMS.filter((i) => i.tab).map((item) => (
        <Link key={item.href} href={item.href} aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}>
          <HubIcon name={item.icon} />
          {item.label}
          {item.href === '/hub/partners' && followUps > 0 ? <span className="hub-tab-dot">{followUps}</span> : null}
        </Link>
      ))}
      <Link href="/hub/meer" aria-current={moreOn ? 'page' : undefined}>
        <HubIcon name="more" />
        Meer
      </Link>
    </nav>
  )
}
