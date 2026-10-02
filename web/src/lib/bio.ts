import { blocksLeft } from './sentences'

/** The longest "About you" can be. */
export const BIO_MAX = 600
/** How many sentences are offered at a time; tapping one brings the next. */
export const BIO_SHOWN = 5

/**
 * Ready sentences for "About you", to tap instead of starting from an empty box, in the order they
 * are offered: who you are and your experience first, then time and why. Everyone gets the general
 * ones; walkers get theirs, fitting how much experience they have; owners get theirs.
 */
export const BIO_BLOCKS = ['hello', 'learning', 'walkedBefore', 'grewUp', 'hadDog', 'ownerHelp', 'student', 'homeWork', 'retired', 'weekend', 'outside', 'missDog', 'neighbour', 'ownerMeet', 'reliable'] as const
export type BioBlock = (typeof BIO_BLOCKS)[number]

const WALKERS: readonly BioBlock[] = ['grewUp', 'walkedBefore', 'hadDog', 'learning', 'outside', 'missDog']
const OWNERS: readonly BioBlock[] = ['ownerHelp', 'ownerMeet']

/** Within each group only one sentence fits a person. */
export const BIO_GROUPS: BioBlock[][] = [
  ['grewUp', 'learning'],
  ['walkedBefore', 'learning'],
  ['hadDog', 'learning'],
  ['student', 'retired'],
]

export interface BioFacts {
  name: string
  city: string
  walker: boolean
  owner: boolean
  experience: 'none' | 'some' | 'lots' | null
}

/** The sentences that fit this person, in a natural order. Without a name or a town there is no hello. */
export function bioBlocksFor(facts: BioFacts): BioBlock[] {
  return BIO_BLOCKS.filter((key) => {
    if (key === 'hello') return Boolean(facts.name.trim() && facts.city.trim())
    if (WALKERS.includes(key) && !facts.walker) return false
    if (OWNERS.includes(key) && !facts.owner) return false
    // Experience with dogs: none, some or lots (grown up with them).
    if (key === 'learning') return facts.experience === 'none'
    if (key === 'walkedBefore') return facts.experience === 'some'
    if (key === 'grewUp') return facts.experience === 'lots'
    if (key === 'hadDog') return facts.experience === 'some' || facts.experience === 'lots'
    return true
  })
}

/** The sentences still worth offering for what is already written. */
export function bioBlocksLeft(bio: string, facts: BioFacts, sentences: Record<BioBlock, string>): BioBlock[] {
  return blocksLeft(bio, bioBlocksFor(facts), sentences, BIO_GROUPS)
}
