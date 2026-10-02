import 'server-only'
import { createPrivateKey, sign } from 'node:crypto'
import { connect } from 'node:http2'
import { eq, inArray } from 'drizzle-orm'
import { after } from 'next/server'
import { getTranslations } from 'next-intl/server'
import webpush from 'web-push'
import { getDb, type Db } from '@/db'
import * as s from '@/db/schema'
import { notificationHref, notificationValues, type NotificationData } from '@/lib/notification-links'
import { isNudgeKind } from '@/lib/nudges'
import { APP_NAME } from '@/lib/site'
import { toLocale } from './email'

// Push notifications go out next to the in-app list (and email). Each channel switches on by
// itself once its keys are set; until then nothing is sent and nothing breaks.
//   Browsers: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto: or https: contact)
//   iPhone app: APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (the .p8 contents), APNS_BUNDLE_ID

export function webPushKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY ? process.env.VAPID_PUBLIC_KEY : null
}

function apnsConfigured(): boolean {
  return Boolean(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_PRIVATE_KEY && process.env.APNS_BUNDLE_ID)
}

/** Whether a device of this kind ('web' or 'apns') can get a push now, i.e. its keys are set. */
export function canPush(kind: string): boolean {
  return kind === 'apns' ? apnsConfigured() : Boolean(webPushKey())
}

export interface PushMessage {
  title: string
  body: string
  url: string
  tag: string
}

type Device = typeof s.pushDevice.$inferSelect

/** Saves a browser subscription or an iPhone token for this person. A device that changed hands moves to the new account. */
export async function registerDevice(
  userId: string,
  device: { kind: 'web' | 'apns'; endpoint: string; keys?: { p256dh: string; auth: string } | null; sandbox?: boolean },
): Promise<void> {
  const db = await getDb()
  await db
    .insert(s.pushDevice)
    .values({ id: crypto.randomUUID(), userId, kind: device.kind, endpoint: device.endpoint, keys: device.keys ?? null, sandbox: device.sandbox ?? false })
    .onConflictDoUpdate({ target: s.pushDevice.endpoint, set: { userId, keys: device.keys ?? null, sandbox: device.sandbox ?? false } })
}

export async function removeDevice(userId: string, endpoint: string): Promise<void> {
  const db = await getDb()
  const [row] = await db.select().from(s.pushDevice).where(eq(s.pushDevice.endpoint, endpoint))
  if (row?.userId === userId) await db.delete(s.pushDevice).where(eq(s.pushDevice.id, row.id))
}

/** Sends a notification to everyone's devices after the response has gone out. Never throws. */
export function pushLater(db: Db, userIds: string[], kind: string, data: NotificationData): void {
  if (!userIds.length || (!webPushKey() && !apnsConfigured())) return
  const run = () => pushNow(db, userIds, kind, data).catch((error) => console.error('[push] failed', error))
  try {
    after(run)
  } catch {
    void run()
  }
}

/** Sends and waits until it is done: for scheduled jobs. Banned people and dead devices are skipped. */
export async function pushNow(db: Db, userIds: string[], kind: string, data: NotificationData): Promise<void> {
  const rows = await db
    .select({ device: s.pushDevice, locale: s.profile.locale, bannedAt: s.profile.bannedAt })
    .from(s.pushDevice)
    .innerJoin(s.profile, eq(s.profile.userId, s.pushDevice.userId))
    .where(inArray(s.pushDevice.userId, userIds))
  const dead: string[] = []
  for (const { device, locale, bannedAt } of rows) {
    if (bannedAt) continue
    const message = await pushMessage(kind, data, toLocale(locale))
    const ok = device.kind === 'apns' ? await sendApns(device, message) : await sendWeb(device, message)
    if (!ok) dead.push(device.id)
  }
  if (dead.length) await db.delete(s.pushDevice).where(inArray(s.pushDevice.id, dead))
}

export async function pushMessage(kind: string, data: NotificationData, locale: ReturnType<typeof toLocale>): Promise<PushMessage> {
  const t = await getTranslations({ locale, namespace: 'notifications' })
  const body = t.has(`kinds.${kind}`) ? t(`kinds.${kind}`, notificationValues(data)) : t('title')
  // One visible notification per conversation or walk, and one reminder: a newer one replaces the older.
  const tag = isNudgeKind(kind) ? 'nudge' : data.requestId ? `${kind}:${data.requestId}` : data.walkId ? `${kind}:${data.walkId}` : kind
  return { title: APP_NAME, body, url: notificationHref(kind, data), tag }
}

/** False when the subscription is gone for good and should be removed. */
async function sendWeb(device: Device, message: PushMessage): Promise<boolean> {
  const key = webPushKey()
  const keys = device.keys as { p256dh: string; auth: string } | null
  if (!key || !keys) return true
  try {
    await webpush.sendNotification({ endpoint: device.endpoint, keys }, JSON.stringify(message), {
      vapidDetails: { subject: process.env.VAPID_SUBJECT || 'mailto:hallo@example.com', publicKey: key, privateKey: process.env.VAPID_PRIVATE_KEY! },
      TTL: 60 * 60,
      urgency: message.tag.startsWith('walk-overdue') ? 'high' : 'normal',
    })
    return true
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    return !(status === 404 || status === 410)
  }
}

let apnsToken: { value: string; at: number } | null = null

/** The signed JWT APNs wants; Apple accepts one for up to an hour, so it is reused for 50 minutes. */
export function apnsJwt(now = Date.now()): string {
  if (apnsToken && now - apnsToken.at < 50 * 60_000) return apnsToken.value
  const b64 = (v: object | Buffer) => (Buffer.isBuffer(v) ? v : Buffer.from(JSON.stringify(v))).toString('base64url')
  const head = b64({ alg: 'ES256', kid: process.env.APNS_KEY_ID })
  const claims = b64({ iss: process.env.APNS_TEAM_ID, iat: Math.floor(now / 1000) })
  const key = createPrivateKey(process.env.APNS_PRIVATE_KEY!.replace(/\\n/g, '\n'))
  const signature = sign('sha256', Buffer.from(`${head}.${claims}`), { key, dsaEncoding: 'ieee-p1363' })
  apnsToken = { value: `${head}.${claims}.${b64(signature)}`, at: now }
  return apnsToken.value
}

/** False when Apple says the token is no longer valid. */
async function sendApns(device: Device, message: PushMessage): Promise<boolean> {
  if (!apnsConfigured()) return true
  const host = device.sandbox ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com'
  const payload = JSON.stringify({
    aps: { alert: { title: message.title, body: message.body }, sound: 'default', 'thread-id': message.tag },
    url: message.url,
  })
  return new Promise((resolve) => {
    const client = connect(host)
    const done = (alive: boolean) => {
      client.close()
      resolve(alive)
    }
    client.on('error', () => done(true))
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${device.endpoint}`,
      authorization: `bearer ${apnsJwt()}`,
      'apns-topic': process.env.APNS_BUNDLE_ID!,
      'apns-push-type': 'alert',
      'apns-collapse-id': message.tag.slice(0, 64),
      'content-type': 'application/json',
    })
    req.setTimeout(8000, () => {
      req.close()
      done(true)
    })
    let status = 0
    let body = ''
    req.on('response', (h) => (status = Number(h[':status'])))
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => done(!(status === 410 || (status === 400 && /BadDeviceToken|DeviceTokenNotForTopic/.test(body)))))
    req.on('error', () => done(true))
    req.end(payload)
  })
}
