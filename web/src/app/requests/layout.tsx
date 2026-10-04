import type { ReactNode } from 'react'
import { requireOnboarded } from '@/server/session'

/**
 * Sign-in first, before loading.tsx starts the response: a visitor who isn't signed in gets a real
 * redirect (307) to the login page. The viewer is cached, so the page doesn't look it up again.
 */
export default async function Layout({ children }: { children: ReactNode }) {
  await requireOnboarded('/requests')
  return children
}
