import { createHash, createSign, generateKeyPairSync, type KeyObject } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

// The real auth config (src/lib/auth.ts) on an in-memory database, with Google and Apple
// switched on with test keys. Apple's and Google's public keys are served by a local fetch stub,
// so identity tokens signed here verify exactly like real ones would.

const BASE = 'http://localhost:3311'
const BUNDLE_ID = 'app.rondje.mobile'
const SERVICES_ID = 'app.rondje.web'
const GOOGLE_CLIENT = 'test-client.apps.googleusercontent.com'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ db, getDb: async () => db, ready: async () => undefined }))
vi.mock('@/server/email', () => ({ passwordResetEmail: vi.fn(), sendEmail: vi.fn(), toLocale: (l: unknown) => l }))

vi.stubEnv('BETTER_AUTH_URL', BASE)
vi.stubEnv('GOOGLE_CLIENT_ID', GOOGLE_CLIENT)
vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-google-secret')
vi.stubEnv('APPLE_CLIENT_ID', SERVICES_ID)
vi.stubEnv('APPLE_CLIENT_SECRET', 'test-apple-secret')
vi.stubEnv('APPLE_APP_BUNDLE_ID', BUNDLE_ID)

const { auth, appleNativeEnabled, enabledSocialProviders } = await import('./auth')

// ---------- Identity tokens signed with local keys ----------

function rsaKey(kid: string) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  return { kid, privateKey, jwk: { ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' } }
}
const appleKey = rsaKey('apple-test')
const googleKey = rsaKey('google-test')

function jwt(key: { kid: string; privateKey: KeyObject }, claims: Record<string, unknown>): string {
  const enc = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const body = `${enc({ alg: 'RS256', kid: key.kid, typ: 'JWT' })}.${enc({ iat: now, exp: now + 600, ...claims })}`
  return `${body}.${createSign('RSA-SHA256').update(body).sign(key.privateKey).toString('base64url')}`
}

const sha256Hex = (v: string) => createHash('sha256').update(v).digest('hex')

/** What the app gets from ASAuthorizationAppleIDCredential: the nonce claim is SHA-256(raw nonce). */
function appleToken(email: string, opts: { sub?: string; rawNonce?: string; aud?: string } = {}) {
  const rawNonce = opts.rawNonce ?? `raw-${Math.random()}`
  const token = jwt(appleKey, {
    iss: 'https://appleid.apple.com',
    aud: opts.aud ?? BUNDLE_ID,
    sub: opts.sub ?? `apple-${email}`,
    email,
    email_verified: 'true',
    nonce: sha256Hex(rawNonce),
    nonce_supported: true,
  })
  return { token, rawNonce }
}

function googleToken(email: string, emailVerified = true) {
  return jwt(googleKey, {
    iss: 'https://accounts.google.com',
    aud: GOOGLE_CLIENT,
    sub: `google-${email}`,
    email,
    email_verified: emailVerified,
    name: 'Test Google',
  })
}

const realFetch = globalThis.fetch
vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url === 'https://appleid.apple.com/auth/keys') return Response.json({ keys: [appleKey.jwk] })
  if (url === 'https://www.googleapis.com/oauth2/v3/certs') return Response.json({ keys: [googleKey.jwk] })
  if (url.startsWith(BASE)) return realFetch(input, init)
  throw new Error(`Unexpected network call in test: ${url}`)
})

// ---------- Talking HTTP to the real handler ----------

type Jar = Map<string, string>

function remember(jar: Jar, res: Response): Jar {
  for (const line of res.headers.getSetCookie()) {
    const [pair, ...attrs] = line.split(';')
    const eq = pair.indexOf('=')
    const name = pair.slice(0, eq).trim()
    const value = pair.slice(eq + 1).trim()
    if (!value || attrs.some((a) => /^\s*max-age=0\s*$/i.test(a))) jar.delete(name)
    else jar.set(name, value)
  }
  return jar
}

const cookieHeader = (jar: Jar) => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')

