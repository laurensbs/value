import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import fr from '../../messages/fr.json'
import nl from '../../messages/nl.json'
import { MAX_TRAITS, shelterDogDefaults, STORY_BLOCKS, storyBlocksLeft, toggleTrait, TRAIT_CHIPS, traitList, type StoryBlock } from './dog-options'

describe('shelterDogDefaults', () => {
  it('uses the shelter defaults', () => {
    expect(shelterDogDefaults({ treatsPolicy: 'no', provides: ['harness', 'water'], defaultWalkMinutes: 60 })).toEqual({
      treats: 'no',
      provides: ['harness', 'water'],
      walkMinutes: 60,
    })
  })

  it('cleans up unknown values and falls back to bags and a leash', () => {
    expect(shelterDogDefaults({ treatsPolicy: 'sometimes', provides: ['cape', 'bags', 'bags'], defaultWalkMinutes: 500 })).toEqual({
      treats: 'own',
      provides: ['bags'],
      walkMinutes: 180,
    })
    expect(shelterDogDefaults({ treatsPolicy: 'yes', provides: [], defaultWalkMinutes: null })).toEqual({
      treats: 'yes',
      provides: ['bags', 'leash'],
      walkMinutes: 45,
    })
  })
})

describe('ready traits', () => {
  it('are read the way the server reads them', () => {
    expect(traitList(' Speels, rustig;Snuffelt graag\n , ')).toEqual(['Speels', 'rustig', 'Snuffelt graag'])
  })

  it('go in with a tap and out with another, whatever their case', () => {
    expect(toggleTrait('', 'Speels')).toBe('Speels')
    expect(toggleTrait('Speels', 'Rustig')).toBe('Speels, Rustig')
    expect(toggleTrait('speels, Rustig', 'Speels')).toBe('Rustig')
    // Typed by hand with semicolons: tidied into one list.
    expect(toggleTrait('Trekt niet; Rustig', 'Speels')).toBe('Trekt niet, Rustig, Speels')
  })

  it('stop at the maximum', () => {
    const full = Array.from({ length: MAX_TRAITS }, (_, i) => `Kenmerk ${i + 1}`).join(', ')
    expect(toggleTrait(full, 'Speels')).toBe(full)
    expect(traitList(toggleTrait(full, 'Kenmerk 1'))).toHaveLength(MAX_TRAITS - 1)
  })
})

describe('ready sentences for the story', () => {
  const sentences = Object.fromEntries(STORY_BLOCKS.map((key) => [key, `<${key}>`])) as Record<StoryBlock, string>

  it('are offered until they are in the story', () => {
    expect(storyBlocksLeft('', sentences)).toEqual([...STORY_BLOCKS])
    expect(storyBlocksLeft('Hallo. <happy>', sentences)).not.toContain('happy')
  })

  it('leave out the other sentences of a group once one is used', () => {
    const left = storyBlocksLeft('<older> <work>', sentences)
    expect(left).toEqual(['happy', 'dogs', 'people', 'regular'])
  })
})

describe('dog form texts', () => {
  it('fit the limits in every language', () => {
    for (const [locale, messages] of Object.entries({ nl, en, es, fr })) {
      const onError = (error: Error) => {
        throw error
      }
      const t = createTranslator({ locale, messages: messages as Record<string, unknown>, namespace: 'myDogs', onError }) as (key: string, values?: object) => string
      for (const key of TRAIT_CHIPS) {
        const trait = t(`traitChips.${key}`)
        // The server takes at most 40 characters per trait, and a comma would split it in two.
        expect(trait.length, `${locale} ${key}`).toBeLessThanOrEqual(40)
        expect(trait, `${locale} ${key}`).not.toMatch(/[,;{}]/)
      }
      const story = STORY_BLOCKS.map((key) => t(`storyBlocks.${key}`, { name: 'Bello' })).join(' ')
      expect(story, locale).not.toMatch(/[{}]|undefined/)
      expect(story.length, locale).toBeLessThanOrEqual(1500)
      for (const key of ['characterTitle', 'storyTitle', 'storyText', 'walkTitle', 'whereTitle', 'safetyText', 'publish']) expect(t(`steps.${key}`, { name: 'Bello' }), `${locale} ${key}`).toContain('Bello')
    }
  })

  it('ready sentences go public with the story: about the dog, never when the owner is home or how they are (M18)', () => {
    for (const [locale, messages] of Object.entries({ nl, en, es, fr })) {
      const t = createTranslator({ locale, messages: messages as Record<string, unknown>, namespace: 'myDogs' }) as (key: string, values?: object) => string
      for (const key of ['work', 'mobility'] as const) {
        const sentence = t(`storyBlocks.${key}`, { name: 'Bello' })
        expect(sentence, `${locale} ${key}`).toContain('Bello')
        expect(sentence, `${locale} ${key}`).not.toMatch(/werk|overdag|zelf loop|work|during the day|myself|trabajo|durante el día|me cuesta|travail|en journée|moi-même/i)
      }
      // The hint under the story says so, in every language.
      expect(t('storyPublic'), locale).toBeTruthy()
      expect(t('needsPublic'), locale).toBeTruthy()
    }
  })
})
