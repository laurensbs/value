export const COUNTRIES = ['NL', 'BE', 'ES'] as const
export type Country = (typeof COUNTRIES)[number]

export function isCountry(value: unknown): value is Country {
  return typeof value === 'string' && (COUNTRIES as readonly string[]).includes(value)
}

export interface HelpLine {
  id: string
  name: string
  phone?: string
  url: string
  /** i18n key under "help.lines" describing when to use it. */
  key: string
  region?: string
}

export interface CountryInfo {
  code: Country
  flag: string
  center: { lat: number; lng: number }
  defaultCity: string
  emergency: string
  policeNonEmergency: string
  animalEmergency?: { name: string; phone?: string; url?: string }
  lostPets: { name: string; url: string }
  helpLines: HelpLine[]
  /** Spain: walking a "perro potencialmente peligroso" requires a licence. */
  pppRules: boolean
}

// Numbers checked against public sources in October 2026 where possible; see docs/DECISIONS.md.
export const COUNTRY_INFO: Record<Country, CountryInfo> = {
  NL: {
    code: 'NL',
    flag: '🇳🇱',
    center: { lat: 52.0907, lng: 5.1214 },
    defaultCity: 'Utrecht',
    emergency: '112',
    policeNonEmergency: '0900-8844',
    animalEmergency: { name: '144 Red een dier', phone: '144', url: 'https://www.144redeendier.nl' },
    lostPets: { name: 'Amivedi', url: 'https://www.amivedi.nl' },
    pppRules: false,
    helpLines: [
      { id: 'nl-113', name: '113 Zelfmoordpreventie', phone: '0800-0113', url: 'https://www.113.nl', key: 'suicide' },
      { id: 'nl-mind', name: 'MIND Hulplijn', phone: '0900-1450', url: 'https://wijzijnmind.nl', key: 'talk' },
      { id: 'nl-injebol', name: 'In je bol', url: 'https://injebol.nl', key: 'young' },
      { id: 'nl-kt', name: 'De Kindertelefoon', phone: '0800-0432', url: 'https://www.kindertelefoon.nl', key: 'children' },
    ],
  },
  BE: {
    code: 'BE',
    flag: '🇧🇪',
    center: { lat: 51.0543, lng: 3.7174 },
    defaultCity: 'Gent',
    emergency: '112',
    policeNonEmergency: '101',
    lostPets: { name: 'DogID', url: 'https://www.dogid.be' },
    pppRules: false,
    helpLines: [
      { id: 'be-1813', name: 'Zelfmoordlijn 1813', phone: '1813', url: 'https://www.zelfmoord1813.be', key: 'suicide', region: 'Vlaanderen' },
      { id: 'be-cps', name: 'Centre de Prévention du Suicide', phone: '0800 32 123', url: 'https://www.preventionsuicide.be', key: 'suicide', region: 'Wallonie/Bruxelles' },
      { id: 'be-106', name: 'Tele-Onthaal', phone: '106', url: 'https://www.tele-onthaal.be', key: 'talk', region: 'Vlaanderen' },
      { id: 'be-107', name: 'Télé-Accueil', phone: '107', url: 'https://www.tele-accueil.be', key: 'talk', region: 'Wallonie/Bruxelles' },
      { id: 'be-awel', name: 'Awel', phone: '102', url: 'https://www.awel.be', key: 'children', region: 'Vlaanderen' },
    ],
  },
  ES: {
    code: 'ES',
    flag: '🇪🇸',
    center: { lat: 40.4168, lng: -3.7038 },
    defaultCity: 'Madrid',
    emergency: '112',
    policeNonEmergency: '091',
    animalEmergency: { name: 'Guardia Civil (SEPRONA)', phone: '062', url: 'https://www.guardiacivil.es' },
    lostPets: { name: 'REIAC', url: 'https://www.reiac.es' },
    pppRules: true,
    helpLines: [
      { id: 'es-024', name: 'Línea 024', phone: '024', url: 'https://www.sanidad.gob.es/linea024/', key: 'suicide' },
      { id: 'es-esperanza', name: 'Teléfono de la Esperanza', phone: '717 003 717', url: 'https://telefonodelaesperanza.org', key: 'talk' },
      { id: 'es-anar', name: 'Fundación ANAR', phone: '900 20 20 10', url: 'https://www.anar.org', key: 'children' },
    ],
  },
}

export function countryInfo(code: string | null | undefined): CountryInfo {
  return isCountry(code) ? COUNTRY_INFO[code] : COUNTRY_INFO.NL
}
