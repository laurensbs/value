import './admin-hub.css'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AdminNav, type AdminNavItem } from '@/components/admin/AdminNav'
import { SignInFirst } from '@/components/admin/SignInFirst'
import { getViewer } from '@/server/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('adminHub')
  return {
    title: { default: t('title'), template: `%s · ${t('title')}` },
    robots: { index: false },
    // One app for all of Beheer: "Zet op beginscherm" on any admin page opens /admin without browser bars.
    manifest: '/admin/manifest.webmanifest',
    appleWebApp: { capable: true, title: 'Beheer', statusBarStyle: 'default' },
  }
}

/**
 * Every admin page (/admin/**, also /admin/marketing): admins only, with the compact section
 * switch on top. Each page still checks for itself (requireAdmin with its own path), because a
 * layout is not run again on every navigation.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  if (!viewer) return <SignInFirst />
  // On ADMIN_EMAILS but not confirmed yet: /admin asks for that first, without the admin sections.
  if (viewer.adminUnconfirmed) return children
  if (!viewer.isAdmin) redirect('/')

  const t = await getTranslations('adminHub.nav')
  const items: AdminNavItem[] = [
    { href: '/admin', label: t('overview'), icon: 'home' },
    { href: '/admin/launch', label: t('launch'), icon: 'flag' },
    { href: '/admin/marketing', label: t('marketing'), icon: 'sparkle' },
    { href: '/admin/moderation', label: t('moderation'), icon: 'shield' },
    { href: '/admin/shelters', label: t('shelters'), icon: 'building' },
    { href: '/admin/tips', label: t('tips'), icon: 'heart' },
    { href: '/admin/numbers', label: t('numbers'), icon: 'chart' },
    { href: '/admin/sources', label: t('sources'), icon: 'users' },
  ]
  return (
    <div className="admin-hub">
      <AdminNav items={items} label={t('label')} />
      {children}
    </div>
  )
}
