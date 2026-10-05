import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseFrontMatter } from './front-matter'

// The terms (0.4) and the safety protocol (0.2) only say what Rondje Mee really does, with live location
// on and off (LIVE_LOCATION, lib/live-location.ts): location only on a walk alone with the dog, no
// promised alert when a walk runs late (checkOverdue only runs when a phone or the follow page asks),
// and an SOS screen that calls nobody and sends nothing by itself. These sentences promised more; they
// must not come back, in any language.

const read = (locale: string, doc: string) =>
  parseFrontMatter(readFileSync(path.join(process.cwd(), 'content', 'legal', locale, `${doc}.md`), 'utf8'))

const GONE: Record<string, { terms: string[]; safety: string[] }> = {
  nl: {
    terms: [
      'zodat de live locatie werkt',
      'Alleen dan verzamelen we locatie',
      'De eigenaar of opvang ziet een live kaart met de route',
      'dan krijgt de eigenaar of opvang een melding',
      'Je kunt een vaste wekelijkse wandeling afspreken',
      'Anderen zien op je profiel onder meer je voornaam, foto en ongeveer waar je woont',
      'de nummers van eigenaar en dierenarts',
    ],
    safety: [
      'Je live locatie wordt dan gedeeld met de eigenaar of opvang',
      'dan krijgt de eigenaar of opvang een melding',
      'Kies in de app voor "hond ontsnapt"',
      '1. Kijk op de live kaart waar de wandelaar is',
      'geef de laatst bekende locatie door',
      'Rondje Mee kan iemands locatie alleen zien tijdens een actieve wandeling',
      '- We bewaren de route van de wandeling zolang de melding open is.',
      'de dierenarts via het SOS-scherm',
    ],
  },
  en: {
    terms: [
      'so that live location works',
      'This is the only time we collect location data',
      'The owner or shelter sees a live map with the route',
      'the owner or shelter receives an alert',
      'You can arrange a fixed weekly walk',
      "the owner's and vet's numbers",
    ],
    safety: [
      'Your live location is then shared with the owner or shelter',
      'the owner or shelter receives an alert',
      'Select "dog escaped" in the app',
      '1. Check on the live map where the walker is',
      'Rondje Mee can only see someone\'s location during an active walk',
      'the vet from the SOS screen',
    ],
  },
  es: {
    terms: [
      'para que funcione la ubicación en tiempo real',
      'Solo entonces recogemos la ubicación',
      'El propietario o la protectora ve un mapa en tiempo real',
      'el propietario o la protectora recibe un aviso',
      'Podéis acordar un paseo fijo semanal',
      'Antes de tu primer paseo en solitario',
    ],
    safety: [
      'Así tu ubicación en tiempo real se comparte',
      'el propietario o la protectora recibe un aviso',
      'Elige «perro escapado» en la app',
      '1. Mira en el mapa en tiempo real dónde está el paseante',
      'Rondje Mee solo ve la ubicación de alguien durante un paseo activo',
      'al veterinario desde la pantalla SOS',
    ],
  },
  fr: {
    terms: [
      'pour que la localisation en direct fonctionne',
      "C'est le seul moment où nous collectons votre position",
      'Le propriétaire ou le refuge voit une carte en direct',
      'le propriétaire ou le refuge reçoit une alerte',
      "Vous pouvez convenir d'une promenade fixe chaque semaine",
    ],
    safety: [
      'Votre position en direct est alors partagée',
      'le propriétaire ou le refuge reçoit une alerte',
      'Choisissez « chien échappé » dans l',
      '1. Regardez sur la carte en direct où se trouve le promeneur',
      "Rondje Mee ne voit la position de quelqu'un que pendant une promenade active",
      'le vétérinaire depuis l',
    ],
  },
}

/** What the texts say instead, so a rewrite cannot quietly drop it. */
const SAID: Record<string, { terms: string[]; safety: string[] }> = {
  nl: {
    terms: ['Live locatie kan aan of uit staan.', 'Het SOS-scherm stuurt zelf niets naar de eigenaar of opvang en deelt geen locatie.', 'Wie geen lid is, ziet bij die hond alleen de hond'],
    safety: ['Het scherm stuurt zelf niets naar de eigenaar of opvang en deelt geen locatie', 'Vertel aan de telefoon waar en wanneer je de hond voor het laatst zag.', 'Staat live locatie uit, dan is er geen kaart.'],
  },
  en: {
    terms: ['Live location can be switched on or off.', 'The SOS screen does not send anything to the owner or shelter by itself', 'Anyone who is not a member only sees the dog'],
    safety: ['The screen does not send anything to the owner or shelter by itself', 'Tell them on the phone where and when you last saw the dog.', 'If live location is off, there is no map.'],
  },
  es: {
    terms: ['La ubicación en tiempo real puede estar activada o desactivada.', 'La pantalla SOS no envía nada por sí sola', 'Quien no es miembro solo ve el perro'],
    safety: ['La pantalla no envía nada por sí sola', 'Dile por teléfono dónde y cuándo viste al perro por última vez.', 'Si está desactivada, no hay mapa.'],
  },
  fr: {
    terms: ['La localisation en direct peut être activée ou désactivée.', "L'écran SOS n'envoie rien de lui-même", "Une personne qui n'est pas membre ne voit que le chien"],
    safety: ["L'écran n'envoie rien de lui-même", 'Dites-lui au téléphone où et quand vous avez vu le chien pour la dernière fois.', "Si elle est désactivée, il n'y a pas de carte."],
  },
}

describe('terms and safety protocol say only what Rondje Mee does', () => {
  it.each(Object.keys(GONE))('%s: no promise the code does not keep', (locale) => {
    for (const doc of ['terms', 'safety'] as const) {
      const { body } = read(locale, doc)
      for (const sentence of GONE[locale][doc]) expect(body, `${doc}: ${sentence}`).not.toContain(sentence)
      for (const sentence of SAID[locale][doc]) expect(body, `${doc}: ${sentence}`).toContain(sentence)
    }
  })
})
