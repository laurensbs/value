import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseFrontMatter } from './front-matter'

// The terms (0.4), the safety protocol (0.2) and the privacy statement (0.6) only say what Rondje Mee
// really does, with live location on and off (LIVE_LOCATION, lib/live-location.ts): location only on a
// walk alone with the dog, no promised alert when a walk runs late (checkOverdue only runs when a phone
// or the follow page asks), and an SOS screen that calls nobody and sends nothing by itself. These
// sentences promised more; they must not come back, in any language. The list of changes
// (terms-changes) is checked too, because the re-accept screen shows it.
//
// A shelter's dog never walks alone with a walker: setTrust (server/actions/requests.ts) keeps
// soloAllowed off for it and canRequestSolo (lib/rules.ts) answers 'needs-meeting'. So only an owner
// gives solo trust and sees a live map, in the terms, the privacy statement and the partner terms for
// shelters (0.2: 0.1 was already live). The SOS screen only shows the button to call the owner or
// shelter when their number is known (components/SosSheet.tsx).
//
// Who counts as a member (queries.ts getDogDetail): signed in, onboarded and not banned by Rondje Mee.
// A ban is "geblokkeerd door Rondje Mee" in Dutch, but "suspend / suspender / suspendre" in en/es/fr
// (terms art. 17); "block / bloquear / bloquer" there means one user blocking another (art. 14), so
// it must not describe membership.

const read = (locale: string, doc: string) =>
  parseFrontMatter(readFileSync(path.join(process.cwd(), 'content', 'legal', locale, `${doc}.md`), 'utf8'))

type Doc = 'terms' | 'safety' | 'privacy' | 'terms-changes' | 'shelters'
const DOCS: Doc[] = ['terms', 'safety', 'privacy', 'terms-changes', 'shelters']

const GONE: Record<string, Partial<Record<Doc, string[]>>> = {
  nl: {
    terms: [
      'zodat de live locatie werkt',
      'Alleen dan verzamelen we locatie',
      'De eigenaar of opvang ziet een live kaart met de route',
      'dan krijgt de eigenaar of opvang een melding',
      'Je kunt een vaste wekelijkse wandeling afspreken',
      'Anderen zien op je profiel onder meer je voornaam, foto en ongeveer waar je woont',
      'de nummers van eigenaar en dierenarts',
      'en niet geblokkeerd)',
      'mag pas als de eigenaar of opvang daar in de app',
      'een knop om de eigenaar of opvang te bellen,',
    ],
    'terms-changes': ['en niet geblokkeerd)'],
    privacy: [
      'Dan krijgt de eigenaar of opvang een melding',
      'Wie met een account een hondenprofiel bekijkt',
      '**Zonder account** zie je',
      'de eigenaar of opvang van de hond',
      'ziet de eigenaar of opvang geen live kaart',
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
      'een knop om de eigenaar of opvang te bellen,',
      'met de knop in het SOS-scherm. De eigenaar',
    ],
    shelters: ['De opvang geeft alleen solo-vertrouwen', 'voordat iemand alleen mag'],
  },
  en: {
    terms: [
      'so that live location works',
      'This is the only time we collect location data',
      'The owner or shelter sees a live map with the route',
      'the owner or shelter receives an alert',
      'You can arrange a fixed weekly walk',
      "the owner's and vet's numbers",
      'and not blocked)',
      'once the owner or shelter has explicitly given permission',
      'a button to call the owner or shelter,',
    ],
    'terms-changes': ['and not blocked)'],
    privacy: [
      'the owner or shelter receives an alert',
      'Anyone with an account viewing a dog profile',
      '**Without an account** you only see',
      "the dog's owner or shelter sees a live map",
      'the owner or shelter sees no live map',
    ],
    safety: [
      'Your live location is then shared with the owner or shelter',
      'the owner or shelter receives an alert',
      'Select "dog escaped" in the app',
      '1. Check on the live map where the walker is',
      'Rondje Mee can only see someone\'s location during an active walk',
      'the vet from the SOS screen',
      'a button to call the owner or shelter,',
      'with the button on the SOS screen. The owner',
    ],
    shelters: ['The shelter only grants solo trust', 'before someone may walk alone'],
  },
  es: {
    terms: [
      'para que funcione la ubicación en tiempo real',
      'Solo entonces recogemos la ubicación',
      'El propietario o la protectora ve un mapa en tiempo real',
      'el propietario o la protectora recibe un aviso',
      'Podéis acordar un paseo fijo semanal',
      'Antes de tu primer paseo en solitario',
      'sin bloqueo)',
      'cuando el propietario o la protectora lo autoriza',
      'un botón para llamar al propietario o a la protectora,',
    ],
    'terms-changes': ['sin bloqueo)'],
    privacy: [
      'el propietario o la protectora recibe un aviso',
      'Quien ve el perfil de un perro con una cuenta',
      '**Sin cuenta** solo se ve',
      'el propietario o la protectora del perro ve un mapa',
      'el propietario o la protectora no ve ningún mapa',
    ],
    safety: [
      'Así tu ubicación en tiempo real se comparte',
      'el propietario o la protectora recibe un aviso',
      'Elige «perro escapado» en la app',
      '1. Mira en el mapa en tiempo real dónde está el paseante',
      'Rondje Mee solo ve la ubicación de alguien durante un paseo activo',
      'al veterinario desde la pantalla SOS',
      'un botón para llamar al propietario o a la protectora,',
      'con el botón de la pantalla SOS. El propietario',
    ],
    shelters: ['La protectora solo concede la confianza en solitario', 'antes de que alguien pueda pasear solo'],
  },
  fr: {
    terms: [
      'pour que la localisation en direct fonctionne',
      "C'est le seul moment où nous collectons votre position",
      'Le propriétaire ou le refuge voit une carte en direct',
      'le propriétaire ou le refuge reçoit une alerte',
      "Vous pouvez convenir d'une promenade fixe chaque semaine",
      'non bloqués)',
      "l'autorisation expresse du propriétaire ou du refuge",
      'un bouton pour appeler le propriétaire ou le refuge,',
    ],
    'terms-changes': ['non bloqués)'],
    privacy: [
      'le propriétaire ou le refuge reçoit une alerte',
      "Toute personne avec un compte qui consulte le profil d'un chien",
      '**Sans compte**, on ne voit que',
      'le propriétaire ou le refuge voit une carte en direct',
      'le propriétaire ou le refuge ne voit aucune carte en direct',
    ],
    safety: [
      'Votre position en direct est alors partagée',
      'le propriétaire ou le refuge reçoit une alerte',
      'Choisissez « chien échappé » dans l',
      '1. Regardez sur la carte en direct où se trouve le promeneur',
      "Rondje Mee ne voit la position de quelqu'un que pendant une promenade active",
      'le vétérinaire depuis l',
      'un bouton pour appeler le propriétaire ou le refuge,',
      "avec le bouton de l'écran SOS. C'est",
    ],
    shelters: ["Le refuge n'accorde la confiance solo", "avant qu'une personne puisse promener un chien seule"],
  },
}

