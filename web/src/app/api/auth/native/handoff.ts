import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { BetterAuthPlugin } from 'better-auth'
import { APIError, createAuthEndpoint, getSessionFromCtx } from 'better-auth/api'
import { deleteSessionCookie, expireCookie, setSessionCookie } from 'better-auth/cookies'
import { generateIdTokenNonce, generateState, getOAuthCallbackPath } from 'better-auth/oauth2'
import * as z from 'zod'

/**
 * "Doorgaan met Google/Apple" for the native iPhone app, without Google or Apple SDKs.
 *
 * These are Better Auth endpoints (plugin below), so the existing catch-all route
 * src/app/api/auth/[...all]/route.ts serves them at /api/auth/native/*:
 *
 * 1. GET  /api/auth/native/start?provider=google|apple[&codeChallenge=…]
 *    The app opens this in ASWebAuthenticationSession. We remember the flow (row in the
 *    `verification` table + an httpOnly cookie) and send the browser to Google/Apple with the
 *    normal web callback (/api/auth/callback/<provider>), which then lands on …/finish.
 * 2. GET  /api/auth/native/finish
 *    Only works in the same browser, right after that sign-in (the session must be newer than
 *    the flow). Creates a single-use code (32 random bytes, 2 minutes), signs the browser out
 *    again and redirects to rondje://auth/callback?code=…  (errors: ?error=<short-code>).
 * 3. POST /api/auth/native/exchange  { code, codeVerifier? }
 *    Burns the code and opens a fresh session for the app: 200 { ok: true } plus the signed
 *    token in the `set-auth-token` header (the bearer plugin adds it, exactly as for
 *    /sign-in/email). Anything else: 400 { code: "invalid-code" }.
 *
 * Only the fixed app address below is ever used as a redirect target, so this can never be
 * an open redirect. Codes are stored hashed. Optional PKCE (codeChallenge = base64url of the
 * SHA-256 of codeVerifier) binds a code to the app that started the flow.
 */

export const APP_CALLBACK = 'rondje://auth/callback'
export const NATIVE_PROVIDERS = ['google', 'apple'] as const
export type NativeProvider = (typeof NATIVE_PROVIDERS)[number]

/** How long the browser leg may take (consent screens, Face ID, 2FA). */
export const FLOW_TTL_MS = 10 * 60 * 1000
/** How long the app has to swap the code for a session. */
export const CODE_TTL_MS = 2 * 60 * 1000
/** Clock skew allowed between "flow started" and "session created" (both server clocks). */
const FRESH_SKEW_MS = 2 * 1000

/** The context every Better Auth endpoint gets (typed via a public helper). */
type Ctx = Parameters<typeof generateState>[0]

const FLOW_COOKIE = 'native_flow'
const FLOW_PREFIX = 'rondje-native-flow:'
const CODE_PREFIX = 'rondje-native-code:'

/** Short error codes the app can show a message for. */
export type HandoffError =
  | 'provider-unavailable'
  | 'invalid-request'
  | 'cancelled'
  | 'account-not-linked'
  | 'expired'
  | 'sign-in-failed'

/** A random, URL-safe secret: 32 bytes as base64url (43 characters). */
export function randomCode(): string {
  return randomBytes(32).toString('base64url')
}

export function sha256Base64Url(value: string): string {
  return createHash('sha256').update(value).digest('base64url')
}

const BASE64URL_43 = /^[A-Za-z0-9_-]{43}$/

/** A PKCE challenge: the base64url SHA-256 of a verifier (always 43 characters). */
export function isValidChallenge(value: unknown): value is string {
  return typeof value === 'string' && BASE64URL_43.test(value)
}