async function call(path: string, init: { method?: string; body?: unknown; jar?: Jar; bearer?: string; headers?: Record<string, string> } = {}) {
  const headers = new Headers(init.headers)
  if (init.body !== undefined) headers.set('content-type', 'application/json')
  if (init.jar?.size) headers.set('cookie', cookieHeader(init.jar))
  if (init.bearer) headers.set('authorization', `Bearer ${init.bearer}`)
  const res = await auth.handler(
    new Request(`${BASE}${path}`, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      redirect: 'manual',
    }),
  )
  if (init.jar) remember(init.jar, res)
  return res
}

async function sessionFor(bearer: string) {
  const res = await call('/api/auth/get-session', { bearer })
  return (await res.json()) as { user: { id: string; email: string; name: string; emailVerified: boolean }; session: { id: string } } | null
}

async function signUp(email: string, jar?: Jar) {
  const res = await call('/api/auth/sign-up/email', { body: { name: 'Test', email, password: 'een-goed-wachtwoord' }, jar })
  expect(res.status).toBe(200)
  return res.headers.get('set-auth-token')!
}

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
}, 30_000)

afterEach(() => {
  vi.useRealTimers()
})

afterAll(async () => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  await client.close()
})

describe('config for the app', () => {
  it('reports the providers that have keys, and the native Apple sheet', () => {
    expect(enabledSocialProviders).toEqual(['google', 'apple'])
    expect(appleNativeEnabled).toBe(true)
  })
})

describe('Sign in with Apple in the native app (identity token)', () => {
  it('signs in, creates the account with the name Apple sent, and returns a usable bearer token', async () => {
    const { token, rawNonce } = appleToken('fleur@rondje.test')
    const res = await call('/api/auth/sign-in/social', {
      body: { provider: 'apple', idToken: { token, nonce: rawNonce, user: { name: { firstName: 'Fleur', lastName: 'de Vries' } } } },
    })
    expect(res.status).toBe(200)
    const bearer = res.headers.get('set-auth-token')
    expect(bearer).toBeTruthy()
    const session = await sessionFor(bearer!)
    expect(session?.user).toMatchObject({ email: 'fleur@rondje.test', name: 'Fleur de Vries', emailVerified: true })

    // The `token` in the JSON body is unsigned; with requireSignature only the header works.
    const body = (await res.json()) as { token: string }
    expect(await sessionFor(body.token)).toBeNull()

    // Signing in again (Apple sends no name then) is the same account.
    const again = appleToken('fleur@rondje.test')
    const res2 = await call('/api/auth/sign-in/social', { body: { provider: 'apple', idToken: { token: again.token, nonce: again.rawNonce } } })
    expect(res2.status).toBe(200)
    expect((await sessionFor(res2.headers.get('set-auth-token')!))?.user.id).toBe(session?.user.id)
  })

  it('refuses a wrong nonce, a token for another audience and a forged signature', async () => {
    const { token } = appleToken('nonce@rondje.test')
    expect((await call('/api/auth/sign-in/social', { body: { provider: 'apple', idToken: { token, nonce: 'other' } } })).status).toBe(401)

    const web = appleToken('aud@rondje.test', { aud: 'com.someone.else' })
    expect((await call('/api/auth/sign-in/social', { body: { provider: 'apple', idToken: { token: web.token, nonce: web.rawNonce } } })).status).toBe(401)

    const forged = appleToken('forged@rondje.test')
    const [h, p] = forged.token.split('.')
    const tampered = `${h}.${p}.${jwt(googleKey, {}).split('.')[2]}`
    expect((await call('/api/auth/sign-in/social', { body: { provider: 'apple', idToken: { token: tampered, nonce: forged.rawNonce } } })).status).toBe(401)
  })
})

