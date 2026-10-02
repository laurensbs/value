import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseFrontMatter } from './front-matter'

describe('parseFrontMatter', () => {
  it('splits quoted and plain values from the body', () => {
    const { data, body } = parseFrontMatter('---\ntitle: Privacy\nversion: "0.1"\n---\n\n# Privacy\n')
    expect(data).toEqual({ title: 'Privacy', version: '0.1' })
    expect(body.trim()).toBe('# Privacy')
  })

  it('leaves text without front matter alone', () => {
    expect(parseFrontMatter('# Hi')).toEqual({ data: {}, body: '# Hi' })
  })

  it('removes the front matter from every legal text', () => {
    for (const locale of ['nl', 'en', 'es', 'fr']) {
      for (const doc of ['terms', 'privacy', 'conduct', 'safety', 'shelters', 'cookies']) {
        const { data, body } = parseFrontMatter(readFileSync(`content/legal/${locale}/${doc}.md`, 'utf8'))
        expect(data.title, `${locale}/${doc}`).toBeTruthy()
        expect(body.startsWith('---'), `${locale}/${doc}`).toBe(false)
        expect(body).not.toMatch(/^title:/m)
      }
    }
  })
})
