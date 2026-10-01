import type { DogLook } from '../components/DogFace'

export type Energy = 'rustig' | 'gemiddeld' | 'energiek'
export type HostKind = 'opvang' | 'buurt'

export interface Dog {
  id: string
  name: string
  breed: string
  age: number
  energy: Energy
  walkMinutes: number
  area: string
  distanceKm: number
  host: { kind: HostKind; name: string; detail: string }
  /** Short note in the owner's or caretaker's own words. */
  note: string
  story: string
  /** Why an extra walk matters for this dog or owner. */
  needs: string
  traits: string[]
  slots: string[]
  meetPoint: string
  look: DogLook
  tile: string
}

// Voorbeelddata voor het prototype. Namen, personen en opvanglocaties zijn verzonnen.
export const DOGS: Dog[] = [
  {
    id: 'mo',
    name: 'Mo',
    breed: 'Stafford-mix',
    age: 4,
    energy: 'gemiddeld',
    walkMinutes: 40,
    area: 'Lunetten',
    distanceKm: 1.4,
    host: { kind: 'opvang', name: 'Dierenopvang Zuidpark', detail: 'Wacht 7 maanden op een baasje' },
    note: 'Ziet er stoer uit, is een enorme knuffelkont.',
    story:
      'Mo wordt vaak overgeslagen door hoe hij eruitziet. Bij de vrijwilligers staat hij bekend als de hond die z’n kop op je schoot legt zodra je even zit.',
    needs: 'Elke wandeling buiten de opvang maakt Mo rustiger in zijn kennel en laat toekomstige baasjes zien hoe hij écht is.',
    traits: ['Loopt netjes aan de lijn', 'Liever geen katten', 'Houdt van bankjes'],
    slots: ['Vandaag 16:30', 'Morgen 10:00', 'Za 11:00'],
    meetPoint: 'Balie van Dierenopvang Zuidpark',
    look: { fur: '#b98a62', ears: '#8e6443', muzzle: '#f1dfcb', earStyle: 'fold', patch: '#f1dfcb', collar: '#2d5d8a' },
    tile: '#f3e3d1',
  },
  {
    id: 'saar',
    name: 'Saar',
    breed: 'Labrador',
    age: 9,
    energy: 'rustig',
    walkMinutes: 30,
    area: 'Wittevrouwen',
    distanceKm: 0.8,
    host: { kind: 'buurt', name: 'Ans, 81', detail: 'Herstelt van een nieuwe heup' },
    note: 'Saar wil altijd even langs de eendjes bij de Singel.',
    story:
      'Ans loopt sinds haar operatie alleen nog kleine stukjes. Saar is gewend aan lange rondjes en mist ze. Ans vindt het fijn als er na afloop iemand een kop thee blijft drinken.',
    needs: 'Ans kan de komende drie maanden niet ver lopen. Twee extra rondjes per week houden Saar fit.',
    traits: ['Heel rustig', 'Goed met kinderen', 'Trekt nooit'],
    slots: ['Morgen 09:00', 'Do 14:00', 'Za 10:30'],
    meetPoint: 'Bij Ans thuis, eerste keer samen',
    look: { fur: '#e2b45c', ears: '#c99540', muzzle: '#f2d79b', earStyle: 'floppy', collar: '#c0392b' },
    tile: '#f6ebcf',
  },
  {
    id: 'kees',
    name: 'Kees',
    breed: 'Beagle',
    age: 7,
    energy: 'gemiddeld',
    walkMinutes: 45,
    area: 'Oog in Al',
    distanceKm: 2.1,
    host: { kind: 'opvang', name: 'Dierenopvang Zuidpark', detail: 'Vorige baasje verhuisde naar het buitenland' },
    note: 'Neus altijd aan de grond. Reken op een langzaam rondje.',
    story:
      'Kees ruikt alles. Echt alles. Wandelen met hem is meer een ontdekkingstocht dan sport, en dat is precies waarom mensen er rustig van worden.',
    needs: 'Snuffelen maakt Kees moe op een goede manier. Zonder wandelingen gaat hij blaffen in zijn kennel.',
    traits: ['Kan met andere honden', 'Trekt een beetje', 'Eet alles wat op straat ligt'],
    slots: ['Vandaag 18:00', 'Vr 12:30', 'Zo 15:00'],
    meetPoint: 'Balie van Dierenopvang Zuidpark',
    look: { fur: '#c9874a', ears: '#7a4a26', muzzle: '#ffffff', earStyle: 'floppy', patch: '#ffffff', tongue: true, collar: '#1f5a3d' },
    tile: '#efe0cf',
  },
  {
    id: 'pip',
    name: 'Pip',
    breed: 'Teckel',
    age: 11,
    energy: 'rustig',
    walkMinutes: 20,
    area: 'Lombok',
    distanceKm: 1.0,
    host: { kind: 'buurt', name: 'Henk, 74', detail: 'Heeft COPD en raakt snel buiten adem' },
    note: 'Korte pootjes, groot karakter. Kleine rondjes zijn genoeg.',
    story:
      'Henk en Pip zijn al elf jaar samen. Henk kan zelf nog een blokje om, maar het rondje door het park is te ver geworden. Pip kijkt elke middag naar de deur.',
    needs: 'Eén rondje van twintig minuten per dag is voor Pip genoeg om fit te blijven.',
    traits: ['Blaft naar duiven', 'Draagt een jasje als het regent', 'Heel lief'],
    slots: ['Vandaag 15:00', 'Morgen 15:00', 'Do 15:00'],
    meetPoint: 'Bij Henk thuis, eerste keer samen',
    look: { fur: '#7a3f22', ears: '#55291a', muzzle: '#a8653d', earStyle: 'floppy', collar: '#d9a400' },
    tile: '#ecd9cc',
  },
  {
    id: 'luna',
    name: 'Luna',
    breed: 'Bordercollie-mix',
    age: 3,
    energy: 'energiek',
    walkMinutes: 60,
    area: 'Maximapark',
    distanceKm: 3.2,
    host: { kind: 'buurt', name: 'Fatima, 34', detail: 'Verpleegkundige met nachtdiensten' },
    note: 'Gooi een bal en je hebt een vriend voor het leven.',
    story:
      'Fatima werkt in ploegendienst in het ziekenhuis. Na een nachtdienst wil ze slapen, Luna wil rennen. Een vast maatje in de ochtend lost dat op.',
    needs: 'Luna heeft veel beweging nodig. Zonder lange wandelingen wordt ze onrustig in huis.',
    traits: ['Super slim', 'Luistert naar commando’s', 'Rent graag los op het hondenveld'],
    slots: ['Morgen 08:30', 'Wo 08:30', 'Vr 08:30'],
    meetPoint: 'Ingang Maximapark, eerste keer met Fatima',
    look: { fur: '#20242a', ears: '#20242a', muzzle: '#ffffff', earStyle: 'pointy', patch: '#ffffff', tongue: true, collar: '#d9f05a' },
    tile: '#dfe5ea',
  },
  {
    id: 'noor',
    name: 'Noor',
    breed: 'Galgo',
    age: 5,
    energy: 'rustig',
    walkMinutes: 30,
    area: 'Griftpark',
    distanceKm: 1.7,
    host: { kind: 'opvang', name: 'Opvang Het Bosrandje', detail: 'Gered uit Spanje, nog wat schuw' },
    note: 'Schrikt van fietsbellen. Houdt van stille paadjes.',
    story:
      'Noor was een renhond in Spanje. Ze leert nu dat mensen fijn zijn. Rustige, vaste wandelaars helpen haar daar het meest bij.',
    needs: 'Noor heeft vertrouwen nodig. Dezelfde wandelaar elke week helpt haar sneller klaar te zijn voor adoptie.',
    traits: ['Gevoelig', 'Draagt een tuigje', 'Slaapt 18 uur per dag'],
    slots: ['Morgen 13:00', 'Za 09:30', 'Zo 13:00'],
    meetPoint: 'Opvang Het Bosrandje, met een begeleider',
    look: { fur: '#d9cbb8', ears: '#b9a690', muzzle: '#ece3d6', earStyle: 'fold', collar: '#7b4fa3' },
    tile: '#ece6dd',
  },
]

export function findDog(id: string): Dog | undefined {
  return DOGS.find((d) => d.id === id)
}