describe('one account per e-mail address', () => {
  it('Apple or Google after a password sign-up: asks for the password once, then links', async () => {
    const passwordBearer = await signUp('anne@rondje.test')
    const userId = (await sessionFor(passwordBearer))?.user.id

    // Nobody proved this address yet, so Apple may not silently take over the account…
    const first = appleToken('anne@rondje.test')
    const refused = await call('/api/auth/sign-in/social', { body: { provider: 'apple', idToken: { token: first.token, nonce: first.rawNonce } } })
    expect(refused.status).toBe(401)
    expect(await refused.json()).toMatchObject({ code: 'OAUTH_LINK_ERROR', message: 'account not linked' })

    // …but once signed in with the password, the app links Apple with the same identity token.
    const link = await call('/api/auth/link-social', { bearer: passwordBearer, body: { provider: 'apple', idToken: { token: first.token, nonce: first.rawNonce } } })
    expect(link.status).toBe(200)

    const later = appleToken('anne@rondje.test')
    const res = await call('/api/auth/sign-in/social', { body: { provider: 'apple', idToken: { token: later.token, nonce: later.rawNonce } } })
    expect(res.status).toBe(200)
    expect((await sessionFor(res.headers.get('set-auth-token')!))?.user.id).toBe(userId)
    // The password keeps working too.
    const pw = await call('/api/auth/sign-in/email', { body: { email: 'anne@rondje.test', password: 'een-goed-wachtwoord' } })
    expect((await sessionFor(pw.headers.get('set-auth-token')!))?.user.id).toBe(userId)
  })

  it('Apple first, then Google with the same verified address: the same account', async () => {
    const { token, rawNonce } = appleToken('bram@rondje.test')
    const apple = await call('/api/auth/sign-in/social', { body: { provider: 'apple', idToken: { token, nonce: rawNonce } } })
    const userId = (await sessionFor(apple.headers.get('set-auth-token')!))?.user.id

    const google = await call('/api/auth/sign-in/social', { body: { provider: 'google', idToken: { token: googleToken('bram@rondje.test') } } })
    expect(google.status).toBe(200)
    expect((await sessionFor(google.headers.get('set-auth-token')!))?.user.id).toBe(userId)
  })

  it('an unverified Google address never joins an existing account', async () => {
    const { token, rawNonce } = appleToken('cas@rondje.test')
    await call('/api/auth/sign-in/social', { body: { provider: 'apple', idToken: { token, nonce: rawNonce } } })
    const google = await call('/api/auth/sign-in/social', { body: { provider: 'google', idToken: { token: googleToken('cas@rondje.test', false) } } })
    expect(google.status).toBe(401)
  })

  it('a password sign-up with an address that already has an account is refused', async () => {
    const { token, rawNonce } = appleToken('dewi@rondje.test')
    await call('/api/auth/sign-in/social', { body: { provider: 'apple', idToken: { token, nonce: rawNonce } } })
    const res = await call('/api/auth/sign-up/email', { body: { name: 'X', email: 'dewi@rondje.test', password: 'een-goed-wachtwoord' } })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(((await res.json()) as { code: string }).code).toMatch(/^USER_ALREADY_EXISTS/)
  })
})

