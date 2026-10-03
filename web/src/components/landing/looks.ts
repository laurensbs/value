import type { DogLook } from '@/components/DogFace'

export interface TiledLook {
  look: DogLook
  tile: string
}

// The same three dogs as on the iPhone app's welcome screen (ios/Rondje/Features/Auth/WelcomeView.swift).
export const GOLDEN: TiledLook = {
  look: { fur: '#e2b45c', ears: '#c99540', muzzle: '#f2d79b', earStyle: 'floppy', head: 'round', tongue: true, collar: '#1f5a3d' },
  tile: '#f6ebcf',
}

export const COLLIE: TiledLook = {
  look: { fur: '#20242a', ears: '#20242a', muzzle: '#ffffff', earStyle: 'pointy', head: 'narrow', blaze: '#ffffff', collar: '#c0392b' },
  tile: '#dfe5ea',
}

export const BROWN: TiledLook = {
  look: { fur: '#c47c3e', ears: '#6b3f1f', muzzle: '#ffffff', earStyle: 'fold', head: 'wide', brows: '#e8bf7a', collar: '#2d5d8a' },
  tile: '#ecdcd0',
}

export const BEAGLE: TiledLook = {
  look: { fur: '#e2b45c', ears: '#d6a55a', muzzle: '#f2d79b', earStyle: 'fold', head: 'round', collar: '#7b4fa3' },
  tile: '#f3e3d1',
}

export const TRIO = [GOLDEN, COLLIE, BROWN] as const
