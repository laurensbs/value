'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Icon, type IconName } from '@/components/Icon'

export interface AdminNavItem {
  href: string
  label: string
  icon: IconName | 'chart'
}

/** A bar chart, for "Cijfers" (the shared icon set has none). Same stroke style as Icon. */
function ChartIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h16M7 16.5v-5M12 16.5V7M17 16.5v-8" />
    </svg>
  )
}

export function AdminIcon({ name, size = 22 }: { name: AdminNavItem['icon']; size?: number }) {
  return name === 'chart' ? <ChartIcon size={size} /> : <Icon name={name} size={size} />
}

/**
 * The compact section switch on every admin page (/admin/**): pills that scroll sideways on a
 * phone, the current section filled in. Overzicht is only current on /admin itself.
 */
export function AdminNav({ items, label }: { items: AdminNavItem[]; label: string }) {
  const pathname = usePathname()
  const nav = useRef<HTMLElement>(null)
  // On a phone the pills scroll sideways: bring the current one into view (only sideways, never the page).
  useEffect(() => {
    const scroller = nav.current
    const current = scroller?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!scroller || !current || scroller.scrollWidth <= scroller.clientWidth) return
    scroller.scrollLeft = current.offsetLeft - (scroller.clientWidth - current.offsetWidth) / 2
  }, [pathname])
  return (
    <nav ref={nav} className="admin-nav" aria-label={label}>
      <ul>
        {items.map((item) => {
          const current = item.href === '/admin' ? pathname === '/admin' : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <li key={item.href}>
              <Link href={item.href} className="admin-nav-pill" aria-current={current ? 'page' : undefined}>
                <AdminIcon name={item.icon} size={18} />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
