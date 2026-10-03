'use client'

import Link from 'next/link'
import { playSound } from '@/lib/sounds'

/**
 * A filter as a pill, like in the app. It is a plain link (filters live in the URL, so a list can
 * be shared), keeps the scroll position, and gives the soft "select" sound when it changes.
 */
export function FilterPill({ href, on, children, className = '' }: { href: string; on: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      replace
      aria-current={on ? 'true' : undefined}
      className={`filter-pill${on ? ' on' : ''}${className ? ` ${className}` : ''}`}
      onClick={() => {
        if (!on) playSound('select')
      }}
    >
      {children}
    </Link>
  )
}
