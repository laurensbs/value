import { describe, expect, it } from 'vitest'
import { isForeignStory, readableFirst, storyLanguage } from './story-language'

describe('storyLanguage', () => {
  it('recognises the demo stories', () => {
    expect(storyLanguage('Carmen ya no puede seguir el ritmo de Luna. En el Retiro, Luna es feliz con una pelota.')).toBe('es')
    expect(storyLanguage('Noor fue galga de caza. Ahora aprende que las personas son buenas.')).toBe('es')
    expect(storyLanguage('Kees ruikt alles. Wandelen met hem is een ontdekkingstocht.')).toBe('nl')
    expect(storyLanguage('Henk heeft COPD. Een blokje om lukt nog, het park niet meer. Pip kijkt elke middag naar de deur.')).toBe('nl')
  })

  it('knows English and French', () => {
    expect(storyLanguage('Max loves the park and he walks very calmly with everyone.')).toBe('en')
    expect(storyLanguage('Elle adore les balades et elle est très calme avec les enfants.')).toBe('fr')
  })

  it('says nothing when the text is too short or mixed', () => {
    expect(storyLanguage('')).toBeNull()
    expect(storyLanguage(null)).toBeNull()
    expect(storyLanguage('Lieve Bobbie.')).toBeNull()
  })
})

describe('isForeignStory', () => {
  it('compares with the page language', () => {
    expect(isForeignStory('Luna es feliz con una pelota y ya no puede más.', 'nl')).toBe(true)
    expect(isForeignStory('Luna es feliz con una pelota y ya no puede más.', 'es')).toBe(false)
    expect(isForeignStory('Kort.', 'nl')).toBe(false)
  })
})

describe('readableFirst', () => {
  it('moves stories in another language to the end and keeps the rest in order', () => {
    const items = [
      { id: 'luna', story: 'Carmen ya no puede seguir el ritmo de Luna, es feliz con una pelota.' },
      { id: 'kees', story: 'Kees ruikt alles. Wandelen met hem is een ontdekkingstocht.' },
      { id: 'noor', story: 'Noor fue galga de caza. Ahora aprende que las personas son buenas.' },
      { id: 'bo', story: '' },
    ]
    expect(readableFirst(items, (i) => i.story, 'nl').map((i) => i.id)).toEqual(['kees', 'bo', 'luna', 'noor'])
    expect(readableFirst(items, (i) => i.story, 'es').map((i) => i.id)).toEqual(['luna', 'noor', 'bo', 'kees'])
  })
})
