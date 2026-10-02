import { NextResponse } from 'next/server'
import { apiMember, dogLook, fail, json } from '@/server/api'
import { saveDogForm } from '@/server/dog-core'
import { myDogs } from '@/server/queries'

const TEXT = ['id', 'name', 'breed', 'sex', 'ageYears', 'size', 'energy', 'level', 'story', 'needs', 'treats', 'treatsNote', 'walkMinutes', 'country', 'city', 'lat', 'lng', 'meetingInfo', 'vetInfo', 'chipNumber', 'biteNote']
const FLAGS = ['ppp', 'offLeash', 'insuranceConfirmed', 'healthConfirmed', 'biteHistory']

/** Your own dogs (private owners). Shelters manage their dogs on the website. */
export async function GET() {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const dogs = await myDogs(viewer)
  return json({
    dogs: dogs.map((d) => ({ id: d.id, name: d.name, breed: d.breed, status: d.status, photos: d.photos, look: dogLook(d), city: d.city, walkMinutes: d.walkMinutes })),
  })
}

/** Add or edit a dog, with the same checks as the website's form (insurance, health, bite history). */
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
  return result.ok ? json({ ok: true, dogId: result.dogId }, 201) : fail(result.error ?? 'invalid')
}
