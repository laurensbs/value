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

/** Values for columns a shelter leaves empty: the shelter's own defaults. */
export interface ImportDefaults {
  treats: 'yes' | 'no' | 'own'
  walkMinutes: number
}

export function parseDogCsv(text: string, defaults: ImportDefaults = { treats: 'own', walkMinutes: 45 }): ImportResult {
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
      walkMinutes: Number.isFinite(minutes) ? Math.min(180, Math.max(10, minutes)) : defaults.walkMinutes,
      treats: pick('treats', r.treats ?? '', defaults.treats),
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

// Names that cameras and chat apps give photos: never a dog's name.
const GENERATED_NAMES = [
  /^(img|dsc[nf]?|pxl|mvimg|gopr|dji|vid|wp|fb_img|received|p)[\s_-]?e?\d/i,
  /^(whatsapp|signal|telegram|snapchat|instagram|messenger)\b/i,
  /^(screenshot|schermafbeelding|schermopname|captura|capture|bildschirmfoto)/i,
  /^(photo|foto|image|imagen|picture|afbeelding|bild)[\s_-]*\d/i,
  /^[0-9a-f]{8}-[0-9a-f]{4}-/i,
]

// Words in file names that are not part of a name.
const GENERIC_WORDS = new Set([
  'img', 'image', 'imagen', 'photo', 'foto', 'picture', 'pic', 'afbeelding', 'bild', 'scan', 'download', 'downloads',
  'unnamed', 'untitled', 'naamloos', 'sin', 'titulo', 'título', 'copy', 'kopie', 'copia', 'edited', 'bewerkt', 'final',
  'new', 'nieuw', 'hond', 'dog', 'perro', 'chien', 'jpg', 'jpeg', 'png', 'heic',
])

/**
 * A dog's name from a photo's file name, so a shelter that names its photos ("bram.jpg")
 * does not have to type them again. "lady-di_2.jpeg" → "Lady Di"; "IMG_1234.JPG" → "".
 */
export function nameFromFile(fileName: string): string {
  const base = fileName
    .normalize('NFC')
    .replace(/^.*[\\/]/, '')
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .trim()
  if (!base || GENERATED_NAMES.some((re) => re.test(base))) return ''
  const words = base
    .replace(/[_.\-+]+/g, ' ')
    .replace(/\(\d+\)/g, ' ')
    .split(/\s+/)
    // "Bram2" → "Bram", but leave names like "R2D2" alone.
    .map((w) => w.replace(/^(\p{L}{2,})\d{1,3}$/u, '$1'))
    .filter((w) => w && /\p{L}/u.test(w))
    // Counters and hashes ("E1234", "a3f5c9e1b2") and words like "image" or "unnamed".
    .filter((w) => (w.match(/\d/g)?.length ?? 0) < 4 && !GENERIC_WORDS.has(w.toLowerCase()))
  if (!words.length) return ''
  const name = words
    .map((w) => (w === w.toLowerCase() || (w === w.toUpperCase() && /^\p{L}+$/u.test(w)) ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
  return name.slice(0, 60).trim()
}
