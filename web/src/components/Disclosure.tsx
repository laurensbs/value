'use client'

import { useState } from 'react'

/** A <details> that remembers being opened, even when the server re-renders the page. */
export function Disclosure({ summary, defaultOpen = false, className, children }: { summary: React.ReactNode; defaultOpen?: boolean; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details className={className} open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{summary}</summary>
      {children}
    </details>
  )
}
