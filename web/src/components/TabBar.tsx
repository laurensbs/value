'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from './Icon'

export interface Tab {
  href: string
  label: string
  icon: IconName
  badge?: number
}

/** App-style navigation for signed-in people on phones. */
export function TabBar({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname()
  return (
    <nav className="tabbar" aria-label="App">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined}>
            <Icon name={tab.icon} size={24} />
            <span>{tab.label}</span>
            {tab.badge ? <span className="tab-dot">{tab.badge}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}
