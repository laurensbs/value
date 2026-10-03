// The post planner of the marketing hub: 12 ready-made posts for the first six weeks. The texts
// live in messages/<locale>.json (marketing.posts.<id>); this file holds what is not text: the
// week, the channel, the link and how the share image looks. Nothing is ever posted from here.

import type { DogLook } from '@/components/DogFace'
import { campaignUrl, type Source } from './campaign'

export const CHANNELS = ['instagram', 'tiktok', 'linkedin', 'buurtapp'] as const satisfies readonly Source[]
export type Channel = (typeof CHANNELS)[number]

/** Drawn dogs for the share images (the same style as the rest of the site, no photos). */
export const LOOKS = {
  labrador: { fur: '#6e4632', ears: '#583624', muzzle: '#8d5e44', earStyle: 'floppy', collar: '#c0392b' },
  teckel: { fur: '#2b2220', ears: '#1c1513', muzzle: '#b4733f', earStyle: 'floppy', head: 'narrow', brows: '#b4733f', collar: '#d9a400' },
  golden: { fur: '#e2b45c', ears: '#c99540', muzzle: '#f2d79b', earStyle: 'floppy', head: 'round', tongue: true, collar: '#1f5a3d' },
  collie: { fur: '#20242a', ears: '#20242a', muzzle: '#ffffff', earStyle: 'pointy', head: 'narrow', blaze: '#ffffff', tongue: true, collar: '#c0392b' },
  bulldog: { fur: '#d6b48c', ears: '#c29a6c', muzzle: '#5b4a41', earStyle: 'bat', head: 'wide', collar: '#d9a400' },
  beagle: { fur: '#c47c3e', ears: '#6b3f1f', muzzle: '#ffffff', earStyle: 'floppy', blaze: '#ffffff', tongue: true, collar: '#1f5a3d' },
  staffie: { fur: '#b98a62', ears: '#8e6443', muzzle: '#f1dfcb', earStyle: 'fold', head: 'wide', blaze: '#f1dfcb', collar: '#2d5d8a' },
  galgo: { fur: '#d9cbb8', ears: '#b9a690', muzzle: '#ece3d6', earStyle: 'fold', head: 'narrow', collar: '#7b4fa3' },
} satisfies Record<string, DogLook>

export type Breed = keyof typeof LOOKS

/** Brand colours from globals.css (light mode): the share images are always light. */
export const TONES = {
  grass: { bg: '#1f5a3d', ink: '#ffffff', tile: '#2b6b4b', accent: '#d9f05a', onAccent: '#16201a' },
  paper: { bg: '#f4f6f0', ink: '#16201a', tile: '#e7ece3', accent: '#1f5a3d', onAccent: '#ffffff' },
  ball: { bg: '#d9f05a', ink: '#16201a', tile: '#e8f59a', accent: '#1f5a3d', onAccent: '#ffffff' },
  warm: { bg: '#f6ebcf', ink: '#16201a', tile: '#efdcae', accent: '#1f5a3d', onAccent: '#ffffff' },
  calm: { bg: '#2d5d8a', ink: '#ffffff', tile: '#3a6d9c', accent: '#d9f05a', onAccent: '#16201a' },
} as const

export type Tone = keyof typeof TONES

export type Day = 'tue' | 'thu' | 'sun'

export interface PostDef {
  /** Stable: used for the texts (marketing.posts.<id>), the image (/admin/marketing/card/<id>) and launch_task ("post:<id>"). Never rename. */
  id: string
  week: 1 | 2 | 3 | 4 | 5 | 6
  day: Day
  channel: Channel
  /** The page the post links to (in the caption, or in the bio for Instagram and TikTok). */
  path: string
  tone: Tone
  dogs: Breed[]
  /** The card shows the five safety steps instead of a line of text. */
  steps?: boolean
  /** The caption has [ … ] gaps for real numbers: never post it without filling them in. */
  fillIn?: boolean
}

export const POSTS: readonly PostDef[] = [
  { id: 'p01', week: 1, day: 'tue', channel: 'instagram', path: '/', tone: 'grass', dogs: ['golden', 'collie', 'beagle'] },
  { id: 'p02', week: 1, day: 'sun', channel: 'tiktok', path: '/', tone: 'paper', dogs: ['labrador'] },
  { id: 'p03', week: 2, day: 'tue', channel: 'buurtapp', path: '/flyer?for=owner', tone: 'warm', dogs: ['teckel'] },
  { id: 'p04', week: 2, day: 'sun', channel: 'instagram', path: '/dogs', tone: 'ball', dogs: ['collie'] },
  { id: 'p05', week: 3, day: 'tue', channel: 'tiktok', path: '/', tone: 'grass', dogs: ['beagle'] },
  { id: 'p06', week: 3, day: 'thu', channel: 'linkedin', path: '/shelter', tone: 'paper', dogs: ['staffie', 'galgo'] },
  { id: 'p07', week: 4, day: 'tue', channel: 'instagram', path: '/shelters', tone: 'calm', dogs: ['golden'] },
  { id: 'p08', week: 4, day: 'sun', channel: 'buurtapp', path: '/signup?intent=owner', tone: 'warm', dogs: ['labrador', 'teckel'] },
  { id: 'p09', week: 5, day: 'tue', channel: 'tiktok', path: '/', tone: 'paper', dogs: ['labrador', 'teckel', 'bulldog', 'collie'] },
  { id: 'p10', week: 5, day: 'sun', channel: 'instagram', path: '/safety', tone: 'grass', dogs: ['staffie'], steps: true },
  { id: 'p11', week: 6, day: 'tue', channel: 'linkedin', path: '/', tone: 'ball', dogs: ['golden', 'beagle'], fillIn: true },
  { id: 'p12', week: 6, day: 'sun', channel: 'instagram', path: '/dogs', tone: 'calm', dogs: ['galgo'] },
]

export const POST_IDS = POSTS.map((p) => p.id)

export function isPostId(id: unknown): id is string {
  return typeof id === 'string' && POST_IDS.includes(id)
}

export function postById(id: string): PostDef | undefined {
  return POSTS.find((p) => p.id === id)
}

/** launch_task key that remembers a post was posted (by the admin's own click). */
export const POST_PREFIX = 'post:'

/** The link for a post: its page with utm tags for the channel, the week and the post itself. */
export function postLink(base: string, post: PostDef): string {
  return campaignUrl(base, { path: post.path, source: post.channel, campaign: `start-week-${post.week}`, content: post.id })
}

/** The first post that is not posted yet, in planner order. */
export function nextPost(posted: ReadonlySet<string>): PostDef | null {
  return POSTS.find((p) => !posted.has(p.id)) ?? null
}
