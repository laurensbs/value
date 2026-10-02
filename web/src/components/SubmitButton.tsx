'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({
  children,
  className = 'button primary',
  pendingLabel,
  disabled,
  pending,
}: {
  children: React.ReactNode
  className?: string
  pendingLabel?: string
  disabled?: boolean
  /** Pass the pending flag from useForm; form actions report it on their own. */
  pending?: boolean
}) {
  const status = useFormStatus()
  const busy = pending ?? status.pending
  return (
    <button type="submit" className={className} disabled={busy || disabled} aria-busy={busy}>
      {busy && pendingLabel ? pendingLabel : children}
    </button>
  )
}
