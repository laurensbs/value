import { isValidElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MASCOT, WELCOME_DOGS } from '@/lib/avatar'
import { DogFace, type DogMood } from './DogFace'

const MOODS: DogMood[] = ['neutral', 'happy', 'sleepy', 'uneasy']

/** Every element type in the tree DogFace returns. */
function types(node: ReactNode): unknown[] {
  if (Array.isArray(node)) return node.flatMap(types)
  if (!isValidElement(node)) return []
  const props = node.props as { children?: ReactNode }
  return [node.type, ...types(props.children)]
}

describe('DogFace', () => {
  it('draws only real SVG elements, in every mood: the share images (satori) take nothing else', () => {
    for (const look of [MASCOT, ...WELCOME_DOGS.map((d) => d.look)]) {
      for (const mood of MOODS) {
        const found = types(DogFace({ look, mood }))
        expect(found.length).toBeGreaterThan(5)
        expect(found.filter((t) => typeof t !== 'string'), mood).toEqual([])
      }
    }
  })

  it('without a mood it is the face it always was', () => {
    expect(renderToStaticMarkup(DogFace({ look: MASCOT }))).toBe(renderToStaticMarkup(DogFace({ look: MASCOT, mood: 'neutral' })))
  })

  it('each mood looks different: smiling or closed eyes, or the white of the eye with a tight mouth', () => {
    const faces = MOODS.map((mood) => renderToStaticMarkup(DogFace({ look: MASCOT, mood })))
    expect(new Set(faces).size).toBe(MOODS.length)
    // Happy always shows the tongue; sleepy and uneasy never do.
    expect(faces[1]).toContain('#e8798a')
    expect(faces[2]).not.toContain('#e8798a')
    expect(faces[3]).not.toContain('#e8798a')
  })
})
