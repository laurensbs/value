'use client'

import { Analytics as VercelAnalytics, type BeforeSendEvent } from '@vercel/analytics/next'

const ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/**
 * What Vercel Web Analytics may see of a page view: never admin pages, never query strings
 * (claim links, invite codes, ?next=…), and ids in paths replaced by ":id". Returns null to skip.
 */
export function scrubEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  let url: URL
  try {
    url = new URL(event.url)
  } catch {
    return null
  }
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return null
  url.search = ''
  url.hash = ''
  url.pathname = url.pathname.replace(ID, ':id')
  return { ...event, url: url.toString() }
}

/** Inside the iPhone/Android app shell nothing is counted, so the apps' privacy labels stay as they are. */
function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  if (typeof navigator !== 'undefined' && /\bRondjeApp\b/.test(navigator.userAgent)) return null
  return scrubEvent(event)
}

/**
 * Cookieless page-view counts with Vercel Web Analytics. Counts nothing until Web Analytics is
 * switched on for the project in the Vercel dashboard. Mount once, in the root layout.
 */
export function Analytics() {
  return <VercelAnalytics beforeSend={beforeSend} />
}
