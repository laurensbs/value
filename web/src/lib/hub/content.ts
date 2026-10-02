// Everything the founder's hub (/hub) knows by heart: the launch plan, the people to approach,
// the mails, the video ideas and the running costs. Plain data, so it is easy to read and change.
// Partners are always targets here: nobody has agreed to anything yet, and the hub never sends mail.

export type PartnerType =
  | 'welzijn'
  | 'opvang'
  | 'goed-doel'
  | 'fonds'
  | 'overheid'
  | 'onderwijs'
  | 'bedrijf'
  | 'verzekering'
  | 'dierenarts'
  | 'pers'

export const PARTNER_TYPES: Record<PartnerType, string> = {
  welzijn: 'Welzijn en ouderen',
  opvang: 'Dierenopvang',
  'goed-doel': 'Goed doel',
  fonds: 'Fonds',
  overheid: 'Gemeente',
  onderwijs: 'Onderwijs',
  bedrijf: 'Bedrijf',
  verzekering: 'Verzekering',
  dierenarts: 'Dierenarts',
  pers: 'Pers',
}

/** Where a conversation with a partner stands. Every step forward earns points. */
export const PARTNER_STATUSES = ['doel', 'gemaild', 'reactie', 'gesprek', 'partner', 'nee'] as const
export type PartnerStatus = (typeof PARTNER_STATUSES)[number]

export const STATUS_LABELS: Record<PartnerStatus, string> = {
  doel: 'Doel',
  gemaild: 'Gemaild',
  reactie: 'Reactie',
  gesprek: 'Gesprek gepland',
  partner: 'Doet mee',
  nee: 'Nee, of later',
}

/** Points for reaching a status. A "no" still counts: you asked, and that is the hard part. */
export const STATUS_XP: Record<PartnerStatus, number> = {
  doel: 0,
  gemaild: 10,
  reactie: 25,
  gesprek: 50,
  partner: 120,
  nee: 10,
}

/** Days after a mail without an answer before the hub suggests a friendly follow-up. */
export const FOLLOW_UP_DAYS = 7

export interface PartnerTarget {
  id: string
  name: string
  type: PartnerType
  /** Why this one, in one sentence. */
  why: string
  /** What you ask for. */
  ask: string
  template: TemplateId
  email?: string
  website?: string
  /** A placeholder target ("the welfare organisation in your area") rather than a named one. */
  generic?: boolean
}

export const PARTNER_TARGETS: PartnerTarget[] = [
  {
    id: 'welzijn-wijk',
    name: 'Welzijnsorganisatie in je pilotwijk',
    type: 'welzijn',
    why: 'Zij kennen de oudere eigenaren en hebben hun vertrouwen. Zonder hen geen honden.',
    ask: 'Een pilot van 8 weken: zij helpen eigenaren vinden, jij regelt de wandelaars.',
    template: 'welzijn',
    website: 'https://www.eentegeneenzaamheid.nl',
    generic: true,
  },
  {
    id: 'vrijwilligersnet',
    name: 'Vrijwilligersnet Nederland',
    type: 'verzekering',
    why: 'Verzekering is de grootste drempel voor oudere eigenaren.',
    ask: 'Vallen wandelaars via Rondje onder de gratis vrijwilligerspolis van de gemeente?',
    template: 'vrijwilligersnet',
    email: 'info@vrijwilligersnetnederland.nl',
    website: 'https://www.vrijwilligersnetnederland.nl/vrijwilligerspolis',
  },
  {
    id: 'depressie-vereniging',
    name: 'Depressie Vereniging',
    type: 'goed-doel',
    why: 'Het verhaal over je goed voelen, met de juiste woorden.',
    ask: 'Meelezen met teksten over somberheid, en later het goede doel van de Rondjesweek.',
    template: 'depressie',
    website: 'https://depressievereniging.nl/contact/',
  },
  {
    id: 'hulphond',
    name: 'Hulphond Nederland',
    type: 'goed-doel',
    why: 'De brug tussen honden en mentale gezondheid.',
    ask: 'Kennismaken, en het goede doel van de eerste Rondjesweek.',
    template: 'hulphond',
    website: 'https://www.hulphond.nl',
  },
  {
    id: 'oopoeh',
    name: 'Stichting OOPOEH',
    type: 'welzijn',
    why: 'Doet hetzelfde voor 55-plussers. Samenwerken in plaats van concurreren.',
    ask: 'Naar elkaar doorverwijzen, samen meten, en misschien één gezamenlijke pilot.',
    template: 'oopoeh',
    website: 'https://www.oopoeh.nl',
  },
  {
    id: 'gemeente',
    name: 'Gemeente: beleidsadviseur eenzaamheid',
    type: 'overheid',
    why: 'Gemeenten betalen lokale coördinatie, zoals bij OOPOEH.',
    ask: 'Een gesprek over een pilotsubsidie, na de eerste resultaten.',
    template: 'gemeente',
    generic: true,
  },
  {
    id: 'oranje-fonds',
    name: 'Oranje Fonds (Oranje Ticket)',
    type: 'fonds',
    why: '€1.000 tot €5.000 voor jonge initiatiefnemers: precies het startgeld voor de pilot.',
    ask: 'Een Oranje Ticket voor de pilot. Gebruik de pitch hieronder in het aanvraagformulier.',
    template: 'fonds',
    website: 'https://www.oranjefonds.nl',
  },
  {
    id: 'hogeschool',
    name: 'Hogeschool Utrecht (sociaal werk)',
    type: 'onderwijs',
    why: 'Een effectmeting die fondsen serieus nemen, en stagiairs.',
    ask: 'Een docent of studentengroep voor een eenvoudige meting in de pilot.',
    template: 'hogeschool',
    website: 'https://www.hu.nl',
  },
  {
    id: 'vetts',
    name: 'VETTS (online dierenarts)',
    type: 'dierenarts',
    why: 'Elke marktleider heeft een dierenartslijn; Rondje nog niet.',
    ask: 'Gratis chat met een dierenarts tijdens een rondje, als pilot.',
    template: 'vetts',
    website: 'https://vetts.app',
  },
  {
    id: 'verzekeraar',
    name: 'Huisdierverzekeraar (Figo, Petplan of OHRA)',
    type: 'verzekering',
    why: 'Een collectieve dekking voor wandelingen haalt de grootste zorg van eigenaren weg.',
    ask: 'Een gesprek over een collectieve dekking, na 3 maanden cijfers.',
    template: 'verzekeraar',
    generic: true,
  },
  {
    id: 'dierenwinkel',
    name: 'Dierenwinkel in je wijk',
    type: 'bedrijf',
    why: 'Flyers aan de kassa en welkomstpakketjes voor de eerste koppels.',
    ask: 'Flyers neerleggen, en misschien 10 pakketjes met poepzakjes en iets lekkers.',
    template: 'dierenwinkel',
    generic: true,
  },
  {
    id: 'dierenarts-wijk',
    name: 'Dierenartspraktijk in je wijk',
    type: 'dierenarts',
    why: 'Ziet eigenaar en hond samen, precies op het moment dat lopen lastig wordt.',
    ask: 'Flyers aan de balie, en Rondje noemen bij eigenaren die slecht ter been zijn.',
    template: 'dierenarts',
    generic: true,
  },
  {
    id: 'kbo',
    name: 'KBO-PCOB, afdeling in je stad',
    type: 'welzijn',
    why: 'Daar zijn de eigenaren zelf, in een vertrouwde omgeving.',
    ask: 'Tien minuten op een koffieochtend, of een stukje in het afdelingsblad.',
    template: 'kbo',
    generic: true,
  },
  {
    id: 'lokale-krant',
    name: 'Lokale krant of omroep',
    type: 'pers',
    why: 'Eén lokaal verhaal levert meer eigenaren op dan tien posts.',
    ask: 'Een stuk over de eerste koppels (met hun toestemming).',
    template: 'pers',
    generic: true,
  },
]

