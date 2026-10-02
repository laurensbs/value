import 'server-only'
import { asc, eq } from 'drizzle-orm'
import type { DogInitial } from '@/components/DogForm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isCountry, type Country } from '@/lib/countries'
import type { Dog } from './queries'

export async function dogInitial(dog: Dog): Promise<DogInitial> {
  const db = await getDb()
  const slots = await db
    .select({ weekday: s.dogSlot.weekday, time: s.dogSlot.time })
    .from(s.dogSlot)
    .where(eq(s.dogSlot.dogId, dog.id))
    .orderBy(asc(s.dogSlot.weekday), asc(s.dogSlot.time))
  return {
    id: dog.id,
    name: dog.name,
    breed: dog.breed,
    sex: dog.sex as DogInitial['sex'],
    ageYears: dog.ageYears,
    size: dog.size as DogInitial['size'],
    energy: dog.energy as DogInitial['energy'],
    level: dog.level as DogInitial['level'],
    ppp: dog.ppp,
    photos: dog.photos,
    story: dog.story,
    needs: dog.needs,
    traits: dog.traits,
    treats: dog.treats as DogInitial['treats'],
    treatsNote: dog.treatsNote,
    provides: dog.provides,
    offLeash: dog.offLeash,
    walkMinutes: dog.walkMinutes,
    country: isCountry(dog.country) ? dog.country : 'NL',
    city: dog.city,
    lat: dog.lat,
    lng: dog.lng,
    meetingInfo: dog.meetingInfo,
    vetInfo: dog.vetInfo,
    chipNumber: dog.chipNumber,
    insuranceConfirmed: dog.insuranceConfirmed,
    healthConfirmed: dog.healthConfirmed,
    biteHistory: dog.biteHistory,
    biteNote: dog.biteNote,
    slots,
  }
}

export function emptyDog(place: { country: string; city: string; lat: number | null; lng: number | null }): DogInitial {
  return {
    name: '',
    breed: '',
    sex: 'female',
    ageYears: null,
    size: 'medium',
    energy: 'medium',
    level: 'starter',
    ppp: false,
    photos: [],
    story: '',
    needs: '',
    traits: [],
    treats: 'yes',
    treatsNote: '',
    provides: ['bags', 'leash', 'treats'],
    offLeash: false,
    walkMinutes: 45,
    country: (isCountry(place.country) ? place.country : 'NL') as Country,
    city: place.city,
    lat: place.lat,
    lng: place.lng,
    meetingInfo: '',
    vetInfo: '',
    chipNumber: '',
    insuranceConfirmed: false,
    healthConfirmed: false,
    biteHistory: false,
    biteNote: '',
    slots: [],
  }
}
