import type { CSSProperties } from 'react'

/** Exposes a dog's tile colour to CSS, which adapts it to the theme. */
export function tileStyle(tile: string): CSSProperties {
  return { '--tile': tile } as CSSProperties
}
