import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import fr from '../../messages/fr.json'
import nl from '../../messages/nl.json'
import { BIO_BLOCKS, BIO_MAX, bioBlocksFor, bioBlocksLeft, type BioBlock, type BioFacts } from './bio'
import { addSentence, blocksLeft } from './sentences'

const walker: BioFacts = { name: 'Fleur', city: 'Utrecht', walker: true, owner: false, experience: 'some' }
const sentences = Object.fromEntries(BIO_BLOCKS.map((key) => [key, `[${key}]`])) as Record<BioBlock, string>

describe('bioBlocksFor', () => {
  it('fits the sentences to experience with dogs', () => {
    const about = (experience: BioFacts['experience']) => bioBlocksFor({ ...walker, experience }).filter((key) => ['learning', 'walkedBefore', 'hadDog', 'grewUp'].includes(key))
    expect(about('none')).toEqual(['learning'])
    expect(about('some')).toEqual(['walkedBefore', 'hadDog'])
    expect(about('lots')).toEqual(['grewUp', 'hadDog'])
    expect(about(null)).toEqual([])
  })

  it('gives walkers and owners their own sentences, and both to someone who is both', () => {
    const owner = bioBlocksFor({ ...walker, walker: false, owner: true })
    expect(owner).toEqual(expect.arrayContaining(['hello', 'ownerHelp', 'ownerMeet', 'reliable']))
    expect(owner).not.toContain('missDog')
    expect(bioBlocksFor(walker)).not.toContain('ownerHelp')
    expect(bioBlocksFor({ ...walker, owner: true })).toEqual(expect.arrayContaining(['missDog', 'ownerHelp']))
  })

  it('says hello only with a name and a town', () => {
    expect(bioBlocksFor(walker)[0]).toBe('hello')
    expect(bioBlocksFor({ ...walker, city: ' ' })).not.toContain('hello')
  })
})

describe('bioBlocksLeft', () => {
  it('leaves out what is already written, and the other sentence of its group', () => {
    const bio = addSentence(addSentence('', sentences.hello), sentences.student)
    const left = bioBlocksLeft(bio, walker, sentences)
    expect(left).not.toContain('hello')
    expect(left).not.toContain('student')
    expect(left).not.toContain('retired')
    expect(left).toContain('weekend')
  })

  it('adds a sentence after the text with one space', () => {
    expect(addSentence('', 'Hoi.')).toBe('Hoi.')
    expect(addSentence('Hoi.  \n', 'Ik ben Fleur.')).toBe('Hoi. Ik ben Fleur.')
    expect(blocksLeft('a', ['a', 'b', 'c'] as const, { a: 'a', b: 'b', c: 'c' }, [['a', 'b']])).toEqual(['c'])
  })
})

describe('bio sentences in every language', () => {
  it('are short, and a long name and town still fit', () => {
    for (const messages of [nl, en, es, fr]) {
      const blocks = messages.onboarding.bioBlocks as Record<string, string>
      expect(Object.keys(blocks).sort()).toEqual([...BIO_BLOCKS].sort())
      for (const text of Object.values(blocks)) expect(text.length).toBeLessThanOrEqual(100)
      const hello = blocks.hello.replace('{name}', 'x'.repeat(40)).replace('{city}', 'y'.repeat(60))
      expect(hello.length).toBeLessThan(BIO_MAX)
    }
  })
})
