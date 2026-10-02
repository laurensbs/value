'use client'

import { useEffect } from 'react'
import { markNotificationsRead } from '@/server/actions/profile'

/** Marks everything read once the list has been seen; highlights stay until the next visit. */
export function MarkNotificationsRead() {
  useEffect(() => {
    void markNotificationsRead()
  }, [])
  return null
}
