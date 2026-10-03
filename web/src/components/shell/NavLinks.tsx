'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** The header links on wide screens, with the current page marked (the tab bar does this on phones). */
export function NavLinks({ links, label }: { links: { href: string; label: string }[]; label: string }) {
  const pathname = usePathname()
  return (
    <nav className="nav" aria-label={label}>
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <Link key={link.href} href={link.href} aria-current={active ? 'page' : undefined}>
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