/** PKCE S256: does this verifier belong to the challenge given at the start? */
export function verifierMatches(challenge: string, verifier: unknown): boolean {
  if (typeof verifier !== 'string' || verifier.length < 43 || verifier.length > 128) return false
  const a = Buffer.from(sha256Base64Url(verifier))
  const b = Buffer.from(challenge)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** The app's callback address with either a code or an error; nothing else is ever added. */
export function appCallbackURL(result: { code: string } | { error: HandoffError }): string {
  const params = new URLSearchParams('code' in result ? { code: result.code } : { error: result.error })
  return `${APP_CALLBACK}?${params.toString()}`
}

/** Better Auth / provider error codes (…/finish?error=…) mapped onto the app's short codes. */
export function mapProviderError(error: string): HandoffError {
  if (error === 'access_denied' || error === 'user_cancelled_authorize' || error === 'user_cancelled_login') return 'cancelled'
  if (error === 'account_not_linked') return 'account-not-linked'
  return 'sign-in-failed'
}

export const codeIdentifier = (code: string) => `${CODE_PREFIX}${sha256Base64Url(code)}`
export const flowIdentifier = (flowId: string) => `${FLOW_PREFIX}${sha256Base64Url(flowId)}`

interface FlowData {
  startedAt: number
  codeChallenge?: string
}

interface CodeData {
  userId: string
  codeChallenge?: string
}

function parse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function flowCookie(ctx: Ctx) {
  // httpOnly, SameSite=Lax (sent on the redirect back from Google/Apple), Secure on https.
  return ctx.context.createAuthCookie(FLOW_COOKIE, { maxAge: FLOW_TTL_MS / 1000, path: '/api/auth/native' })
}

function toApp(ctx: Ctx, result: { code: string } | { error: HandoffError }): never {
  ctx.setHeader('Cache-Control', 'no-store')
  throw ctx.redirect(appCallbackURL(result))
}

const startQuery = z
  .object({
    provider: z.string().optional(),
    codeChallenge: z.string().optional(),
  })
  .optional()

const finishQuery = z
  .object({
    error: z.string().optional(),
  })
  .optional()

const exchangeBody = z.object({
  code: z.string().max(200),
  codeVerifier: z.string().max(200).optional(),
})

const invalidCode = () => new APIError('BAD_REQUEST', { code: 'invalid-code', message: 'This sign-in code is invalid, used or expired.' })

export function nativeHandoff() {
  return {
    id: 'rondje-native-handoff',
    endpoints: {
      nativeStart: createAuthEndpoint('/native/start', { method: 'GET', query: startQuery }, async (ctx) => {
        const id = ctx.query?.provider
        const provider = NATIVE_PROVIDERS.includes(id as NativeProvider)
          ? ctx.context.socialProviders.find((p) => p.id === id)
          : undefined
        if (!provider) toApp(ctx, { error: 'provider-unavailable' })
        const codeChallenge = ctx.query?.codeChallenge
        if (codeChallenge !== undefined && !isValidChallenge(codeChallenge)) toApp(ctx, { error: 'invalid-request' })

        const flowId = randomCode()
        await ctx.context.internalAdapter.createVerificationValue({
          identifier: flowIdentifier(flowId),
          value: JSON.stringify({ startedAt: Date.now(), codeChallenge } satisfies FlowData),
          expiresAt: new Date(Date.now() + FLOW_TTL_MS),
        })
        const cookie = flowCookie(ctx)
        ctx.setCookie(cookie.name, flowId, cookie.attributes)

        // The same redirect Better Auth's /sign-in/social builds, with our finish page as the
        // place to land on (success and failure alike).
        const finish = `${ctx.context.baseURL}/native/finish`
        const idTokenNonce = generateIdTokenNonce(provider)
        const { state, codeVerifier } = await generateState(
          { ...ctx, body: { callbackURL: finish, newUserCallbackURL: finish, errorCallbackURL: finish } } as Ctx,
          { idTokenNonce },
        )
        const url = await provider.createAuthorizationURL({
          state,
          codeVerifier,
          idTokenNonce,
          redirectURI: `${ctx.context.baseURL}${getOAuthCallbackPath(provider)}`,
          // Always let people pick the account (never a silent sign-in with whatever Google
          // account happens to be active in the browser).
          ...(provider.id === 'google' ? { additionalParams: { prompt: 'select_account' } } : {}),
        })
        ctx.setHeader('Cache-Control', 'no-store')
        throw ctx.redirect(url.toString())
      }),

      nativeFinish: createAuthEndpoint('/native/finish', { method: 'GET', query: finishQuery }, async (ctx) => {
        const cookie = flowCookie(ctx)
        const flowId = ctx.getCookie(cookie.name)
        expireCookie(ctx, cookie)
        const flowRow = flowId ? await ctx.context.internalAdapter.consumeVerificationValue(flowIdentifier(flowId)) : null
        const flow = flowRow ? parse<FlowData>(flowRow.value) : null

        // Only a session that this very flow created is handed over. One from before (someone
        // sent a signed-in browser straight here) is never handed out, and is left alone.
        const session = await getSessionFromCtx(ctx, { disableRefresh: true })
        const fresh = session && flow && new Date(session.session.createdAt).getTime() >= flow.startedAt - FRESH_SKEW_MS ? session : null
        if (fresh) {
          // The browser does not stay signed in: this session only existed to reach the app.
          await ctx.context.internalAdapter.deleteSession(fresh.session.token)
          deleteSessionCookie(ctx)
        }

        if (ctx.query?.error) toApp(ctx, { error: mapProviderError(ctx.query.error) })
        if (!flow || !fresh) toApp(ctx, { error: 'expired' })

        const code = randomCode()
        await ctx.context.internalAdapter.createVerificationValue({
          identifier: codeIdentifier(code),
          value: JSON.stringify({ userId: fresh.user.id, codeChallenge: flow.codeChallenge } satisfies CodeData),
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
        })
        toApp(ctx, { code })
      }),

      nativeExchange: createAuthEndpoint('/native/exchange', { method: 'POST', body: exchangeBody }, async (ctx) => {
        // Single use: the row is deleted (race-safe) before anything is checked, expired rows
        // come back as null.
        const row = await ctx.context.internalAdapter.consumeVerificationValue(codeIdentifier(ctx.body.code))
        const data = row ? parse<CodeData>(row.value) : null
        if (!data?.userId) throw invalidCode()
        if (data.codeChallenge && !verifierMatches(data.codeChallenge, ctx.body.codeVerifier)) throw invalidCode()

        const user = await ctx.context.internalAdapter.findUserById(data.userId)
        if (!user) throw invalidCode()
        const session = await ctx.context.internalAdapter.createSession(user.id)
        if (!session) throw new APIError('INTERNAL_SERVER_ERROR', { code: 'session-failed', message: 'Could not create a session.' })
        // Sets the session cookie; the bearer plugin turns it into the signed `set-auth-token`.
        await setSessionCookie(ctx, { session, user })
        ctx.setHeader('Cache-Control', 'no-store')
        return ctx.json({ ok: true })
      }),
    },
    rateLimit: [
      // A code is 256 random bits, so this is about noise, not guessing.
      { pathMatcher: (path: string) => path === '/native/exchange', window: 60, max: 10 },
      { pathMatcher: (path: string) => path === '/native/start', window: 60, max: 20 },
    ],
  } satisfies BetterAuthPlugin
}