/** What the texts say instead, so a rewrite cannot quietly drop it. */
const SAID: Record<string, Partial<Record<Doc, string[]>>> = {
  nl: {
    terms: [
      'Live locatie kan aan of uit staan.',
      'Het SOS-scherm stuurt zelf niets naar de eigenaar of opvang en deelt geen locatie.',
      'Wie geen lid is, ziet bij die hond alleen de hond',
      'niet geblokkeerd door Rondje Mee)',
      'Alleen wandelen met de hond van een eigenaar mag pas als die eigenaar daar in de app uitdrukkelijk toestemming voor geeft.',
      'Met een hond van een opvang wandel je nooit alleen',
      'een knop om de eigenaar of opvang te bellen (als het nummer bekend is)',
    ],
    'terms-changes': [
      'niet geblokkeerd door Rondje Mee)',
      'artikel 5 van de privacyverklaring',
      'Met een hond van een opvang wandel je nooit alleen.',
      'De knop om de eigenaar of opvang te bellen staat er alleen als het nummer bekend is.',
    ],
    privacy: [
      'dan stuurt Rondje Mee soms een melding, maar niet altijd. Reken er dus niet op.',
      'niet geblokkeerd door Rondje Mee)',
      '**Wie geen lid is**, ziet bij die hond alleen de hond',
      'dan ziet de eigenaar van de hond tijdens een wandeling alleen met de hond een live kaart',
    ],
    safety: [
      'Het scherm stuurt zelf niets naar de eigenaar of opvang en deelt geen locatie',
      'Vertel aan de telefoon waar en wanneer je de hond voor het laatst zag.',
      'Staat live locatie uit, dan is er geen kaart.',
      'een knop om de eigenaar of opvang te bellen (als het nummer bekend is)',
    ],
    shelters: ['Een wandelaar loopt nooit alleen met een hond van de opvang.'],
  },
  en: {
    terms: [
      'Live location can be switched on or off.',
      'The SOS screen does not send anything to the owner or shelter by itself',
      'Anyone who is not a member only sees the dog',
      'and not suspended)',
      "Walking an owner's dog alone is only allowed once that owner has explicitly given permission in the app.",
      "You never walk a shelter's dog alone",
      'a button to call the owner or shelter (if their number is known)',
    ],
    'terms-changes': [
      'and not suspended)',
      // The 0.4 list says "article", as the 0.3 list does.
      'article 5 of the Privacy Policy',
      "You never walk a shelter's dog alone.",
      'The button to call the owner or shelter is only there if their number is known.',
    ],
    privacy: [
      'Rondje Mee sometimes sends an alert, but not always. So do not count on it.',
      'and not suspended)',
      '**Anyone who is not a member** only sees the dog',
      "the dog's owner sees a live map with the route",
    ],
    safety: [
      'The screen does not send anything to the owner or shelter by itself',
      'Tell them on the phone where and when you last saw the dog.',
      'If live location is off, there is no map.',
      'a button to call the owner or shelter (if their number is known)',
    ],
    shelters: ['A walker never walks a shelter dog alone.'],
  },
  es: {
    terms: [
      'La ubicación en tiempo real puede estar activada o desactivada.',
      'La pantalla SOS no envía nada por sí sola',
      'Quien no es miembro solo ve el perro',
      'la cuenta no suspendida)',
      'Solo puedes pasear solo al perro de un propietario cuando ese propietario lo autoriza expresamente en la app.',
      'Al perro de una protectora nunca lo paseas a solas',
      'un botón para llamar al propietario o a la protectora (si se conoce el número)',
    ],
    'terms-changes': [
      'la cuenta no suspendida)',
      'apartado 5 de la Política de privacidad',
      'Al perro de una protectora nunca lo paseas a solas.',
      'El botón para llamar al propietario o a la protectora solo aparece si se conoce el número.',
    ],
    privacy: [
      'Rondje Mee a veces envía un aviso, pero no siempre. Así que no cuentes con ello.',
      'la cuenta no suspendida)',
      '**Quien no es miembro** solo ve el perro',
      'el propietario del perro ve un mapa en tiempo real con el recorrido',
    ],
    safety: [
      'La pantalla no envía nada por sí sola',
      'Dile por teléfono dónde y cuándo viste al perro por última vez.',
      'Si está desactivada, no hay mapa.',
      'un botón para llamar al propietario o a la protectora (si se conoce el número)',
    ],
    shelters: ['Un paseante nunca pasea a solas a un perro de la protectora.'],
  },
  fr: {
    terms: [
      'La localisation en direct peut être activée ou désactivée.',
      "L'écran SOS n'envoie rien de lui-même",
      "Une personne qui n'est pas membre ne voit que le chien",
      'non suspendus)',
      "Promener seul le chien d'un propriétaire n'est permis qu'après l'autorisation expresse de ce propriétaire dans l'application.",
      "Vous ne promenez jamais seul le chien d'un refuge",
      'un bouton pour appeler le propriétaire ou le refuge (si le numéro est connu)',
    ],
    'terms-changes': [
      'non suspendus)',
      'article 5 de la Politique de confidentialité',
      "Vous ne promenez jamais seul le chien d'un refuge.",
      "Le bouton pour appeler le propriétaire ou le refuge n'apparaît que si le numéro est connu.",
    ],
    privacy: [
      "Rondje Mee envoie parfois une alerte, mais pas toujours. N'y comptez donc pas.",
      'non suspendus)',
      "**Une personne qui n'est pas membre** ne voit que le chien",
      'le propriétaire du chien voit une carte en direct avec le trajet',
    ],
    safety: [
      "L'écran n'envoie rien de lui-même",
      'Dites-lui au téléphone où et quand vous avez vu le chien pour la dernière fois.',
      "Si elle est désactivée, il n'y a pas de carte.",
      'un bouton pour appeler le propriétaire ou le refuge (si le numéro est connu)',
    ],
    shelters: ['Un promeneur ne promène jamais seul un chien du refuge.'],
  },
}

