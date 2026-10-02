import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ after: (fn: () => unknown) => void fn() }))
vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }))

const { emailEnabled, notificationEmail, sendEmail } = await import('./email')

const mail = { to: 'ans@example.org', subject: 'Onderwerp', html: '<p>Hoi</p>', text: 'Hoi' }

describe('sendEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sends nothing until Resend is set up', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('RESEND_API_KEY', '')
    expect(emailEnabled()).toBe(false)
    expect(await sendEmail(mail)).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts to Resend with the key and the sender', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('EMAIL_FROM', 'Rondje <hallo@example.org>')
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await sendEmail(mail)).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test')
    expect(JSON.parse(String(init.body))).toMatchObject({ from: 'Rondje <hallo@example.org>', to: ['ans@example.org'], subject: 'Onderwerp' })
  })

  it('never throws when sending fails', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('EMAIL_FROM', 'Rondje <hallo@example.org>')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    expect(await sendEmail(mail)).toBe(false)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 422 })))
    expect(await sendEmail(mail)).toBe(false)
  })
})

describe('notificationEmail', () => {
  it('only for the notifications worth an email, with a link back to Rondje', async () => {
    expect(await notificationEmail('walk-started', {}, 'nl', 'ans@example.org')).toBeNull()
    const email = await notificationEmail('walk-overdue', { walkId: 'w1', dogName: 'Bello' }, 'nl', 'ans@example.org')
    expect(email?.to).toBe('ans@example.org')
    expect(email?.subject).toBe('kinds.walk-overdue.subject')
    expect(email?.text).toMatch(/\/walk\/w1$/m)
  })
})
