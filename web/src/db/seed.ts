import { count, eq } from 'drizzle-orm'
import type { Db } from './index'
import * as s from './schema'

// Example content so the platform is not empty on day one. Everything is marked
// isDemo, shown with an "example" label, cannot be requested, and an admin can
// remove it with one click. Names, people and shelters are made up.

const now = () => new Date()

function inDays(days: number, hour: number, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d
}

const OWNERS = [
  { id: 'demo-ans', name: 'Ans', country: 'NL', city: 'Utrecht', lat: 52.095, lng: 5.13, birthDate: '1945-03-12' },
  { id: 'demo-henk', name: 'Henk', country: 'NL', city: 'Utrecht', lat: 52.09, lng: 5.105, birthDate: '1952-08-01' },
  { id: 'demo-marian', name: 'Marian', country: 'NL', city: 'Utrecht', lat: 52.08, lng: 5.115, birthDate: '1957-01-20' },
  { id: 'demo-paul', name: 'Paul', country: 'BE', city: 'Gent', lat: 51.055, lng: 3.72, birthDate: '1947-11-05' },
  { id: 'demo-carmen', name: 'Carmen', country: 'ES', city: 'Madrid', lat: 40.42, lng: -3.705, birthDate: '1950-06-30' },
] as const

type DogSeed = Omit<typeof s.dog.$inferInsert, 'createdAt' | 'updatedAt'> & { slots?: [number, string][] }

