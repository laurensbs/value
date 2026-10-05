import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Laurens' story on /about describes the safety steps. Walking alone needs the owner's yes and live
// location (terms 0.4 art. 6.5), which is off for now: the story may not say you simply walk alone after the ID.
describe('/about story', () => {
  for (const locale of ['nl', 'en', 'es', 'fr']) {
    it(`${locale} ties walking alone to live location`, () => {
      const story = readFileSync(join(process.cwd(), 'content/about', locale, 'story.md'), 'utf8')
      expect(story).not.toMatch(/pas daarna loop je zelf|only then do you walk on your own|solo después sales a pasear|ce n’est qu’ensuite que vous partez seul/i)
      expect(story).toMatch(/live|en directo|en direct/i)
    })
  }
})
