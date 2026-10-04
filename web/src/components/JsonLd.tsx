import { headers } from 'next/headers'
import { nonceFrom } from '@/lib/csp'
import { serializeJsonLd } from '@/lib/seo'

/**
 * Structured data for search engines. A JSON-LD block is data, not code, so the browser never runs
 * it; it still carries this response's nonce, like every other script on the page.
 */
export async function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const nonce = nonceFrom((await headers()).get('content-security-policy'))
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // The browser hides a nonce from the DOM after loading, so it never matches on the client.
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
