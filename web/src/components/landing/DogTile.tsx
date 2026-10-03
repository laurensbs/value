import type { CSSProperties } from 'react'
import { DogFace } from '@/components/DogFace'
import type { TiledLook } from './looks'

/** An illustrated dog on its pastel tile, like the cards in the iPhone app. Always decorative. */
export function DogTile({ dog, className = '' }: { dog: TiledLook; className?: string }) {
  return (
    <span className={`lp-dogtile ${className}`} style={{ '--tile': dog.tile } as CSSProperties}>
      <DogFace look={dog.look} size={120} />
    </span>
  )
}
