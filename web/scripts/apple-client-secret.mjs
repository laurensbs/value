#!/usr/bin/env node
// Makes APPLE_CLIENT_SECRET for "Inloggen met Apple" on the website: a JWT signed with the .p8
// key from the Apple Developer account. Runs locally, prints the secret, stores nothing.
// Apple accepts at most 6 months, so make a new one before it expires (see docs/LAUNCH.md).
//
//   node scripts/apple-client-secret.mjs --team ABCDE12345 --key-id XYZ987WVU6 \
//     --client-id app.rondje.web --key ~/Downloads/AuthKey_XYZ987WVU6.p8
//
// Or with environment variables: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID, APPLE_PRIVATE_KEY_PATH.
// Never commit the .p8 file or the output.

import { createPrivateKey, sign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { parseArgs } from 'node:util'

const MAX_DAYS = 180 // Apple: no more than 15777000 seconds (about 6 months)

const { values } = parseArgs({
  options: {
    team: { type: 'string' },
    'key-id': { type: 'string' },
    'client-id': { type: 'string' },
    key: { type: 'string' },
    days: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
})

if (values.help) {
  console.log('Usage: node scripts/apple-client-secret.mjs --team <Team ID> --key-id <Key ID> --client-id <Services ID> --key <AuthKey_….p8> [--days 180]')
  process.exit(0)
}

const teamId = values.team ?? process.env.APPLE_TEAM_ID
const keyId = values['key-id'] ?? process.env.APPLE_KEY_ID
const clientId = values['client-id'] ?? process.env.APPLE_CLIENT_ID
const keyPath = (values.key ?? process.env.APPLE_PRIVATE_KEY_PATH ?? '').replace(/^~(?=\/)/, homedir())
const days = Number(values.days ?? MAX_DAYS)

const missing = [
  ['--team (APPLE_TEAM_ID)', teamId],
  ['--key-id (APPLE_KEY_ID)', keyId],
  ['--client-id (APPLE_CLIENT_ID, the Services ID)', clientId],
  ['--key (APPLE_PRIVATE_KEY_PATH, the .p8 file)', keyPath],
].filter(([, v]) => !v)
if (missing.length) {
  console.error(`Missing: ${missing.map(([name]) => name).join(', ')}\nRun with --help for an example.`)
  process.exit(1)
}
if (!Number.isFinite(days) || days < 1 || days > MAX_DAYS) {
  console.error(`--days must be between 1 and ${MAX_DAYS}.`)
  process.exit(1)
}

let key
try {
  key = createPrivateKey(readFileSync(keyPath, 'utf8'))
} catch (error) {
  console.error(`Could not read the .p8 key at ${keyPath}: ${error.message}`)
  process.exit(1)
}

const now = Math.floor(Date.now() / 1000)
const exp = now + days * 24 * 60 * 60
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const unsigned = `${encode({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${encode({
  iss: teamId,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  sub: clientId,
})}`
// ES256 in a JWT is the raw r||s signature, not DER.
const signature = sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')

console.log(`${unsigned}.${signature}`)
console.error(`\nAPPLE_CLIENT_SECRET above is valid until ${new Date(exp * 1000).toISOString().slice(0, 10)}. Make a new one before then.`)
