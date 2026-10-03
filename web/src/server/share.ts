import 'server-only'
import { eq } from 'drizzle-orm'
import { getLocale, getTranslations } from 'next-intl/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/config'
import { dogShareUrl } from '@/lib/invite'
import { siteUrl } from '@/lib/site'
import type { DogDetail } from './queries'
import type { Viewer } from './session'

/**
 * The ready message an owner sends the neighbours about their own dog while it is online, with
 * a link that counts as their invite. The same for the website and the iPhone app; null for anyone else.
 */
export async function dogShareFor(detail: DogDetail, viewer: Viewer | null): Promise<{ url: string; message: string } | null> {
  const { dog, host, isMine } = detail
  if (!isMine || host.kind !== 'owner' || dog.status !== 'active' || dog.isDemo || !viewer?.profile) return null
  const t = await getTranslations('dogShare')
  const url = dogShareUrl(siteUrl(), viewer.profile.referralCode, dog.id)
  return { url, message: t('message', { name: dog.name, city: dog.city, url }) }
}

/** The language someone uses Rondje in; the visitor's own when it is not known. */
export async function localeOf(userId: string): Promise<Locale> {
  const db = await getDb()
  const [row] = await db.select({ locale: s.profile.locale }).from(s.profile).where(eq(s.profile.userId, userId))
  if (isLocale(row?.locale)) return row.locale
  const visitor = await getLocale()
  return isLocale(visitor) ? visitor : DEFAULT_LOCALE
}
