import { csvToObjects } from './csv'

// Bulk import of shelter dogs from a CSV file. Columns (header row, any order):
// name,breed,sex,age_years,size,energy,level,walk_minutes,treats,off_leash,ppp,traits,story,photo_url

export interface ImportedDog {
  name: string
  breed: string
  sex: 'male' | 'female'
  ageYears: number | null
  size: 'small' | 'medium' | 'large'
  energy: 'calm' | 'medium' | 'high'
  level: 'starter' | 'experienced'
  walkMinutes: number
  treats: 'yes' | 'no' | 'own'
  offLeash: boolean
  ppp: boolean
  traits: string[]
  story: string
  photos: string[]
}

export interface ImportResult {
  dogs: ImportedDog[]
  errors: { row: number; message: string }[]
}

const SYNONYMS: Record<string, Record<string, string>> = {
  sex: { m: 'male', man: 'male', reu: 'male', macho: 'male', mâle: 'male', male: 'male', v: 'female', f: 'female', vrouw: 'female', teef: 'female', hembra: 'female', femelle: 'female', female: 'female' },
  size: { klein: 'small', small: 'small', pequeño: 'small', petit: 'small', middel: 'medium', medium: 'medium', mediano: 'medium', moyen: 'medium', groot: 'large', large: 'large', grande: 'large', grand: 'large' },
  energy: { rustig: 'calm', calm: 'calm', tranquilo: 'calm', calme: 'calm', gemiddeld: 'medium', medium: 'medium', medio: 'medium', moyen: 'medium', energiek: 'high', high: 'high', alto: 'high', énergique: 'high', energique: 'high' },
  level: { starter: 'starter', beginner: 'starter', iedereen: 'starter', principiante: 'starter', débutant: 'starter', ervaren: 'experienced', experienced: 'experienced', experto: 'experienced', expérimenté: 'experienced', experimente: 'experienced' },
  treats: { ja: 'yes', yes: 'yes', sí: 'yes', si: 'yes', oui: 'yes', nee: 'no', no: 'no', non: 'no', eigen: 'own', own: 'own', propias: 'own', propres: 'own' },
}

function pick<T extends string>(kind: string, raw: string, fallback: T): T {
  const v = raw.trim().toLowerCase()
  if (!v) return fallback
  return (SYNONYMS[kind][v] as T | undefined) ?? fallback
}

function yes(raw: string): boolean {
  return ['ja', 'yes', 'y', 'sí', 'si', 'oui', 'true', '1', 'x'].includes(raw.trim().toLowerCase())
}

export const MAX_IMPORT_ROWS = 300

export function parseDogCsv(text: string): ImportResult {
  const rows = csvToObjects(text)
  const result: ImportResult = { dogs: [], errors: [] }
  if (rows.length > MAX_IMPORT_ROWS) {
    result.errors.push({ row: 0, message: `too-many-rows:${MAX_IMPORT_ROWS}` })
    return result
  }
  rows.forEach((r, i) => {
    const rowNumber = i + 2
    const name = (r.name ?? r.naam ?? r.nombre ?? r.nom ?? '').trim()
    if (!name) {
      result.errors.push({ row: rowNumber, message: 'missing-name' })
      return
    }
    const age = Number.parseInt(r.age_years ?? r.leeftijd ?? '', 10)
    const minutes = Number.parseInt(r.walk_minutes ?? '', 10)
    const photo = (r.photo_url ?? '').trim()
    result.dogs.push({
      name: name.slice(0, 60),
      breed: (r.breed ?? r.ras ?? '').slice(0, 80),
      sex: pick('sex', r.sex ?? '', 'female'),
      ageYears: Number.isFinite(age) && age >= 0 && age < 30 ? age : null,
      size: pick('size', r.size ?? '', 'medium'),
      energy: pick('energy', r.energy ?? '', 'medium'),
      level: pick('level', r.level ?? '', 'starter'),
      walkMinutes: Number.isFinite(minutes) ? Math.min(180, Math.max(10, minutes)) : 45,
      treats: pick('treats', r.treats ?? '', 'own'),
      offLeash: yes(r.off_leash ?? ''),
      ppp: yes(r.ppp ?? ''),
      traits: (r.traits ?? '')
        .split(/[;|]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8),
      story: (r.story ?? r.verhaal ?? '').slice(0, 1500),
      photos: /^https:\/\//.test(photo) ? [photo] : [],
    })
  })
  return result
}
