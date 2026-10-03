'use client'

import { useEffect } from 'react'
import { isNativeApp } from '@/lib/native'

/**
 * Registers Rondje's service worker (public/sw.js) for everyone, not only for push, so a page
 * opened without a connection shows Rondje's own offline page instead of the browser's error.
 * It tells the worker the language Rondje is used in, for that offline page.
 */
export function OfflineReady({ lang }: { lang: string }) {
  useEffect(() => {
    if (isNativeApp() || !('serviceWorker' in navigator)) return
    const register = async () => {
      try {
        const reg = (await navigator.serviceWorker.getRegistration('/')) ?? (await navigator.serviceWorker.register('/sw.js', { scope: '/' }))
        const worker = reg.active ?? reg.waiting ?? reg.installing
        worker?.postMessage({ type: 'lang', lang })
      } catch {
        // Not allowed here (a private window, an in-app browser): the browser's own page then.
      }
    }
    // Once the page has settled, so it never competes with what someone came for.
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(() => void register(), { timeout: 5000 })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(() => void register(), 2000)
    return () => clearTimeout(id)
  }, [lang])
  return null
}
