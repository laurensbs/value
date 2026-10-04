'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * The one main action on a dog's page, always at hand on a phone (like the bar at the bottom of a
 * listing in other apps): it leads to the plan below, or to the quiz first. It steps aside as soon
 * as the plan itself is in view (or above it, and so before the footer), so there are never two
 * buttons for the same thing. It starts out of sight and comes in once the browser knows where the
 * plan is: a short page with the plan already in view never shows it at all.
 */
export function PlanBar({ href, label }: { href: string; label: string }) {
  const [away, setAway] = useState(true)

  useEffect(() => {
    const plan = document.getElementById('plan')
    if (!plan || typeof IntersectionObserver === 'undefined') return
    const watch = new IntersectionObserver(([entry]) => setAway(entry.isIntersecting || entry.boundingClientRect.top < 0))
    watch.observe(plan)
    return () => watch.disconnect()
  }, [])

  return (
    <div className={`plan-bar${away ? ' away' : ''}`} inert={away}>
      <Link href={href} className="button primary big">
        {label}
      </Link>
    </div>
  )
}
