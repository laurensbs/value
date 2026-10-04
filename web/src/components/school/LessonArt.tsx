import type { CSSProperties } from 'react'
import { DogFace, type DogLook } from '@/components/DogFace'
import { ProgressIcon, type ProgressIconName } from '@/components/progress/ProgressIcon'
import { MASCOT, TILES } from '@/lib/avatar'
import type { LessonArt as Art, LessonDog, LessonIcon } from '@/lib/lessons'

// A few lesson pictures in the same 24×24 line style as Icon: an ID card, a snowflake, a lamp and a u-turn.
const EXTRA = {
  id: 'M3 6h18v12H3zM8.5 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5.5 16a3 3 0 0 1 6 0M14 10h4.5M14 13h3',
  snow: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5',
  light: 'M8 3h8l-1.5 6v11h-5V9L8 3ZM8.5 6h7M12 12.5v2.5M4 4.5l1.5 1M20 4.5l-1.5 1',
  // A question that comes back: the u-turn of the app's mark.
  again: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
} as const

export type SchoolIconName = LessonIcon | ProgressIconName | keyof typeof EXTRA

export function SchoolIcon({ name, size = 22 }: { name: SchoolIconName; size?: number }) {
  if (!(name in EXTRA)) return <ProgressIcon name={name as ProgressIconName} size={size} />
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="icon">
      <path d={EXTRA[name as keyof typeof EXTRA]} />
    </svg>
  )
}

/** The dogs of the body-language lesson: the same looks as the iPhone app (IntroView.golden, .border, .brown). */
const DOGS: Record<LessonDog, { look: DogLook; tile: string }> = {
  golden: { look: MASCOT, tile: TILES[0] },
  border: { look: { fur: '#20242a', ears: '#20242a', muzzle: '#ffffff', earStyle: 'pointy', head: 'narrow', blaze: '#ffffff', collar: '#c0392b' }, tile: TILES[3] },
  brown: { look: { fur: '#c47c3e', ears: '#6b3f1f', muzzle: '#ffffff', earStyle: 'fold', head: 'wide', brows: '#e8bf7a', collar: '#2d5d8a' }, tile: TILES[1] },
}

/** A lesson picture: Guus, one of the three dogs, or an icon on a tile. Always decorative: the words carry the meaning. */
export function LessonArt({ art, size = 136 }: { art: Art; size?: number }) {
  if (art.kind === 'icon') {
    return (
      <span className={`lesson-art icon${art.tone === 'sos' ? ' sos' : ''}`} style={{ width: size, height: size }} aria-hidden="true">
        <SchoolIcon name={art.icon} size={Math.round(size * 0.44)} />
      </span>
    )
  }
  const { look, tile } = art.kind === 'guus' ? { look: MASCOT, tile: TILES[0] } : DOGS[art.dog]
  return (
    <span className="lesson-art dog" style={{ width: size, height: size, '--tile': tile } as CSSProperties} aria-hidden="true">
      <DogFace look={look} mood={art.mood} size={Math.round(size * 0.9)} />
    </span>
  )
}