// ---------- Mails ----------

/**
 * Placeholders in mails. {aanhef} becomes "Beste Anna" or "Beste medewerker" ({bonjour} and {hola}
 * do the same in French and Spanish); the others come from your own details (Jij) and the partner.
 * Anything still in [brackets] is for you to fill in.
 */
export type TemplateId =
  | 'welzijn'
  | 'opvang'
  | 'opvang-fr'
  | 'opvang-es'
  | 'vrijwilligersnet'
  | 'depressie'
  | 'hulphond'
  | 'oopoeh'
  | 'gemeente'
  | 'fonds'
  | 'hogeschool'
  | 'vetts'
  | 'verzekeraar'
  | 'dierenwinkel'
  | 'dierenarts'
  | 'kbo'
  | 'pers'
  | 'opvolgen'

export interface MailTemplate {
  id: TemplateId
  title: string
  /** Who it is for, shown above the mail. */
  audience: string
  subject: string
  body: string
  /** A short version for WhatsApp or a DM, when that fits better than a mail. */
  short?: string
}

const SIGN = `Met vriendelijke groet,
{jouwNaam}
{telefoon} · {website}`

export const TEMPLATES: MailTemplate[] = [
  {
    id: 'welzijn',
    title: 'Welzijnsorganisatie: pilot in je wijk',
    audience: 'Welzijnsorganisatie of de coalitie Eén tegen eenzaamheid',
    subject: 'Jongeren laten wandelen met de hond van oudere buurtgenoten: pilot in {wijk}?',
    body: `{aanhef},

Ik ben {jouwNaam} uit {stad}. Ik werk aan Rondje, een gratis initiatief dat jongvolwassenen (18 tot 30) koppelt aan de hond van een oudere of zieke buurtgenoot die zelf niet ver meer kan lopen. De jongere loopt een vast rondje per week. De eerste keer is de eigenaar er altijd bij.

Waarom ik u mail:
- Bijna een kwart van de 16- tot 25-jarigen voelt zich sterk eenzaam. Veel ouderen met een hond missen hun dagelijkse rondje, en het praatje dat erbij hoort.
- OOPOEH laat zien dat dit werkt voor 55-plussers. Voor jongeren bestaat het nog niet.
- U kent de mensen in de wijk. Ik wil niemand via een app benaderen die daar niet op zit te wachten.

Mijn voorstel is een kleine pilot van 8 weken in {wijk}, met 5 eigenaren en 10 wandelaars. Ik regel de werving van jongeren, de matching en een eenvoudige meting (eenzaamheid, beweging, tevredenheid). U helpt met het vinden van eigenaren en met de intake.

Zou u een half uur willen kennismaken? De app kan ik dan laten zien.

${SIGN}`,
  },
  {
    id: 'opvang',
    title: 'Dierenopvang: begeleide groepswandelingen',
    audience: 'Dierenopvang in Nederland of Vlaanderen (in Vlaanderen: "vzw" en "gsm")',
    subject: 'Extra wandelingen voor uw honden, met jonge vrijwilligers (gratis)',
    body: `{aanhef},

Ik ben {jouwNaam} van Rondje: een gratis platform dat jongvolwassenen van 18 jaar en ouder koppelt aan honden die een extra wandeling goed kunnen gebruiken. Ik zou graag samenwerken met {organisatie}.

- U bepaalt welke honden meedoen en welke wandelaars komen.
- Er wordt gewandeld in kleine groepen, altijd onder begeleiding, op momenten die u kiest.
- Bij de eerste kennismaking controleert uw begeleider het ID. Tijdens de wandeling ziet de begeleider de route live.
- Inschrijven, aanwezigheid en herinneringen regelt Rondje. Uw honden zet u er in één keer op met een spreadsheet, en ik help daarbij.

Het is gratis. Heeft u 20 minuten voor een kort gesprek? Dan laat ik zien hoe het werkt, en hoor ik vooral graag wat wel en niet bij uw honden past.

${SIGN}`,
    short:
      'Hoi! Ik ben {jouwNaam} van Rondje, een gratis platform voor begeleide groepswandelingen met opvanghonden. U kiest de honden en de wandelaars, elke wandeling is begeleid. Mag ik u 20 minuten bellen om te horen of het bij {organisatie} past?',
  },
  {
    id: 'opvang-fr',
    title: 'Refuge (Wallonie, Bruxelles)',
    audience: 'Refuge francophone',
    subject: 'Des promenades en plus pour vos chiens, avec de jeunes bénévoles (gratuit)',
    body: `{bonjour}

Je suis {jouwNaam}, de Rondje : une plateforme gratuite qui met en relation des jeunes de 18 ans et plus avec des chiens qui ont besoin d'une promenade en plus. J'aimerais beaucoup collaborer avec {organisatie}.

- Vous choisissez les chiens qui participent et les promeneurs qui viennent.
- Les promenades se font en petits groupes, toujours encadrés, aux moments que vous fixez.
- Lors de la première rencontre, votre encadrant vérifie la pièce d'identité. Pendant la promenade, il voit l'itinéraire en direct.
- Rondje gère les inscriptions, les présences et les rappels. Vous ajoutez tous vos chiens en une fois avec un tableur, et je vous aide volontiers.

C'est gratuit. Auriez-vous 20 minutes pour un appel ? Je vous montre comment cela fonctionne et, surtout, j'aimerais savoir ce qui convient ou non à vos chiens.

Bien cordialement,
{jouwNaam}, Rondje
{telefoon} · {website}`,
  },
  {
    id: 'opvang-es',
    title: 'Protectora (España)',
    audience: 'Protectora o centro de acogida en España',
    subject: 'Más paseos para vuestros perros, con voluntarios jóvenes (gratis)',
    body: `{hola}

Soy {jouwNaam}, de Rondje: una plataforma gratuita que pone en contacto a jóvenes mayores de 18 años con perros que necesitan un paseo más. Me encantaría colaborar con {organisatie}.

- Vosotros decidís qué perros participan y qué voluntarios vienen.
- Los paseos son en grupos pequeños, siempre supervisados, en los horarios que elijáis.
- En el primer encuentro, vuestro responsable comprueba el DNI o NIE. Durante el paseo, ve la ruta en directo.
- Los perros PPP solo los pasean voluntarios con licencia, o no participan. Lo decidís vosotros.
- Rondje se encarga de las inscripciones, la asistencia y los recordatorios. Subís todos los perros a la vez con una hoja de cálculo, y os ayudo con ello.

Es gratis. ¿Tendríais 20 minutos para una llamada? Os enseño cómo funciona y, sobre todo, quiero saber qué encaja y qué no con vuestros perros.

Un saludo,
{jouwNaam}, Rondje
{telefoon} · {website}`,
  },
  {
    id: 'vrijwilligersnet',
    title: 'Vrijwilligersnet: vallen wandelaars onder de polis?',
    audience: 'Vrijwilligersnet Nederland of de vrijwilligerscentrale van je gemeente',
    subject: 'Vraag: vallen vrijwilligers die honden uitlaten via een gratis platform onder de vrijwilligerspolis?',
    body: `Beste medewerker,

Ik ben {jouwNaam} en ik bouw Rondje, een gratis initiatief dat jongvolwassenen (18 tot 30) koppelt aan de hond van een oudere of zieke buurtgenoot die zelf niet ver meer kan lopen. Er is geen betaling tussen wandelaar en eigenaar, en Rondje heeft geen advertenties. De wandelaar loopt een vast rondje per week; de eerste keer is de eigenaar er altijd bij.

Mijn vraag: valt een wandelaar die via Rondje vrijwillig een hond uitlaat onder de vrijwilligerspolis van een aangesloten gemeente? En zo ja, moet Rondje daarvoor een stichting zijn, of moeten we samenwerken met een lokale welzijnsorganisatie?

We starten met een pilot in {stad}, en ik wil eigenaren eerlijk kunnen vertellen hoe het zit als er iets gebeurt.

Alvast bedankt.

${SIGN}`,
  },
  {
    id: 'depressie',
    title: 'Depressie Vereniging: meedenken over de juiste woorden',
    audience: 'Via het contactformulier op depressievereniging.nl',
    subject: 'Een vast rondje met een hond: wilt u meedenken over hoe we hierover praten?',
    body: `{aanhef},

Ik ben {jouwNaam} uit {stad}. Ik bouw Rondje: een gratis app die jongvolwassenen koppelt aan de hond van een oudere buurtgenoot of een dierenopvang, voor een vast rondje per week. Rondje is altijd gratis, heeft geen advertenties en wordt gedragen door giften.

Ik schrijf u omdat veel jongeren die zich somber of eenzaam voelen zeggen dat een vaste afspraak buiten, met een hond, ze goed doet. Ik wil daar zorgvuldig mee omgaan. Rondje is geen behandeling en belooft dat ook niet. In de app staat altijd hoe je 113 bereikt.

Wat ik u wil vragen:
- Wilt u meelezen met de teksten in de app en op de site over somberheid, zodat we de juiste woorden gebruiken?
- Mogen we in de app naar uw supportgroepen en informatie verwijzen, voor wie meer zoekt dan een wandeling?
- Later, als er koppels lopen: wilt u het goede doel zijn van een jaarlijkse Rondjesweek, waarin een sponsor per gelopen kilometer aan u geeft?

Ik vraag geen geld en geen gegevens. Zou u een half uur willen kennismaken?

${SIGN}`,
  },
  {
    id: 'hulphond',
    title: 'Hulphond Nederland: de Rondjesweek',
    audience: 'Via hulphond.nl',
    subject: 'Rondje: jongeren, oudere buren en hun honden. Mogen we kennismaken?',
    body: `{aanhef},

Ik ben {jouwNaam} en ik bouw Rondje, een gratis app die jongvolwassenen (18 tot 30) koppelt aan honden die een extra wandeling goed kunnen gebruiken: van oudere of zieke buurtgenoten en van dierenopvangen. Rondje is altijd gratis, zonder advertenties, en wordt gedragen door giften.

Uw werk laat zien wat een hond kan betekenen voor iemand die het zwaar heeft. Dat is precies waar Rondje op een kleine, alledaagse manier aan wil bijdragen.

Wat ik u wil voorstellen:
- Een jaarlijkse Rondjesweek: een week waarin iedereen extra rondjes loopt, en een sponsor per gelopen kilometer aan Hulphond Nederland geeft. Rondje regelt de actie en de sponsor; u bepaalt hoe uw naam gebruikt wordt.
- Uw kennis over hondenwelzijn en veilig wandelen, voor de veiligheidsquiz die elke wandelaar maakt.

Ik vraag geen geld en geen gegevens. Mag ik u een keer bellen of langskomen?

${SIGN}`,
  },
  {
    id: 'oopoeh',
    title: 'OOPOEH: samenwerken in plaats van concurreren',
    audience: 'Stichting OOPOEH',
    subject: 'Rondje en OOPOEH: elkaar aanvullen voor jong en oud?',
    body: `{aanhef},

Ik ben {jouwNaam} en ik bouw Rondje: jongvolwassenen van 18 tot 30 lopen een vast rondje per week met de hond van een oudere buurtgenoot of uit de opvang. Gratis, zonder advertenties.

Ik heb veel bewondering voor wat OOPOEH doet voor 55-plussers, en ik zie Rondje als een aanvulling, niet als concurrent. Daarom wil ik graag kennismaken over:
- Naar elkaar doorverwijzen. Een energieke hond die meer nodig heeft dan een rustige wandeling, of een stad waar OOPOEH niet actief is: naar Rondje. Iemand van 55+ die wil helpen: naar OOPOEH.
- Niet werven in elkaars koppels.
- Samen meten, met dezelfde vragen over eenzaamheid en beweging, zodat gemeenten en fondsen kunnen vergelijken.
- Misschien één gezamenlijke pilot, in een stad waar OOPOEH al actief is.

Heeft u een half uur voor een kennismaking?

${SIGN}`,
  },
  {
    id: 'gemeente',
    title: 'Gemeente: pilot tegen eenzaamheid',
    audience: 'Beleidsadviseur eenzaamheid of preventie, of de wethouder zorg en welzijn',
    subject: 'Een vast rondje met de hond van een oudere buur: resultaten uit {wijk}',
    body: `{aanhef},

Ik ben {jouwNaam} en ik bouw Rondje: jongvolwassenen van 18 tot 30 lopen een vast rondje per week met de hond van een oudere of zieke buurtgenoot. Gratis, zonder advertenties, en samen met [welzijnsorganisatie].

In {wijk} lopen inmiddels [aantal] vaste koppels. [Eén zin over wat het oplevert, met een cijfer uit de pilot.]

Het past bij Eén tegen eenzaamheid en bij de aandacht voor de weerbaarheid van jongeren (GALA), omdat het jong en oud tegelijk bereikt. Ik wil u graag laten zien wat we in de pilot hebben gemeten, en horen of een vervolg in meer wijken bij uw plannen past.

Heeft u een half uur?

${SIGN}`,
  },
  {
    id: 'fonds',
    title: 'Fonds: pitch voor een Oranje Ticket of vergelijkbaar',
    audience: 'Gebruik deze tekst in het aanvraagformulier van het fonds',
    subject: 'Aanvraag: Rondje, een vast rondje tegen eenzaamheid bij jong en oud',
    body: `Wat is het probleem?
Bijna een kwart van de 16- tot 25-jarigen voelt zich sterk eenzaam. Tegelijk hebben veel ouderen een hond die ze zelf niet meer ver kunnen uitlaten, en verliezen ze daarmee hun dagelijkse rondje en het contact dat erbij hoort.

Wat doet Rondje?
Rondje koppelt jongvolwassenen aan de hond van een oudere buurtgenoot of uit de opvang, voor een vast rondje per week. De eerste keer is de eigenaar er altijd bij, de eigenaar ziet het ID van de wandelaar, en tijdens het rondje kan hij live meekijken. Rondje is altijd gratis en heeft geen advertenties.

Wat willen we doen met de bijdrage?
Een pilot van 8 weken in {wijk} ({stad}), samen met [welzijnsorganisatie]: 10 wandelaars, 5 honden, flyers, intakes en een eenvoudige meting van eenzaamheid en beweging.

Hoe meten we het?
Het aantal rondjes per week van vaste koppels, hoeveel koppels na 8 weken nog lopen, en een korte vragenlijst voor en na (De Jong Gierveld, korte schaal).

Wie zijn we?
{jouwNaam}, [je achtergrond in twee zinnen].`,
  },
  {
    id: 'hogeschool',
    title: 'Hogeschool of universiteit: effectmeting',
    audience: 'Docent of onderzoeker sociaal werk, toegepaste psychologie of diergeneeskunde',
    subject: 'Praktijkvraag: helpt een vast rondje met een hond tegen eenzaamheid bij jongeren?',
    body: `{aanhef},

Ik ben {jouwNaam} en ik start Rondje: jongvolwassenen lopen een vast rondje per week met de hond van een oudere buurtgenoot of uit de opvang. Gratis, en samen met welzijnswerk.

Het bewijs dat contact met honden stress op korte termijn verlaagt is redelijk sterk. Wat er gebeurt bij een vast rondje over langere tijd, voor jongeren én voor de oudere eigenaar, is veel minder bekend.

Ik zoek een docent, onderzoeker of studentengroep die mee wil denken over een eenvoudige effectmeting in onze pilot (8 weken, ongeveer 15 koppels):
- voor en na een rondje
- eenzaamheid (De Jong Gierveld, korte schaal)
- beweging
- de ervaring van de eigenaar

De gegevens van wandelaars blijven op hun eigen telefoon, tenzij ze toestemming geven om te delen. Een DPIA maken we samen.

Is dit iets voor een minor, afstudeeropdracht of onderzoekslijn? Ik kom graag langs.

${SIGN}`,
  },
  {
    id: 'vetts',
    title: 'VETTS: dierenarts bij de hand',
    audience: 'VETTS B.V. (online dierenarts, Nijmegen)',
    subject: 'Pilot: dierenarts bij de hand voor vrijwillige hondenwandelaars',
    body: `{aanhef},

Ik ben {jouwNaam} en ik bouw Rondje, een gratis app die jongvolwassenen koppelt aan de hond van oudere buurtgenoten en van dierenopvangen. Tijdens een rondje kan de eigenaar live meekijken, en er is een SOS-scherm met 112, de eigenaar en de eigen dierenarts.

Wat nog ontbreekt: een dierenarts voor de vraag "is dit erg?" als de eigen dierenarts dicht is of de eigenaar niet opneemt. Ik vraag me af of VETTS dat wil zijn, als kleine pilot:
- Wandelaars krijgen tijdens een rondje gratis toegang tot een chat met een VETTS-dierenarts.
- VETTS staat op het SOS-scherm en op de site, zonder advertenties.
- Na de pilot delen we hoe vaak het gebruikt werd (alleen totalen).

Rondje is altijd gratis en heeft geen advertenties, dus een betaalde plek in de app kan ik niet bieden. Wel een eerlijk verhaal over hondeneigenaren die er niet alleen voor staan. Zou u willen kennismaken?

${SIGN}`,
  },
  {
    id: 'verzekeraar',
    title: 'Verzekeraar: collectieve dekking voor wandelingen',
    audience: 'Huisdierverzekeraar of het maatschappelijk fonds van een zorgverzekeraar',
    subject: 'Collectieve dekking voor vrijwillige hondenwandelingen: een gesprek?',
    body: `{aanhef},

Ik ben {jouwNaam} en ik bouw Rondje: jongvolwassenen lopen een vast rondje per week met de hond van een oudere buurtgenoot of uit de opvang. Gratis, zonder advertenties. In {stad} lopen inmiddels [aantal] vaste koppels.

De vraag die oudere eigenaren het vaakst stellen is: "Wat als er iets gebeurt?" Nu vragen we eigenaren te bevestigen dat hun WA-verzekering de hond dekt. Een collectieve dekking voor wandelingen via Rondje zou die drempel wegnemen, en past bij preventie: meer beweging en minder eenzaamheid, voor jong en oud.

Ik zou graag verkennen of [verzekeraar] daar iets in ziet, bijvoorbeeld als pilot in één stad. Cijfers over het aantal wandelingen en kilometers kan ik delen (alleen totalen).

Heeft u een half uur voor een gesprek?

${SIGN}`,
  },
  {
    id: 'dierenwinkel',
    title: 'Dierenwinkel: flyers en welkomstpakketjes',
    audience: 'Lokale dierenwinkel (past ook als DM op Instagram)',
    subject: 'Flyers voor een gratis buurtinitiatief met honden in {wijk}',
    body: `{aanhef},

Ik ben {jouwNaam} en ik start in {wijk} Rondje: een gratis initiatief waarbij jongeren wekelijks een rondje lopen met de hond van oudere buurtgenoten.

Mag ik een stapeltje flyers bij jullie kassa leggen? En als jullie het leuk vinden: voor de eerste 10 koppels een klein welkomstpakketje (poepzakjes, iets lekkers)? Dan bedank ik jullie in de video over de eerste koppels.

${SIGN}`,
    short:
      'Hoi! Ik start in {wijk} een gratis initiatief waarbij jongeren wekelijks een rondje lopen met de hond van oudere buurtgenoten. Mag ik een stapeltje flyers bij jullie kassa leggen? En als jullie het leuk vinden: voor de eerste 10 koppels een klein welkomstpakketje? Dan zet ik jullie in de bedankvideo. 🐾',
  },
  {
    id: 'dierenarts',
    title: 'Dierenarts: flyers aan de balie',
    audience: 'Dierenartspraktijk in je wijk',
    subject: 'Voor eigenaren die slecht ter been zijn: een gratis rondje voor hun hond',
    body: `{aanhef},

Ik ben {jouwNaam} en ik start in {wijk} Rondje: jongvolwassenen lopen een vast rondje per week met de hond van een oudere of zieke buurtgenoot. Gratis, en de eerste keer is de eigenaar er altijd bij.

U ziet eigenaar en hond samen, ook op het moment dat lopen lastig wordt, bijvoorbeeld na een heupoperatie. Mag ik een paar flyers bij uw balie leggen? En als het past, wilt u Rondje noemen bij eigenaren voor wie het uitlaten zwaar wordt?

Rondje vraagt eigenaren nooit om geld.

${SIGN}`,
  },
  {
    id: 'kbo',
    title: 'KBO-PCOB: tien minuten op een koffieochtend',
    audience: 'Lokale afdeling van KBO-PCOB (of een ouderenvereniging)',
    subject: 'Tien minuten op uw koffieochtend: hulp bij het uitlaten van de hond',
    body: `{aanhef},

Ik ben {jouwNaam} en ik start in {stad} Rondje: jongvolwassenen lopen een vast rondje per week met de hond van een oudere buurtgenoot die zelf niet ver meer kan lopen. Het is gratis, de eerste keer is de eigenaar er altijd bij, en Rondje vraagt nooit om geld.

Mag ik op een koffieochtend tien minuten vertellen hoe het werkt? Of een kort stukje schrijven voor uw afdelingsblad? Aanmelden kan ook zonder app: dat regel ik dan persoonlijk.

${SIGN}`,
  },
  {
    id: 'pers',
    title: 'Lokale krant of omroep',
    audience: 'Redactie van de lokale krant, huis-aan-huisblad of omroep',
    subject: 'Tip: jongeren lopen elke week met de hond van oudere buren in {wijk}',
    body: `{aanhef},

Een tip voor een verhaal: in {wijk} lopen jongeren elke week een vast rondje met de hond van een oudere buurtgenoot die zelf niet ver meer kan lopen. Het gaat via Rondje, een gratis initiatief zonder advertenties dat ik ben begonnen.

[Eén zin over een koppel dat het verhaal wil vertellen, met hun toestemming.]

Ik breng u graag in contact met een eigenaar en een wandelaar die er iets over willen vertellen.

${SIGN}`,
  },
  {
    id: 'opvolgen',
    title: 'Vriendelijk opvolgen',
    audience: 'Na een week zonder antwoord',
    subject: 'Re: {onderwerp}',
    body: `{aanhef},

Vorige week mailde ik u over Rondje. Kort: het is gratis, zonder advertenties, en de eerste keer is de eigenaar of begeleider er altijd bij.

Past een gesprek van 20 minuten in de week van [datum]? Komt het niet uit, of kan ik beter iemand anders spreken? Laat het me gerust weten.

${SIGN}`,
  },
]