const DOGS: DogSeed[] = [
  {
    id: 'demo-saar', ownerId: 'demo-ans', name: 'Saar', breed: 'Labrador', sex: 'female', ageYears: 9, size: 'large',
    energy: 'calm', level: 'starter', walkMinutes: 30, country: 'NL', city: 'Utrecht', lat: 52.095, lng: 5.13,
    story: 'Ans loopt sinds haar nieuwe heup alleen nog kleine stukjes. Saar is gewend aan lange rondjes langs de Singel en mist ze.',
    needs: 'Twee extra rondjes per week houden Saar fit tot Ans weer verder kan lopen.',
    traits: ['Heel rustig', 'Trekt nooit', 'Dol op eendjes'], treats: 'own', treatsNote: 'Alleen de brokjes uit het blikje bij de deur.',
    provides: ['bags', 'leash', 'treats'], insuranceConfirmed: true, healthConfirmed: true,
    avatar: { fur: '#6e4632', ears: '#583624', muzzle: '#8d5e44', earStyle: 'floppy', collar: '#c0392b' },
    slots: [[2, '10:00'], [4, '14:00'], [6, '10:30']],
  },
  {
    id: 'demo-pip', ownerId: 'demo-henk', name: 'Pip', breed: 'Teckel', sex: 'male', ageYears: 11, size: 'small',
    energy: 'calm', level: 'starter', walkMinutes: 20, country: 'NL', city: 'Utrecht', lat: 52.09, lng: 5.105,
    story: 'Henk heeft COPD. Een blokje om lukt nog, het park niet meer. Pip kijkt elke middag naar de deur.',
    needs: 'Eén kort rondje per dag is genoeg.', traits: ['Blaft naar duiven', 'Draagt een jasje bij regen'],
    treats: 'yes', provides: ['bags', 'leash', 'harness'], insuranceConfirmed: true, healthConfirmed: true,
    avatar: { fur: '#2b2220', ears: '#1c1513', muzzle: '#b4733f', earStyle: 'floppy', head: 'narrow', brows: '#b4733f', collar: '#d9a400' },
    slots: [[1, '15:00'], [3, '15:00'], [5, '15:00']],
  },
  {
    id: 'demo-tess', ownerId: 'demo-marian', name: 'Tess', breed: 'Golden retriever', sex: 'female', ageYears: 6, size: 'large',
    energy: 'medium', level: 'starter', walkMinutes: 35, country: 'NL', city: 'Utrecht', lat: 52.08, lng: 5.115,
    story: 'Marian is midden in een chemokuur en te moe om Tess uit te laten. Een vaste wandelaar geeft rust.',
    needs: 'Voor een paar maanden, op dinsdag en vrijdag.', traits: ['Vriendelijk tegen iedereen', 'Zwemt graag'],
    treats: 'no', treatsNote: 'Gevoelige maag.', provides: ['bags', 'leash', 'towel'], insuranceConfirmed: true, healthConfirmed: true,
    avatar: { fur: '#e8bf7a', ears: '#d6a55a', muzzle: '#f5dfb5', earStyle: 'floppy', tongue: true, collar: '#2d5d8a' },
    slots: [[2, '11:00'], [5, '11:00']],
  },
  {
    id: 'demo-mo', orgId: 'demo-zuidpark', name: 'Mo', breed: 'Stafford-mix', sex: 'male', ageYears: 4, size: 'medium',
    energy: 'medium', level: 'experienced', walkMinutes: 45, country: 'NL', city: 'Utrecht', lat: 52.07, lng: 5.14,
    story: 'Mo wordt vaak overgeslagen door hoe hij eruitziet. Bij de vrijwilligers legt hij zijn kop op je schoot.',
    needs: 'Elke wandeling maakt hem rustiger in zijn kennel.', traits: ['Loopt netjes aan de lijn', 'Liever geen katten'],
    treats: 'yes', provides: ['bags', 'leash', 'harness', 'treats'], insuranceConfirmed: true, healthConfirmed: true,
    avatar: { fur: '#b98a62', ears: '#8e6443', muzzle: '#f1dfcb', earStyle: 'fold', head: 'wide', blaze: '#f1dfcb', collar: '#2d5d8a' },
  },
  {
    id: 'demo-kees', orgId: 'demo-zuidpark', name: 'Kees', breed: 'Beagle', sex: 'male', ageYears: 7, size: 'medium',
    energy: 'medium', level: 'starter', walkMinutes: 45, country: 'NL', city: 'Utrecht', lat: 52.07, lng: 5.14,
    story: 'Kees ruikt alles. Wandelen met hem is een ontdekkingstocht.', needs: 'Snuffelen maakt hem moe op een goede manier.',
    traits: ['Kan met andere honden', 'Eet alles wat op straat ligt'], treats: 'yes', provides: ['bags', 'leash', 'treats'],
    insuranceConfirmed: true, healthConfirmed: true,
    avatar: { fur: '#c47c3e', ears: '#6b3f1f', muzzle: '#ffffff', earStyle: 'floppy', blaze: '#ffffff', tongue: true, collar: '#1f5a3d' },
  },
  {
    id: 'demo-bolle', ownerId: 'demo-paul', name: 'Bolle', breed: 'Franse bulldog', sex: 'male', ageYears: 5, size: 'small',
    energy: 'calm', level: 'starter', walkMinutes: 20, country: 'BE', city: 'Gent', lat: 51.055, lng: 3.72,
    story: 'Paul loopt met een rollator. Het rondje naar het Citadelpark lukt niet meer, het praatje na afloop mist hij het meest.',
    needs: 'Korte, rustige rondjes. Bij warm weer liever in de ochtend.', traits: ['Snurkt', 'Dol op aandacht'],
    treats: 'own', provides: ['bags', 'leash'], insuranceConfirmed: true, healthConfirmed: true,
    avatar: { fur: '#d6b48c', ears: '#c29a6c', muzzle: '#5b4a41', earStyle: 'bat', head: 'wide', collar: '#d9a400' },
    slots: [[1, '09:30'], [3, '09:30'], [6, '09:30']],
  },
  {
    id: 'demo-luna', ownerId: 'demo-carmen', name: 'Luna', breed: 'Border collie (mestiza)', sex: 'female', ageYears: 3, size: 'medium',
    energy: 'high', level: 'experienced', walkMinutes: 60, country: 'ES', city: 'Madrid', lat: 40.42, lng: -3.705,
    story: 'Carmen ya no puede seguir el ritmo de Luna. En el Retiro, Luna es feliz con una pelota.',
    needs: 'Mucho movimiento, idealmente por la mañana.', traits: ['Muy lista', 'Obedece bien'],
    treats: 'yes', provides: ['bags', 'leash', 'water'], insuranceConfirmed: true, healthConfirmed: true,
    avatar: { fur: '#20242a', ears: '#20242a', muzzle: '#ffffff', earStyle: 'pointy', blaze: '#ffffff', tongue: true, collar: '#d9f05a' },
    slots: [[1, '08:30'], [3, '08:30'], [5, '08:30']],
  },
  {
    id: 'demo-noor', orgId: 'demo-olivos', name: 'Noor', breed: 'Galgo', sex: 'female', ageYears: 5, size: 'large',
    energy: 'calm', level: 'starter', walkMinutes: 40, country: 'ES', city: 'Valencia', lat: 39.47, lng: -0.376,
    story: 'Noor fue galga de caza. Ahora aprende que las personas son buenas.', needs: 'Paseos tranquilos con el mismo grupo.',
    traits: ['Sensible', 'Lleva arnés'], treats: 'yes', provides: ['bags', 'leash', 'harness'], insuranceConfirmed: true,
    healthConfirmed: true,
    avatar: { fur: '#d9cbb8', ears: '#b9a690', muzzle: '#ece3d6', earStyle: 'fold', head: 'narrow', collar: '#7b4fa3' },
  },
]

