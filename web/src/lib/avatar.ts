import type { DogLook, EarStyle, HeadShape } from '@/components/DogFace'

const COATS: Pick<DogLook, 'fur' | 'ears' | 'muzzle'>[] = [
  { fur: '#e2b45c', ears: '#c99540', muzzle: '#f2d79b' },
  { fur: '#6e4632', ears: '#583624', muzzle: '#8d5e44' },
  { fur: '#c47c3e', ears: '#6b3f1f', muzzle: '#ffffff' },
  { fur: '#20242a', ears: '#20242a', muzzle: '#ffffff' },
  { fur: '#d9cbb8', ears: '#b9a690', muzzle: '#ece3d6' },
  { fur: '#b98a62', ears: '#8e6443', muzzle: '#f1dfcb' },
  { fur: '#e8bf7a', ears: '#d6a55a', muzzle: '#f5dfb5' },
  { fur: '#4a4140', ears: '#2f2827', muzzle: '#8a7d78' },
]
const EARS: EarStyle[] = ['floppy', 'fold', 'pointy', 'floppy', 'fold']
const HEADS: HeadShape[] = ['round', 'round', 'wide', 'narrow']
const COLLARS = ['#c0392b', '#2d5d8a', '#1f5a3d', '#d9a400', '#7b4fa3']
export const TILES = ['#f6ebcf', '#ecdcd0', '#efe0cf', '#dfe5ea', '#ece6dd', '#f3e3d1', '#f7ead2', '#e6e1dc']

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A stable illustrated portrait for a dog without a stored avatar. */
export function lookFor(dog: { id: string; avatar?: unknown }): DogLook {
  if (dog.avatar && typeof dog.avatar === 'object') return dog.avatar as DogLook
  const h = hash(dog.id)
  const coat = COATS[h % COATS.length]
  return {
    ...coat,
    earStyle: EARS[(h >> 3) % EARS.length],
    head: HEADS[(h >> 6) % HEADS.length],
    blaze: (h >> 9) % 4 === 0 ? '#ffffff' : undefined,
    tongue: (h >> 11) % 3 === 0,
    collar: COLLARS[(h >> 13) % COLLARS.length],
  }
}

export function tileFor(id: string): string {
  return TILES[hash(id) % TILES.length]
}

/** Rondje's own dog: guides people through onboarding and cheers at celebrations. */
export const MASCOT: DogLook = { fur: '#e2b45c', ears: '#c99540', muzzle: '#f2d79b', earStyle: 'floppy', head: 'round', tongue: true, collar: '#1f5a3d' }

/** Three friendly faces for welcome screens. */
export const WELCOME_DOGS: { look: DogLook; tile: string }[] = [
  { look: { fur: '#20242a', ears: '#20242a', muzzle: '#ffffff', earStyle: 'pointy', head: 'narrow', blaze: '#ffffff', collar: '#2d5d8a' }, tile: TILES[3] },
  { look: MASCOT, tile: TILES[0] },
  { look: { fur: '#c47c3e', ears: '#6b3f1f', muzzle: '#ffffff', earStyle: 'fold', head: 'wide', tongue: true, collar: '#c0392b' }, tile: TILES[5] },
]
