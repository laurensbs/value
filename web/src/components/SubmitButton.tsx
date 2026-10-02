'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({
  children,
  className = 'button primary',
  pendingLabel,
  disabled,
}: {
  children: React.ReactNode
  className?: string
  pendingLabel?: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  )
}
