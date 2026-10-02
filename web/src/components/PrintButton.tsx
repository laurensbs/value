'use client'

import { Icon } from './Icon'

/** Opens the browser's print dialog (or "Save as PDF"). */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="button primary" onClick={() => window.print()}>
      <Icon name="download" size={18} /> {label}
    </button>
  )
}