describe('native web handoff (Google, or Apple without the system sheet)', () => {
  /** start → (Google/Apple, here simulated by a fresh sign-in in the same browser) → finish. */
  async function runFlow(opts: { codeChallenge?: string; email?: string } = {}) {
    const jar: Jar = new Map()
    const query = new URLSearchParams({ provider: 'google', ...(opts.codeChallenge ? { codeChallenge: opts.codeChallenge } : {}) })
    const start = await call(`/api/auth/native/start?${query}`, { jar })
    expect(start.status).toBe(302)
    const email = opts.email ?? `flow-${Math.random().toString(36).slice(2)}@rondje.test`
    const bearer = await signUp(email, jar)
    const finish = await call('/api/auth/native/finish', { jar })
    return { start, finish, jar, bearer, location: finish.headers.get('location') ?? '' }
  }

  const codeFrom = (location: string) => new URL(location).searchParams.get('code')!

  it('start sends the browser to Google with the normal callback and an account chooser', async () => {
    const jar: Jar = new Map()
    const res = await call('/api/auth/native/start?provider=google', { jar })
    expect(res.status).toBe(302)
    const url = new URL(res.headers.get('location')!)
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('redirect_uri')).toBe(`${BASE}/api/auth/callback/google`)
    expect(url.searchParams.get('prompt')).toBe('select_account')
    expect(url.searchParams.get('client_id')).toBe(GOOGLE_CLIENT)
    expect([...jar.keys()]).toEqual(expect.arrayContaining(['better-auth.native_flow', 'better-auth.state']))
    expect(res.headers.getSetCookie().find((c) => c.startsWith('better-auth.native_flow'))).toMatch(/HttpOnly/i)
  })

  it('start for an unknown or unconfigured provider goes straight back to the app', async () => {
    for (const q of ['provider=facebook', '', 'provider=google&codeChallenge=nope']) {
      const res = await call(`/api/auth/native/start?${q}`)
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toMatch(/^rondje:\/\/auth\/callback\?error=(provider-unavailable|invalid-request)$/)
    }
  })

  it('finish → code → exchange gives the app its own session; the browser is signed out', async () => {
    const { location, jar, bearer } = await runFlow()
    expect(location).toMatch(/^rondje:\/\/auth\/callback\?code=[A-Za-z0-9_-]{43}$/)
    expect(jar.has('better-auth.session_token')).toBe(false)
    expect(await sessionFor(bearer)).toBeNull() // the browser's session is gone

    const res = await call('/api/auth/native/exchange', { body: { code: codeFrom(location) } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    const appToken = res.headers.get('set-auth-token')!
    const session = await sessionFor(appToken)
    expect(session?.user.email).toMatch(/^flow-.*@rondje\.test$/)

    // Single use.
    const again = await call('/api/auth/native/exchange', { body: { code: codeFrom(location) } })
    expect(again.status).toBe(400)
    expect(await again.json()).toMatchObject({ code: 'invalid-code' })
  })

  it('codes expire after two minutes and unknown codes are refused', async () => {
    const { location } = await runFlow()
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 3 * 60 * 1000 })
    expect((await call('/api/auth/native/exchange', { body: { code: codeFrom(location) } })).status).toBe(400)
    vi.useRealTimers()
    expect((await call('/api/auth/native/exchange', { body: { code: 'x'.repeat(43) } })).status).toBe(400)
  })

  it('with PKCE the code only works together with the verifier', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'

    const stolen = await runFlow({ codeChallenge: challenge })
    expect((await call('/api/auth/native/exchange', { body: { code: codeFrom(stolen.location) } })).status).toBe(400)
    // A failed attempt burns the code.
    expect((await call('/api/auth/native/exchange', { body: { code: codeFrom(stolen.location), codeVerifier: verifier } })).status).toBe(400)

    const ok = await runFlow({ codeChallenge: challenge })
    const res = await call('/api/auth/native/exchange', { body: { code: codeFrom(ok.location), codeVerifier: verifier } })
    expect(res.status).toBe(200)
    expect(await sessionFor(res.headers.get('set-auth-token')!)).not.toBeNull()
  })

  it('never hands out a session that existed before the flow, and needs the flow cookie', async () => {
    const jar: Jar = new Map()
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() - 60 * 1000 })
    const older = await signUp('older@rondje.test', jar) // signed in a minute ago
    vi.useRealTimers()
    await call('/api/auth/native/start?provider=google', { jar })
    const finish = await call('/api/auth/native/finish', { jar })
    expect(finish.headers.get('location')).toBe('rondje://auth/callback?error=expired')
    expect(await sessionFor(older)).not.toBeNull() // left alone

    const bare = await call('/api/auth/native/finish', { jar: new Map([['better-auth.session_token', jar.get('better-auth.session_token')!]]) })
    expect(bare.headers.get('location')).toBe('rondje://auth/callback?error=expired')
  })

  it('passes provider errors on as short codes', async () => {
    for (const [error, expected] of [
      ['access_denied', 'cancelled'],
      ['user_cancelled_authorize', 'cancelled'],
      ['account_not_linked', 'account-not-linked'],
      ['invalid_code', 'sign-in-failed'],
    ]) {
      const jar: Jar = new Map()
      await call('/api/auth/native/start?provider=apple', { jar })
      const res = await call(`/api/auth/native/finish?error=${error}`, { jar })
      expect(res.headers.get('location')).toBe(`rondje://auth/callback?error=${expected}`)
    }
  })
})
