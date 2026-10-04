'use client'

import { useSyncExternalStore } from 'react'
import { isNativeApp } from '@/lib/native'
import { Icon } from './Icon'

const noop = () => () => {}

/**
 * The link to the support page (Patreon or similar). The server already leaves it out for the
 * apps; this also hides it in app builds that do not send the "RondjeApp" user agent yet.
 */
export function SupportButton({ url, label, className = 'button primary' }: { url: string; label: string; className?: string }) {
  const native = useSyncExternalStore(noop, isNativeApp, () => false)
  if (native) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      <Icon name="heart" size={18} /> {label}
    </a>
  )
}