export async function seedIfEmpty(db: Db): Promise<void> {
  if (process.env.SEED_DEMO === '0') return
  const [{ n }] = await db.select({ n: count() }).from(s.dog)
  if (n > 0) return
  const existing = await db.select({ id: s.user.id }).from(s.user).where(eq(s.user.id, 'demo-ans'))
  if (existing.length > 0) return

  await db.insert(s.user).values(
    OWNERS.map((o) => ({
      id: o.id,
      name: o.name,
      email: `${o.id}@demo.example.org`,
      emailVerified: true,
      createdAt: now(),
      updatedAt: now(),
    })),
  )
  await db.insert(s.profile).values(
    OWNERS.map((o, i) => ({
      userId: o.id,
      firstName: o.name,
      birthDate: o.birthDate,
      country: o.country,
      city: o.city,
      lat: o.lat,
      lng: o.lng,
      wantsToWalk: false,
      hasDogs: true,
      termsAcceptedAt: now(),
      termsVersion: 'demo',
      referralCode: `DEMO${i}`,
    })),
  )
  await db.insert(s.organization).values([
    {
      id: 'demo-zuidpark', name: 'Dierenopvang Zuidpark', country: 'NL', city: 'Utrecht', lat: 52.07, lng: 5.14,
      description: 'Voorbeeldopvang met begeleide groepswandelingen op zaterdag en woensdag.', status: 'verified', isDemo: true,
    },
    {
      id: 'demo-olivos', name: 'Protectora Los Olivos', country: 'ES', city: 'Valencia', lat: 39.47, lng: -0.376,
      description: 'Protectora de ejemplo con paseos en grupo los fines de semana.', status: 'verified', isDemo: true,
    },
  ])

  for (const { slots, ...d } of DOGS) {
    await db.insert(s.dog).values({ ...d, isDemo: true })
    if (slots) {
      await db.insert(s.dogSlot).values(
        slots.map(([weekday, time], i) => ({ id: `${d.id}-slot-${i}`, dogId: d.id, weekday, time })),
      )
    }
  }

  await db.insert(s.groupWalk).values([
    { id: 'demo-gw-1', orgId: 'demo-zuidpark', startsAt: inDays(1, 10), durationMin: 60, capacity: 4, meetingPoint: 'Ingang Dierenopvang Zuidpark', notes: 'Voor iedereen, ook zonder ervaring.' },
    { id: 'demo-gw-2', orgId: 'demo-zuidpark', startsAt: inDays(4, 14), durationMin: 60, capacity: 4, level: 'experienced', meetingPoint: 'Ingang Dierenopvang Zuidpark', notes: 'Met Mo en andere honden die wat ervaring vragen.' },
    { id: 'demo-gw-3', orgId: 'demo-olivos', startsAt: inDays(2, 9, 30), durationMin: 75, capacity: 6, meetingPoint: 'Entrada de la protectora', notes: 'Paseo tranquilo por la huerta.' },
  ])
}

/** Removes all example content (admin action). */
export async function removeDemoData(db: Db): Promise<void> {
  await db.delete(s.dog).where(eq(s.dog.isDemo, true))
  await db.delete(s.organization).where(eq(s.organization.isDemo, true))
  for (const o of OWNERS) await db.delete(s.user).where(eq(s.user.id, o.id))
}
