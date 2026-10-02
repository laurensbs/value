import { describe, expect, it } from 'vitest'
import { renderEmail } from './email-layout'

describe('renderEmail', () => {
  it('escapes everything a user could have typed', () => {
    const { html, text } = renderEmail({
      heading: 'Kees <script>alert(1)</script> wil wandelen',
      paragraphs: ['Met "Bello" & co'],
      cta: { label: 'Bekijk', url: 'https://example.org/a?b=1&c=<2>' },
      footer: 'Voetnoot',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('Kees &lt;script&gt;alert(1)&lt;/script&gt; wil wandelen')
    expect(html).toContain('Met &quot;Bello&quot; &amp; co')
    expect(html).toContain('href="https://example.org/a?b=1&amp;c=&lt;2&gt;"')
    expect(text).toContain('Bekijk: https://example.org/a?b=1&c=<2>')
  })

  it('works without a button', () => {
    const { html, text } = renderEmail({ heading: 'Hoi', paragraphs: ['Een'], footer: 'Voet' })
    expect(html).not.toContain('<a ')
    expect(text).toBe('Hoi\n\nEen\n\n--\nVoet')
  })
})
