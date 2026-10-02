'use client'

import { useTransition } from 'react'
import { markFollowedUp } from '@/server/actions/hub'
import { toast } from './HubToasts'

/** After sending the follow-up mail: the week starts again for this partner. */
export function FollowUpButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      className="button secondary small"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await markFollowedUp(id)
          toast(r.ok ? `Opgevolgd: ${name}` : 'Dat lukte niet.')
        })
      }
    >
      Opgevolgd
    </button>
  )
}
