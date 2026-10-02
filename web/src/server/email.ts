import 'server-only'
import { after } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/config'
import { renderEmail } from '@/lib/email-layout'
import { EMAIL_KINDS, notificationHref, type NotificationData } from '@/lib/notification-links'
import { siteUrl } from '@/lib/site'

export interface Email {
  to: string
  subject: string
  html: string
  text: string
}

/** Email goes out through Resend once RESEND_API_KEY and EMAIL_FROM are set; until then nothing is sent. */
export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

/** Sends one email. Never throws: a failed email must not break the action that triggered it. */
export async function sendEmail(email: Email): Promise<boolean> {
  if (!emailEnabled()) {
    if (process.env.NODE_ENV !== 'production') console.info(`[email, not sent] ${email.to}: ${email.subject}\n${email.text}`)
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) console.error(`[email] Resend answered ${res.status}`)
    return res.ok
  } catch (error) {
    console.error('[email] sending failed', error)
    return false
  }
}

/** Sends after the response has gone out, so the person never waits for the email. */
export function sendEmailLater(email: Email): void {
  try {
    after(() => sendEmail(email).then(() => undefined))
  } catch {
    // Outside a request (scripts): just send.
    void sendEmail(email)
  }
}

export const toLocale = (value: string | null | undefined): Locale => (isLocale(value) ? value : DEFAULT_LOCALE)

export async function notificationEmail(kind: string, data: NotificationData, locale: Locale, to: string): Promise<Email | null> {
  if (!(EMAIL_KINDS as readonly string[]).includes(kind)) return null
  const t = await getTranslations({ locale, namespace: 'email' })
  const values = { dogName: data.dogName ?? '', walkerName: data.walkerName ?? '', orgName: data.orgName ?? '' }
  const subject = t(`kinds.${kind}.subject`, values)
  const { html, text } = renderEmail({
    heading: subject,
    paragraphs: [t(`kinds.${kind}.body`, values)],
    cta: { label: t('open'), url: `${siteUrl()}${notificationHref(kind, data)}` },
    footer: t('footer'),
  })
  return { to, subject, html, text }
}

export async function passwordResetEmail(url: string, locale: Locale, to: string): Promise<Email> {
  const t = await getTranslations({ locale, namespace: 'email' })
  const { html, text } = renderEmail({
    heading: t('reset.heading'),
    paragraphs: [t('reset.body'), t('reset.ignore')],
    cta: { label: t('reset.cta'), url },
    footer: t('resetFooter'),
  })
  return { to, subject: t('reset.subject'), html, text }
}
