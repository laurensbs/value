import type { BadgeIcon } from '@/lib/progress'
import { Icon } from './Icon'

interface Props {
  icon: BadgeIcon
  /** Tier colour, or null for a badge that is not earned yet. */
  color: 'bronze' | 'silver' | 'gold' | 'green' | 'ball' | null
  size?: number
  /** Read out instead of the picture; without it the medal is decoration next to its name. */
  label?: string
}

/** A badge ("penning") drawn as a round dog tag with the dashed route around the edge. */
export function Medal({ icon, color, size = 56, label }: Props) {
  return (
    <span
      className={`medal ${color ?? 'locked'}`}
      style={{ '--size': `${size}px` } as React.CSSProperties}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Icon name={icon} size={Math.round(size * 0.44)} />
    </span>
  )
}
