'use client'

import { Analytics as VercelAnalytics, type BeforeSendEvent } from '@vercel/analytics/next'

const ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** Campaign tags from the marketing hub's links: the only query parameters that are kept. */
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

/**
 * A campaign tag as it may be counted: short, plain words only. A value that looks like an e-mail
 * address or holds an id is dropped (a hand-made link should never leak someone's details).
 */
function utmValue(value: string): string | null {
  if (value.includes('@') || new RegExp(ID.source, 'i').test(value)) return null
  const clean = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return clean || null
}

/**
 * What Vercel Web Analytics may see of a page view: never admin pages, no query strings (claim
 * links, invite codes, ?next=…) except the utm_* campaign tags, and ids in paths replaced by
 * ":id". Returns null to skip.
 */
export function scrubEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  let url: URL
  try {
    url = new URL(event.url)
  } catch {
    return null
  }
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return null
  const kept = new URLSearchParams()
  for (const key of UTM_KEYS) {
    const value = url.searchParams.get(key)
    const clean = value ? utmValue(value) : null
    if (clean) kept.set(key, clean)
  }
  url.search = kept.toString()
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
