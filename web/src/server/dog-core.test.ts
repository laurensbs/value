import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'
import type { OnboardedViewer } from './session'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))
vi.mock('./session', () => ({
  isOrgMember: (viewer: { orgs: { id: string }[] }, orgId: string | null) => viewer.orgs.some((o) => o.id === orgId),
}))
// Work scheduled with after() runs at once here; flush() waits until it is done.
const later: Promise<unknown>[] = []
vi.mock('next/server', () => ({ after: (task: () => Promise<unknown>) => void later.push(task()) }))
const flush = async () => void (await Promise.all(later.splice(0)))

const { forSomeoneSchema, saveDogForm } = await import('./dog-core')

const file = (user: string, name: string) => `https://abc123.public.blob.vercel-storage.com/photos/${user}/${name}.jpg`
const viewer = (userId: string, orgs: string[] = []) =>
  ({ userId, isAdmin: false, orgs: orgs.map((id) => ({ id })), profile: { lat: null, lng: null } }) as unknown as OnboardedViewer

function dogForm(id: string, photos: string[]) {
  const form = new FormData()
  for (const [key, value] of Object.entries({
    id,
    name: 'Bello',
    sex: 'male',
    size: 'medium',
    energy: 'calm',
    level: 'starter',
    treats: 'own',
    walkMinutes: '30',
    country: 'NL',
    city: 'Utrecht',
    insuranceConfirmed: 'on',
    healthConfirmed: 'on',
    photos: JSON.stringify(photos),
  })) {
    form.set(key, value)
  }
  return form
}

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  await client.exec(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at) values
      ('ans', 'Ans', 'ans@example.org', false, now(), now()),
      ('staf', 'Staf', 'staf@example.org', false, now(), now());
    insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code, photo_url)
      values ('ans', 'Ans', '1951-01-01', 'NL', 'Utrecht', now(), '1', 'ANS234', '${file('ans', 'me')}');
    insert into organization (id, name, country, city, status) values ('opvang', 'Opvang', 'NL', 'Utrecht', 'verified');
    insert into dog (id, owner_id, name, country, city, photos) values
      ('bello', 'ans', 'Bello', 'NL', 'Utrecht', array['${file('ans', 'old')}', '${file('ans', 'keep')}', '${file('ans', 'me')}']);
    insert into dog (id, org_id, name, country, city, photos) values ('rex', 'opvang', 'Rex', 'NL', 'Utrecht', array['${file('staf', 'rex')}']);
  `)
}, 30_000)

afterAll(async () => {
  await client.close()
})

describe('saveDogForm and Vercel Blob', () => {
  it('deletes a replaced dog photo from Blob after saving, but not one that is still shown elsewhere', async () => {
    const deleteBlobs = vi.fn<(urls: string[]) => Promise<void>>(async () => {})
    const result = await saveDogForm(viewer('ans'), dogForm('bello', [file('ans', 'keep'), file('ans', 'new')]), { deleteBlobs })
    expect(result).toMatchObject({ ok: true, dogId: 'bello' })
    await flush()

    expect((await client.query(`select photos from dog where id = 'bello'`)).rows).toEqual([{ photos: [file('ans', 'keep'), file('ans', 'new')] }])
    // The old photo goes; Ans's profile picture was also on the dog, and stays.
    expect(deleteBlobs).toHaveBeenCalledTimes(1)
    expect(deleteBlobs).toHaveBeenCalledWith([file('ans', 'old')])
  })

  it('leaves a shelter dog’s photos in Blob: they belong to the shelter', async () => {
    const deleteBlobs = vi.fn<(urls: string[]) => Promise<void>>(async () => {})
    expect(await saveDogForm(viewer('staf', ['opvang']), dogForm('rex', []), { deleteBlobs })).toMatchObject({ ok: true })
    await flush()
    expect(deleteBlobs).not.toHaveBeenCalled()
  })

  it('touches nothing when the save is not allowed', async () => {
    const deleteBlobs = vi.fn<(urls: string[]) => Promise<void>>(async () => {})
    expect(await saveDogForm(viewer('staf'), dogForm('bello', []), { deleteBlobs })).toMatchObject({ ok: false, error: 'forbidden' })
    await flush()
    expect(deleteBlobs).not.toHaveBeenCalled()
  })
})

describe('adding a dog for someone else (DPIA maatregel M5)', () => {
  const newDog = (extra: Record<string, string>) => {
    const form = dogForm('', [])
    form.delete('id')
    form.set('name', 'Bobbie')
    for (const [key, value] of Object.entries(extra)) form.set(key, value)
    return form
  }
  const bobbies = async () => (await client.query(`select count(*)::int as n from dog where name = 'Bobbie'`)).rows[0]

  it('needs the box that the owner knows and agrees', async () => {
    expect(await saveDogForm(viewer('ans'), newDog({ forSomeone: 'on' }))).toEqual({ ok: false, error: 'owner-consent' })
    expect(await bobbies()).toEqual({ n: 0 })
  })

  it('goes online with that box ticked, or for your own dog without it', async () => {
    expect(await saveDogForm(viewer('ans'), newDog({ forSomeone: 'on', ownerConsent: 'on' }))).toMatchObject({ ok: true })
    expect(await saveDogForm(viewer('ans'), newDog({}))).toMatchObject({ ok: true })
    expect(await bobbies()).toEqual({ n: 2 })
  })

  it('is checked by the schema itself', () => {
    expect(forSomeoneSchema.safeParse({ forSomeone: true, ownerConsent: false }).success).toBe(false)
    expect(forSomeoneSchema.safeParse({ forSomeone: true, ownerConsent: true }).success).toBe(true)
    expect(forSomeoneSchema.safeParse({ forSomeone: false, ownerConsent: false }).success).toBe(true)
  })
})