export function templateById(id: string): MailTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

// ---------- The launch plan ----------

export interface HubTask {
  id: string
  title: string
  /** The concrete steps, short. */
  how: string[]
  xp: number
  link?: { href: string; label: string }
  /** Opens this mail in the Mails tab. */
  template?: TemplateId
  /** Ticking the task also moves this partner to "gemaild". */
  partner?: string
  /** Costs money or is a step that cannot be undone: do it yourself, deliberately. */
  yours?: boolean
}

export interface HubPhase {
  id: string
  title: string
  why: string
  tasks: HubTask[]
}

export const PHASES: HubPhase[] = [
  {
    id: 'fundament',
    title: 'Fundament',
    why: 'Naam, stichting en verzekering: dan kun je eerlijk vertellen wie Rondje is en waar giften heen gaan.',
    tasks: [
      {
        id: 'merkcheck',
        title: 'Doe de merkcheck op TMview',
        how: ['Zoek op "rondje" en op "goedrondje"', 'Filter op klasse 9, 42 en 45', 'Kijk alleen naar geregistreerde en aangevraagde merken'],
        xp: 20,
        link: { href: 'https://www.tmdn.org/tmview/', label: 'Open TMview' },
      },
      {
        id: 'naam',
        title: 'Kies de naam definitief',
        how: ['Advies: Goed Rondje', 'Zet de naam in project.yml (iOS) en laat de site volgen'],
        xp: 15,
      },
      {
        id: 'domein',
        title: 'Registreer het domein',
        how: ['goedrondje.nl en goedrondje.app waren op 2 oktober vrij', 'Koppel het in Vercel onder Settings, Domains'],
        xp: 15,
        yours: true,
      },
      {
        id: 'stichting',
        title: 'Richt Stichting Rondje op',
        how: ['Vraag twee notarissen om een offerte', 'Zoek twee bestuursleden naast jezelf (ANBI vraagt er minstens drie)', 'De notaris schrijft de stichting in bij de KvK'],
        xp: 60,
        yours: true,
      },
      {
        id: 'bank',
        title: 'Open een rekening voor de stichting',
        how: ['Zakelijke rekening op naam van de stichting', 'Nooit giften op je eigen rekening'],
        xp: 25,
        yours: true,
      },
      {
        id: 'anbi',
        title: 'Vraag de ANBI-status aan',
        how: ['Schrijf een kort beleidsplan', 'Zet bestuur, beleid en cijfers op de site', 'Aanvragen bij de Belastingdienst'],
        xp: 50,
        link: { href: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/aftrek-en-kortingen/content/anbi-status-aanvragen', label: 'ANBI aanvragen' },
        yours: true,
      },
      {
        id: 'verzekering',
        title: 'Vraag na of wandelaars verzekerd zijn',
        how: ['Mail Vrijwilligersnet Nederland', 'Of bel de vrijwilligerscentrale van je pilotgemeente'],
        xp: 30,
        template: 'vrijwilligersnet',
        partner: 'vrijwilligersnet',
      },
      {
        id: 'jurist',
        title: 'Laat de juridische teksten nakijken',
        how: ['Gebruik de checklist in docs/legal/REVIEW.md', 'Een rechtswinkel of studentenjuristen kan gratis'],
        xp: 40,
      },
      {
        id: 'eu-database',
        title: 'Controleer dat de database in de EU staat',
        how: ['Neon-project in de regio Frankfurt', 'Zie docs/LAUNCH.md'],
        xp: 20,
      },
      {
        id: 'vercel-pro',
        title: 'Zet Vercel op Pro voordat je om giften vraagt',
        how: ['Het gratis Hobby-plan is voor niet-commercieel gebruik', 'Pro kost ongeveer $20 per maand'],
        xp: 15,
        yours: true,
      },
    ],
  },
  {
    id: 'pilot',
    title: 'Pilot klaarzetten',
    why: 'Eén wijk helemaal goed. Eerst honden, dan pas wandelaars.',
    tasks: [
      { id: 'wijk', title: 'Kies je pilotwijk', how: ['Een wijk die je kent, met ouderen en studenten', 'Vul hem in bij Jij, dan staat hij in elke mail'], xp: 15, link: { href: '/hub/jij', label: 'Naar Jij' } },
      {
        id: 'welzijn',
        title: 'Mail de welzijnsorganisatie in je wijk',
        how: ['Zoek de coalitie via eentegeneenzaamheid.nl', 'Vraag om een half uur kennismaking'],
        xp: 40,
        template: 'welzijn',
        partner: 'welzijn-wijk',
      },
      { id: 'opvang-1', title: 'Mail de eerste opvang', how: ['Kies een opvang in je stad bij Partners', 'Bel na 5 werkdagen als je niets hoort'], xp: 30, template: 'opvang', link: { href: '/hub/partners?type=opvang', label: 'Opvangen' } },
      { id: 'flyers', title: 'Print 150 flyers met QR-code', how: ['Open /flyer en kies eigenaren of wandelaars', 'Ingelogd staat jouw uitnodigingslink in de QR-code, zo zie je aanmeldingen via flyers bij Cijfers'], xp: 20, link: { href: '/flyer', label: 'Naar de flyer' } },
      { id: 'flyerplekken', title: 'Leg flyers op 10 plekken', how: ['Dierenarts, apotheek, bibliotheek, buurthuis, supermarkt', 'Vraag eerst toestemming'], xp: 25 },
      { id: 'dierenwinkel', title: 'Vraag een dierenwinkel om flyers en pakketjes', how: ['Langsgaan werkt beter dan mailen', 'Gebruik de korte tekst als DM'], xp: 20, template: 'dierenwinkel', partner: 'dierenwinkel' },
      { id: 'dierenartsen', title: 'Vraag 2 dierenartsen om flyers aan de balie', how: ['Kort langsgaan met flyers', 'Of de mail sturen'], xp: 20, template: 'dierenarts', partner: 'dierenarts-wijk' },
      { id: 'kbo', title: 'Vraag KBO-PCOB om een koffieochtend', how: ['Tien minuten vertellen', 'Of een stukje in het afdelingsblad'], xp: 20, template: 'kbo', partner: 'kbo' },
      { id: 'buurtgroepen', title: 'Post in 3 buurtgroepen', how: ['Vraag eerst de beheerder', 'Deel een verhaal, geen advertentie'], xp: 20 },
    ],
  },
  {
    id: 'koppels',
    title: 'Eerste koppels',
    why: 'Vaste koppels zijn de motor. Blijven ze lopen, dan werkt Rondje.',
    tasks: [
      { id: 'bel-eigenaren', title: 'Bel elke nieuwe eigenaar binnen 2 dagen', how: ['Intake van 10 minuten', 'Check de verzekering en de afspreekplek'], xp: 25 },
      { id: 'eerste-kennismaking', title: 'Ga mee naar de eerste kennismaking', how: ['Jij, de eigenaar en de wandelaar', 'Neem flyers mee voor de buren'], xp: 30 },
      { id: 'na-rondje-2', title: 'Bel koppels na het tweede rondje', how: ['Hoe ging het?', 'Wat kan beter?'], xp: 25 },
      { id: 'meting-4-weken', title: 'Meet na 4 weken hoeveel koppels nog lopen', how: ['Doel: 3 koppels lopen wekelijks', 'Niet gehaald: eerst het waarom oplossen'], xp: 30, link: { href: '/hub/cijfers', label: 'Naar Cijfers' } },
      { id: 'bedankvideo', title: 'Bedank de eerste koppels', how: ['Een kaartje of een video (met toestemming)', 'Noem de dierenwinkel als die meedeed'], xp: 20 },
    ],
  },
  {
    id: 'zichtbaar',
    title: 'Zichtbaar worden',
    why: 'Video’s die op zichzelf iets waard zijn, nooit reclame.',
    tasks: [
      { id: 'instagram', title: 'Maak het Instagram-account', how: ['Naam gelijk aan de app', 'Link naar de site in de bio'], xp: 15, yours: true },
      { id: 'tiktok', title: 'Maak het TikTok-account', how: ['Zakelijk account, dan kan er een link in de bio'], xp: 15, yours: true },
      { id: 'bio-113', title: 'Zet 113 in je bio', how: ['"Gaat het niet goed? Bel 113 of gratis 0800-0113"'], xp: 5 },
      { id: 'toestemming', title: 'Maak een toestemmingsformulier voor filmen', how: ['Eigenaar, wandelaar en opvang tekenen', 'Geen adressen in beeld'], xp: 20 },
      { id: 'video-devlog', title: 'Post de eerste devlog', how: ['Video-idee 5: "Week 1: ik bouw een gratis app..."', 'Schermopname en je stem'], xp: 30, link: { href: '/hub/content', label: 'Naar Content' } },
      { id: 'video-snuffel', title: 'Post het Snuffelrondje', how: ['Video-idee 3, met elke hond te maken'], xp: 25, link: { href: '/hub/content', label: 'Naar Content' } },
      { id: 'pers', title: 'Tip de lokale krant', how: ['Zodra het eerste koppel loopt', 'Met toestemming van het koppel'], xp: 30, template: 'pers', partner: 'lokale-krant' },
    ],
  },
  {
    id: 'partners',
    title: 'Partners en geld',
    why: 'Eerst aanbod en vertrouwen, dan bewijs, dan geld.',
    tasks: [
      { id: 'depressie', title: 'Mail de Depressie Vereniging', how: ['Via het contactformulier', 'Vraag om kennis, niet om geld'], xp: 30, template: 'depressie', partner: 'depressie-vereniging' },
      { id: 'hulphond', title: 'Mail Hulphond Nederland', how: ['Stel de Rondjesweek voor'], xp: 30, template: 'hulphond', partner: 'hulphond' },
      { id: 'oopoeh', title: 'Plan een gesprek met OOPOEH', how: ['Samenwerken, niet concurreren'], xp: 30, template: 'oopoeh', partner: 'oopoeh' },
      { id: 'oranje-ticket', title: 'Vraag een Oranje Ticket aan', how: ['€1.000 tot €5.000 voor jonge initiatiefnemers', 'Gebruik de pitch bij Mails'], xp: 50, template: 'fonds', partner: 'oranje-fonds' },
      { id: 'hogeschool', title: 'Mail een hogeschool voor de effectmeting', how: ['Sociaal werk of toegepaste psychologie'], xp: 30, template: 'hogeschool', partner: 'hogeschool' },
      { id: 'vetts', title: 'Mail VETTS over een dierenartslijn', how: ['Pas als er koppels lopen'], xp: 20, template: 'vetts', partner: 'vetts' },
      { id: 'verzekeraar', title: 'Vraag een verzekeraar naar een collectieve dekking', how: ['Na 3 maanden cijfers'], xp: 30, template: 'verzekeraar', partner: 'verzekeraar' },
      { id: 'gemeente', title: 'Plan een gesprek met de gemeente', how: ['Via de welzijnsorganisatie', 'Met resultaten uit de pilot'], xp: 40, template: 'gemeente', partner: 'gemeente' },
      { id: 'ledenpagina', title: 'Zet de ledenpagina live', how: ['Pas na de stichting en ANBI', 'Giften alleen via de website'], xp: 30, yours: true },
    ],
  },
  {
    id: 'appstore',
    title: 'App Store',
    why: 'De iPhone-app in de winkel, met een eerlijke tekst.',
    tasks: [
      { id: 'apple-account', title: 'Maak een Apple Developer-account', how: ['$99 per jaar', 'Bij voorkeur op naam van de stichting'], xp: 20, yours: true },
      { id: 'apns', title: 'Zet de APNs-sleutel op Vercel', how: ['Maak de sleutel in het Apple Developer-portaal', 'APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY, APNS_BUNDLE_ID'], xp: 20 },
      { id: 'testflight', title: 'Test de app via TestFlight', how: ['Met 5 echte wandelaars', 'Vraag wat onduidelijk was'], xp: 30 },
      { id: 'screenshots', title: 'Maak 5 screenshots', how: ['Kaart, kennismaking, live meekijken, Vandaag, de belofte'], xp: 20 },
      { id: 'indienen', title: 'Dien de app in bij Apple', how: ['Met de App Store-tekst en de reviewnotities', 'Leeftijd 18+'], xp: 50, yours: true },
    ],
  },
]

export const ALL_TASKS: HubTask[] = PHASES.flatMap((p) => p.tasks)

// ---------- Video ideas (docs/GROWTH.md) ----------

export const VIDEO_STATUSES = ['idee', 'gepland', 'gefilmd', 'gepost'] as const
export type VideoStatus = (typeof VIDEO_STATUSES)[number]
export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = { idee: 'Idee', gepland: 'Gepland', gefilmd: 'Gefilmd', gepost: 'Gepost' }

export interface VideoIdea {
  id: string
  title: string
  hook: string
  why: string
  effort: 'laag' | 'midden'
  /** Can be made today, without a pair or a shelter. */
  now?: boolean
}

export const VIDEOS: VideoIdea[] = [
  { id: 'devlog', title: 'Bouwen in het openbaar', hook: 'Week 1: ik bouw een gratis app zodat oma’s hond weer naar buiten kan.', why: 'Eerlijke makersverhalen worden gevolgd, en de reacties zijn je markttest.', effort: 'laag', now: true },
  { id: 'snuffel', title: 'Snuffelrondje', hook: 'Kees deed 45 minuten over 800 meter. Dit is waarom.', why: 'Grappig én leerzaam: iedere hondenbezitter herkent het.', effort: 'laag', now: true },
  { id: 'eerste-rondje', title: 'Eerste rondje', hook: 'Deze riem hing hier 3 maanden.', why: 'Hartverwarmend tussen generaties: mensen taggen hun oma.', effort: 'midden' },
  { id: 'dagje-uit', title: 'Dagje uit', hook: 'Mo wacht al 214 dagen. Vandaag gaat hij naar het park.', why: 'Bewezen format; de oproep gaat over de hond, niet over de app.', effort: 'midden' },
  { id: 'rondje-van', title: 'Het rondje van...', hook: 'Henk liep dit rondje elf jaar lang, elke dag.', why: 'Ontroerend, over ouderen die zelfstandig willen blijven.', effort: 'midden' },
  { id: 'raad-het-ras', title: 'Raad het ras', hook: 'Ik tekende de honden uit onze buurt. Wie is wie?', why: 'Kijkers raden in de reacties, dat duwt het algoritme.', effort: 'laag', now: true },
  { id: 'vraag-opvang', title: 'Vraag het de opvang', hook: '3 dingen die iedereen fout doet bij een eerste wandeling met een asielhond.', why: 'Nuttig, wordt opgeslagen, bouwt vertrouwen op.', effort: 'midden' },
  { id: 'rondje-rust', title: 'Rondje rust', hook: 'Regen op een plas, een poot stapt erin. Alleen geluid.', why: 'Rustmoment in een drukke feed; mensen kijken het opnieuw.', effort: 'laag', now: true },
  { id: 'reacties', title: 'Ans leest reacties', hook: 'We lieten Ans (81) de reacties op Saar lezen.', why: 'Humor tussen generaties, warm in plaats van zielig.', effort: 'midden' },
  { id: 'tentamenweek', title: 'Tentamenweek-rondje', hook: '30 minuten geen scherm. Wel een hond.', why: 'Herkenbaar voor studenten, zonder te preken.', effort: 'laag', now: true },
]

export const CONTENT_RULES = [
  'De video heeft op zichzelf waarde, ook voor wie Rondje nooit gebruikt.',
  'Geen "download onze app": Rondje staat hooguit in de bio.',
  'Toestemming eerst. Geen adressen, huisnummers of minderjarigen in beeld.',
  'Nooit zeggen dat wandelen een depressie geneest. 113 in de bio.',
  'De hond is de ster: dierenwelzijn gaat voor de shot.',
]

// ---------- Costs ----------

export type CostPeriod = 'maand' | 'jaar' | 'eenmalig'

export interface CostLine {
  id: string
  label: string
  /** In euros. */
  amount: number
  period: CostPeriod
  note: string
  /** Only counts once it is switched on (for example Vercel Pro or Google Play). */
  active: boolean
}

/** Starting values from docs/LAUNCH.md and STRATEGY.md. Estimates: check them against your invoices. */
export const DEFAULT_COSTS: CostLine[] = [
  { id: 'neon', label: 'Neon (database)', amount: 5, period: 'maand', note: 'Op gebruik: ongeveer $0,11 per rekenuur en $0,35 per GB. Schaalt naar nul als niemand de site gebruikt.', active: true },
  { id: 'vercel', label: 'Vercel Hobby (hosting)', amount: 0, period: 'maand', note: 'Gratis, maar alleen voor niet-commercieel gebruik.', active: true },
  { id: 'vercel-pro', label: 'Vercel Pro', amount: 19, period: 'maand', note: 'Ongeveer $20 per maand. Nodig zodra je om giften vraagt.', active: false },
  { id: 'blob', label: 'Vercel Blob (foto’s)', amount: 0, period: 'maand', note: 'Gratis tot een bepaalde hoeveelheid. Kijk in het Vercel-dashboard.', active: true },
  { id: 'resend', label: 'Resend (e-mail)', amount: 0, period: 'maand', note: 'Het gratis plan is genoeg om te beginnen.', active: true },
  { id: 'domein', label: 'Domein', amount: 15, period: 'jaar', note: 'Bijvoorbeeld goedrondje.nl.', active: true },
  { id: 'apple', label: 'Apple Developer', amount: 95, period: 'jaar', note: '$99 per jaar.', active: true },
  { id: 'google-play', label: 'Google Play Console', amount: 24, period: 'eenmalig', note: 'Eenmalig $25, alleen voor Android.', active: false },
  { id: 'flyers', label: 'Flyers en kaartjes', amount: 30, period: 'maand', note: 'Schatting voor de pilot.', active: true },
  { id: 'notaris', label: 'Notaris (stichting oprichten)', amount: 500, period: 'eenmalig', note: 'Schatting: vraag twee offertes.', active: true },
  { id: 'merk', label: 'Merk vastleggen (BOIP)', amount: 250, period: 'eenmalig', note: 'Schatting voor één klasse: kijk de tarieven na op boip.int.', active: false },
]

// ---------- The founder's levels ----------

export const FOUNDER_LEVELS = [
  { min: 0, name: 'Idee' },
  { min: 60, name: 'Plan' },
  { min: 180, name: 'Fundament' },
  { min: 360, name: 'Eerste stap' },
  { min: 600, name: 'Pilot' },
  { min: 900, name: 'Buurt' },
  { min: 1300, name: 'Stad' },
  { min: 1800, name: 'Regio' },
  { min: 2500, name: 'Land' },
  { min: 3400, name: 'Beweging' },
] as const

// ---------- Your details ----------

export interface HubSettings {
  jouwNaam: string
  telefoon: string
  email: string
  website: string
  stad: string
  wijk: string
  /** Weekly rhythm the hub nudges towards. */
  mailsPerWeek: number
  videosPerWeek: number
}

export const DEFAULT_SETTINGS: HubSettings = {
  jouwNaam: 'Laurens',
  telefoon: '',
  email: '',
  website: 'rondje-five.vercel.app',
  stad: '',
  wijk: '',
  mailsPerWeek: 3,
  videosPerWeek: 2,
}

export interface HubIncome {
  /** Members who give every month, and what they give on average. */
  members: number
  averageGift: number
  /** One-off gifts and fund money, per month on average. */
  otherPerMonth: number
}

export const DEFAULT_INCOME: HubIncome = { members: 0, averageGift: 5, otherPerMonth: 0 }
