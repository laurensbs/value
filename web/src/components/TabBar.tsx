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

/**
 * The app's floating tab bar for signed-in people on phones: a blurred pill above the bottom
 * edge (and the home indicator), the current tab in a soft pill. On wide screens the header
 * has the same links instead.
 */
export function TabBar({ tabs, label }: { tabs: Tab[]; label: string }) {
  const pathname = usePathname()
  // During a walk the screen is in focus mode: leaving the page would stop the GPS.
  if (pathname.startsWith('/walk/') || pathname.startsWith('/follow/')) return null
  return (
    <nav className="app-tabs" aria-label={label}>
      <div className="app-tabs-inner">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          return (
            <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className="app-tab">
              <span className="app-tab-icon">
                <Icon name={tab.icon} size={24} />
                {tab.badge ? <span className="app-tab-badge">{tab.badge > 9 ? '9+' : tab.badge}</span> : null}
              </span>
              <span className="app-tab-label">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