describe('terms, safety protocol and privacy statement say only what Rondje Mee does', () => {
  it.each(Object.keys(GONE))('%s: no promise the code does not keep', (locale) => {
    for (const doc of DOCS) {
      const { body } = read(locale, doc)
      for (const sentence of GONE[locale][doc] ?? []) expect(body, `${doc}: ${sentence}`).not.toContain(sentence)
      for (const sentence of SAID[locale][doc] ?? []) expect(body, `${doc}: ${sentence}`).toContain(sentence)
    }
  })

  it('checks every document in every language', () => {
    for (const locale of Object.keys(GONE)) {
      expect(Object.keys(GONE[locale]).sort(), `GONE ${locale}`).toEqual([...DOCS].sort())
      expect(Object.keys(SAID[locale]).sort(), `SAID ${locale}`).toEqual([...DOCS].sort())
    }
  })

  it.each(Object.keys(GONE))('%s: the privacy statement promises no alert when a walk runs late', (locale) => {
    const { data, body } = read(locale, 'privacy')
    expect(data.version).toBe('0.6')
    // Section 5 (location) is where the old promise stood; the "sometimes, not always" sentence replaces it.
    const section5 = body.split(/^## /m).find((part) => part.startsWith('5.')) ?? ''
    expect(section5, 'section 5').not.toBe('')
    expect(section5).toContain(SAID[locale].privacy![0])
  })

  it.each(Object.keys(GONE))('%s: the partner terms for shelters (0.2) let no shelter dog walk alone', (locale) => {
    const { data, body } = read(locale, 'shelters')
    // 0.1 was already live, so the change gets a version of its own (the 0.4 list of changes names it).
    expect(data.version).toBe('0.2')
    const section4 = body.split(/^## /m).find((part) => part.startsWith('4.')) ?? ''
    expect(section4, 'section 4').not.toBe('')
    expect(section4).toContain(SAID[locale].shelters![0])
  })
})
