import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { apiMember, dogLook, fail, json } from '@/server/api'
import { saveDogForm } from '@/server/dog-core'
import { dogsChanged } from '@/server/newest-dogs'
import { myDogs } from '@/server/queries'

const TEXT = ['id', 'name', 'breed', 'sex', 'ageYears', 'size', 'energy', 'level', 'story', 'needs', 'treats', 'treatsNote', 'walkMinutes', 'country', 'city', 'lat', 'lng', 'meetingInfo', 'vetInfo', 'chipNumber', 'biteNote']
// forSomeone + ownerConsent: adding a dog for someone else needs the owner's yes, as on the website (DPIA
// M5, server/dog-core.ts forSomeoneSchema). An app version that sends neither adds a dog of its own, as before.
const FLAGS = ['ppp', 'offLeash', 'insuranceConfirmed', 'healthConfirmed', 'biteHistory', 'forSomeone', 'ownerConsent']

/**
 * A refused dog: `{ error, message }` like every other app API error, with the website form's own calm
 * sentence when there is one (myDogs.errors: 'owner-consent', 'confirmations', 'bite-note').
 */
async function dogFail(code: string): Promise<NextResponse> {
  const t = await getTranslations('myDogs.errors')
  return t.has(code) ? json({ error: code, message: t(code) }, 400) : fail(code)
}

/** Your own dogs (private owners). Shelters manage their dogs on the website. */
export async function GET() {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const dogs = await myDogs(viewer)
  return json({
    dogs: dogs.map((d) => ({ id: d.id, name: d.name, breed: d.breed, status: d.status, photos: d.photos, look: dogLook(d), city: d.city, walkMinutes: d.walkMinutes })),
  })
}

/**
 * Add or edit a dog, with the same checks as the website's form (insurance, health, bite history, and
 * for someone else's dog the owner's consent: `forSomeone: true` needs `ownerConsent: true`, or 400
 * `owner-consent`).
 */
export async function POST(request: Request) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return fail('invalid')
  const form = new FormData()
  for (const key of TEXT) if (body[key] !== undefined && body[key] !== null) form.set(key, String(body[key]))
  for (const key of FLAGS) if (body[key] === true) form.set(key, 'on')
  if (Array.isArray(body.traits)) form.set('traits', body.traits.map(String).join(','))
  if (Array.isArray(body.provides)) for (const p of body.provides) form.append('provides', String(p))
  form.set('photos', JSON.stringify(Array.isArray(body.photos) ? body.photos : []))
  form.set('slots', JSON.stringify(Array.isArray(body.slots) ? body.slots : []))
  // Dogs from the app always belong to the person themselves, never to a shelter.
  form.delete('orgId')
  const result = await saveDogForm(viewer, form)
  if (!result.ok) return dogFail(result.error ?? 'invalid')
  // A dog added or changed in the app shows on the home page at once, like on the website.
  dogsChanged()
  return json({ ok: true, dogId: result.dogId }, 201)
}
