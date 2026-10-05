'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { safeNext } from '@/lib/site'

/**
 * Signed out on an admin page: on to the login, with this exact page as "next", so signing in
 * leads back here. Admin pages already do this on the server (requireAdmin with their own path);
 * this covers a page that renders before its own check, and shows a link without JavaScript.
 */
export function SignInFirst() {
  const t = useTranslations('adminHub')
  const pathname = usePathname()
  const router = useRouter()
  const next = safeNext(pathname, '/admin')
  const href = `/login?next=${encodeURIComponent(next)}`
  useEffect(() => {
    router.replace(href)
  }, [router, href])
  return (
    <div className="narrow-page stack">
      <p>
        <Link href={href}>{t('signIn')}</Link>
      </p>
    </div>
  )
}
