import { blocksLeft } from './sentences'

/** What an owner or shelter can hand the walker. Shown as "De eigenaar zorgt voor …". */
export const PROVIDES = ['bags', 'leash', 'harness', 'treats', 'water', 'towel'] as const
export type Provide = (typeof PROVIDES)[number]

/** Treats: allowed, only the owner's/shelter's own, or better not. */
export const TREATS = ['yes', 'own', 'no'] as const
export type Treats = (typeof TREATS)[number]

/** How many dogs a shelter can have waiting as drafts at once (photo-first bulk add). */
export const MAX_DRAFT_DOGS = 60

/** Walk lengths offered with one tap, in minutes. */
export const WALK_MINUTES = [20, 30, 45, 60] as const

/** At most this many traits per dog, of at most 40 characters each (server/dog-core.ts). */
export const MAX_TRAITS = 8

/** Traits an owner can tap instead of typing (texts: myDogs.traitChips). */
export const TRAIT_CHIPS = ['playful', 'listens', 'cuddly', 'niceOnLeash', 'pulls', 'likesDogs', 'noDogs', 'cats', 'kids', 'noises', 'sniffer', 'swimmer'] as const

/** Ready sentences for a dog's story (myDogs.storyBlocks): first about the dog, then why a walk helps. */
export const STORY_BLOCKS = ['happy', 'older', 'young', 'dogs', 'people', 'work', 'mobility', 'regular'] as const
export type StoryBlock = (typeof STORY_BLOCKS)[number]

// Only one sentence of each group fits a dog: once one is in the story, the others are not offered.
export const STORY_GROUPS: StoryBlock[][] = [
  ['older', 'young'],
  ['work', 'mobility'],
]

/** The traits in a list as the server reads it: split on commas, semicolons or new lines. */
export function traitList(value: string): string[] {
  return value
    .split(/[\n,;]/)
    .map((trait) => trait.trim())
    .filter(Boolean)
}

export function hasTrait(value: string, trait: string): boolean {
  const key = trait.toLocaleLowerCase()
  return traitList(value).some((t) => t.toLocaleLowerCase() === key)
}

/** Adds a trait, or takes it out when it is already there. A full list stays as it is. */
export function toggleTrait(value: string, trait: string): string {
  const list = traitList(value)
  const key = trait.toLocaleLowerCase()
  if (list.some((t) => t.toLocaleLowerCase() === key)) return list.filter((t) => t.toLocaleLowerCase() !== key).join(', ')
  return list.length >= MAX_TRAITS ? value : [...list, trait].join(', ')
}

/** The ready sentences still worth offering: not the ones already in the story, nor the others of their group. */
export function storyBlocksLeft(story: string, sentences: Record<StoryBlock, string>): StoryBlock[] {
  return blocksLeft(story, STORY_BLOCKS, sentences, STORY_GROUPS)
}


/** What a new shelter dog starts with: the shelter's own defaults, cleaned up. */
export function shelterDogDefaults(org: { treatsPolicy: string; provides: string[]; defaultWalkMinutes: number | null }): {
  treats: Treats
  provides: Provide[]
  walkMinutes: number
} {
  const treats = (TREATS as readonly string[]).includes(org.treatsPolicy) ? (org.treatsPolicy as Treats) : 'own'
  const provides = [...new Set(org.provides.filter((p): p is Provide => (PROVIDES as readonly string[]).includes(p)))]
  const minutes = Number.isFinite(org.defaultWalkMinutes) ? Math.round(org.defaultWalkMinutes as number) : 45
  return {
    treats,
    provides: provides.length ? provides : ['bags', 'leash'],
    walkMinutes: Math.min(180, Math.max(10, minutes)),
  }
}
