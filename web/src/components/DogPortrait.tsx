/* eslint-disable @next/next/no-img-element -- photos can be data URLs or Blob URLs */
import type { CSSProperties } from 'react'
import { lookFor, tileFor } from '@/lib/avatar'
import { DogFace } from './DogFace'

interface Props {
  dog: { id: string; name: string; photos: string[]; avatar?: unknown }
  size?: number
  large?: boolean
}

/** The dog's first photo, or its illustrated portrait on a coloured tile. */
export function DogPortrait({ dog, size = 96, large = false }: Props) {
  const className = `dog-photo${large ? ' large' : ''}`
  const style = (large ? {} : { width: size, height: size }) as CSSProperties
  if (dog.photos[0]) {
    return <img src={dog.photos[0]} alt={dog.name} className={className} style={style} />
  }
  return (
    <span className={className} style={{ ...style, '--tile': tileFor(dog.id) } as CSSProperties} role="img" aria-label={dog.name}>
      <DogFace look={lookFor(dog)} size={large ? 220 : Math.round(size * 0.9)} />
    </span>
  )
}
