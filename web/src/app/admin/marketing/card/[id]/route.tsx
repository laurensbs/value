import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { CARD, ShareCard } from '@/components/marketing-hub/ShareCard'
import { slug } from '@/components/marketing-hub/campaign'
import { postById } from '@/components/marketing-hub/posts'
import { isLocale, type Locale } from '@/i18n/config'
import { APP_NAME, siteUrl } from '@/lib/site'
import { getViewer } from '@/server/session'

// Fonts from node_modules, read once. ImageResponse takes ttf, otf and woff (not woff2): Caveat
// (the site's handwritten face) for the headline, and Geist, the default face of next/og, for the
// rest. Should a file be missing, the image still renders with the default font.
// The paths are written out in full, so the build traces the files into the function bundle.
const hand = readFile(join(process.cwd(), 'node_modules/@fontsource/caveat/files/caveat-latin-700-normal.woff')).catch(() => null)
const body = readFile(join(process.cwd(), 'node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf')).catch(() => null)

/**
 * The share image of one post in the marketing hub: /admin/marketing/card/p01?lang=nl, a PNG of
 * 1080 × 1350. With &download=1 the browser saves it as a file. Admin only; nothing is posted.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer()
  if (!viewer?.isAdmin) return new Response('Not found', { status: 404 })
  const { id } = await ctx.params
  const post = postById(id)
  if (!post) return new Response('Not found', { status: 404 })

  const query = request.nextUrl.searchParams
  const lang: Locale = isLocale(query.get('lang')) ? (query.get('lang') as Locale) : 'nl'
  const t = await getTranslations({ locale: lang, namespace: 'marketing' })
  const [handFont, bodyFont] = await Promise.all([hand, body])
  const fonts = [
    ...(bodyFont ? [{ name: 'Geist', data: bodyFont, weight: 400 as const, style: 'normal' as const }] : []),
    ...(handFont ? [{ name: 'Caveat', data: handFont, weight: 700 as const, style: 'normal' as const }] : []),
  ]

  return new ImageResponse(
    (
      <ShareCard
        post={post}
        app={APP_NAME}
        title={t(`posts.${post.id}.title`, { app: APP_NAME })}
        sub={t(`posts.${post.id}.sub`, { app: APP_NAME })}
        free={t('card.free')}
        host={new URL(siteUrl()).host}
        hand={handFont ? 'Caveat' : undefined}
      />
    ),
    {
      ...CARD,
      fonts: fonts.length ? fonts : undefined,
      headers: {
        // Admin only: never in a shared cache.
        'cache-control': 'private, max-age=300',
        ...(query.get('download') ? { 'content-disposition': `attachment; filename="${slug(APP_NAME) || 'post'}-${post.id}-${lang}.png"` } : {}),
      },
    },
  )
}
