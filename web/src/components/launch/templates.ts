// The message bank of the launch hub. Shelter texts come from docs/OUTREACH.md §5 (nl, fr, es);
// the others are new, in the same tone. Rules for every text: honest, warm, no health claims, no
// names of organisations as partners, and say that it is free and new. {app} is filled in with
// APP_NAME (src/lib/site.ts), so the texts follow the name. Nothing here is sent by the app itself.

import type { Audience } from './audiences'

export type TemplateKind = 'mail' | 'followup' | 'call' | 'post'

export interface Template {
  id: string
  audience: Audience
  lang: 'nl' | 'fr' | 'es'
  kind: TemplateKind
  /** Empty for a call script or a short post. */
  subject: string
  body: string
}

/** Kinds that make sense as an e-mail (the others are copied: a call script, a post in a group). */
export const MAIL_KINDS: TemplateKind[] = ['mail', 'followup']

export const TEMPLATES: Template[] = [
  // ---------- Opvangen (docs/OUTREACH.md §5) ----------
  {
    id: 'shelter-nl-mail',
    audience: 'shelter',
    lang: 'nl',
    kind: 'mail',
    subject: 'Extra wandelingen voor uw honden, met vrijwilligers uit de buurt (gratis)',
    body: `Beste {naam},

Ik ben {afzender} van {app}: een gratis platform dat mensen vanaf 18 jaar koppelt aan honden die een extra wandeling goed kunnen gebruiken. Ik zou graag samenwerken met {organisatie}.

- U bepaalt welke honden meedoen en welke wandelaars komen.
- Er wordt gewandeld in kleine groepen, altijd onder begeleiding, op momenten die u kiest.
- Bij de eerste kennismaking controleert uw begeleider het ID. Tijdens de wandeling ziet de begeleider de route live.
- Inschrijven, aanwezigheid en herinneringen regelt {app}. Uw honden zet u er in één keer op met een spreadsheet, en ik help daarbij.

Het is gratis. Heeft u 20 minuten voor een kort gesprek? Dan laat ik zien hoe het werkt, en hoor ik vooral graag wat wel en niet bij uw honden past.

Met vriendelijke groet,
{afzender}, {app}
{telefoon} · {link}`,
  },
  {
    id: 'shelter-nl-followup',
    audience: 'shelter',
    lang: 'nl',
    kind: 'followup',
    subject: 'Re: Extra wandelingen voor uw honden',
    body: `Beste {naam},

Vorige week mailde ik u over {app}. Kort: het is gratis, u kiest de honden en de wandelaars, en elke wandeling is begeleid, met een ID-check bij het eerste bezoek.

Past een gesprek van 20 minuten in de week van {datum}? Komt het niet uit, of kan ik beter iemand anders spreken? Laat het me gerust weten.

Met vriendelijke groet,
{afzender}, {app}`,
  },
  {
    id: 'shelter-nl-call',
    audience: 'shelter',
    lang: 'nl',
    kind: 'call',
    subject: '',
    body: `"Goedemorgen, u spreekt met {afzender} van {app}. Spreek ik met {naam}, of met wie de vrijwilligers coördineert? Heeft u één minuut?

{app} is een gratis platform dat mensen vanaf 18 jaar koppelt aan honden die een extra wandeling kunnen gebruiken. Bij opvangen gaat dat in kleine groepen, altijd onder begeleiding, op momenten die u kiest. U bepaalt welke honden meedoen en wie er mag komen. Uw begeleider controleert bij het eerste bezoek het ID en ziet tijdens de wandeling de route live. Inschrijven en aanwezigheid regelen wij.

Ik bel om te horen of dit bij {organisatie} past. Heeft u twintig minuten voor een gesprek, bijvoorbeeld {dagen}?"

- "Stuur maar een mail." Doe ik. Naar welk adres? Mag ik volgende week nabellen?
- "Nee, dank u." Dank u voor uw tijd. Mag ik vragen waarom? Dan weet ik of het later wel past.`,
  },
  {
    id: 'shelter-fr-mail',
    audience: 'shelter',
    lang: 'fr',
    kind: 'mail',
    subject: 'Des promenades en plus pour vos chiens, avec des bénévoles des environs (gratuit)',
    body: `Bonjour {naam},

Je suis {afzender}, de {app} : une plateforme gratuite qui met en relation des personnes de 18 ans et plus avec des chiens qui ont besoin d'une promenade en plus. J'aimerais beaucoup collaborer avec {organisatie}.

- Vous choisissez les chiens qui participent et les promeneurs qui viennent.
- Les promenades se font en petits groupes, toujours encadrés, aux moments que vous fixez.
- Lors de la première rencontre, votre encadrant vérifie la pièce d'identité. Pendant la promenade, il voit l'itinéraire en direct.
- {app} gère les inscriptions, les présences et les rappels. Vous ajoutez tous vos chiens en une fois avec un tableur, et je vous aide volontiers.

C'est gratuit. Auriez-vous 20 minutes pour un appel ? Je vous montre comment cela fonctionne et, surtout, j'aimerais savoir ce qui convient ou non à vos chiens.

Bien cordialement,
{afzender}, {app}
{telefoon} · {link}`,
  },
  {
    id: 'shelter-fr-followup',
    audience: 'shelter',
    lang: 'fr',
    kind: 'followup',
    subject: 'Re : Des promenades en plus pour vos chiens',
    body: `Bonjour {naam},

Je reviens vers vous au sujet de {app}. En bref : c'est gratuit, vous choisissez les chiens et les promeneurs, et chaque promenade est encadrée, avec un contrôle d'identité à la première visite.

Un appel de 20 minutes la semaine du {datum} vous conviendrait-il ? Si ce n'est pas le moment, ou s'il vaut mieux que je contacte quelqu'un d'autre, dites-le-moi simplement.

Bien cordialement,
{afzender}, {app}`,
  },
  {
    id: 'shelter-fr-call',
    audience: 'shelter',
    lang: 'fr',
    kind: 'call',
    subject: '',
    body: `« Bonjour, {afzender}, de {app}. Je parle bien à {naam}, ou à la personne responsable des bénévoles ? Vous avez une minute ?

{app} est une plateforme gratuite qui met en relation des personnes de 18 ans et plus avec des chiens qui ont besoin d'une promenade en plus. Avec les refuges, cela se fait en petits groupes, toujours encadrés, aux moments que vous choisissez. Vous décidez quels chiens participent et qui peut venir. Votre encadrant vérifie la pièce d'identité à la première visite et voit l'itinéraire en direct pendant la promenade. Nous gérons les inscriptions et les présences.

Je vous appelle pour savoir si cela pourrait convenir à {organisatie}. Auriez-vous 20 minutes pour en parler, par exemple {dagen} ? »

- « Envoyez-moi un e-mail. » Avec plaisir. À quelle adresse ? Je peux vous rappeler la semaine prochaine ?
- « Non, merci. » Merci pour votre temps. Puis-je vous demander pourquoi ? Cela m'aide pour plus tard.`,
  },
  {
    id: 'shelter-es-mail',
    audience: 'shelter',
    lang: 'es',
    kind: 'mail',
    subject: 'Más paseos para vuestros perros, con voluntarios de la zona (gratis)',
    body: `Hola, {naam}:

Soy {afzender}, de {app}: una plataforma gratuita que pone en contacto a personas de 18 años o más con perros que necesitan un paseo más. Me encantaría colaborar con {organisatie}.

- Vosotros decidís qué perros participan y qué voluntarios vienen.
- Los paseos son en grupos pequeños, siempre supervisados, en los horarios que elijáis.
- En el primer encuentro, vuestro responsable comprueba el DNI o NIE. Durante el paseo, ve la ruta en directo.
- Los perros PPP solo los pasean voluntarios con licencia, o no participan. Lo decidís vosotros.
- {app} se encarga de las inscripciones, la asistencia y los recordatorios. Subís todos los perros a la vez con una hoja de cálculo, y os ayudo con ello.

Es gratis. ¿Tendríais 20 minutos para una llamada? Os enseño cómo funciona y, sobre todo, quiero saber qué encaja y qué no con vuestros perros.

Un saludo,
{afzender}, {app}
{telefoon} · {link}`,
  },
  {
    id: 'shelter-es-followup',
    audience: 'shelter',
    lang: 'es',
    kind: 'followup',
    subject: 'Re: Más paseos para vuestros perros',
    body: `Hola, {naam}:

La semana pasada os escribí sobre {app}. En resumen: es gratis, vosotros decidís qué perros y qué voluntarios participan, y todos los paseos son supervisados, con comprobación del DNI o NIE en la primera visita.

¿Os vendría bien una llamada de 20 minutos la semana del {datum}? Si no es buen momento, o si es mejor hablar con otra persona, decídmelo sin problema.

Un saludo,
{afzender}, {app}`,
  },
  {
    id: 'shelter-es-call',
    audience: 'shelter',
    lang: 'es',
    kind: 'call',
    subject: '',
    body: `«Hola, buenos días. Soy {afzender}, de {app}. ¿Hablo con {naam}, o con quien coordina el voluntariado? ¿Tienes un minuto?

{app} es una plataforma gratuita que pone en contacto a personas de 18 años o más con perros que necesitan un paseo más. Con las protectoras funciona con paseos en grupos pequeños, siempre supervisados, en los horarios que elijáis. Vosotros decidís qué perros participan y quién viene. Vuestro responsable comprueba el DNI o NIE en la primera visita y ve la ruta en directo durante el paseo. Nosotros nos encargamos de las inscripciones y la asistencia.

Te llamo para saber si podría encajar con {organisatie}. ¿Tendrías 20 minutos para hablarlo, por ejemplo {dagen}?»

- «Mándame un correo.» Perfecto. ¿A qué dirección? ¿Te llamo la semana que viene?
- «No, gracias.» Gracias por tu tiempo. ¿Puedo preguntarte por qué? Así sé si podría encajar más adelante.`,
  },

  // ---------- Dierenartsen ----------
  {
    id: 'vet-nl-mail',
    audience: 'vet',
    lang: 'nl',
    kind: 'mail',
    subject: 'Mag ik een flyer bij u neerleggen? Gratis hulp bij het uitlaten, nieuw in {stad}',
    body: `Beste {naam},

Ik ben {afzender} en ik ben net begonnen met {app}: een nieuw, gratis platform dat mensen vanaf 18 jaar koppelt aan honden die een extra wandeling goed kunnen gebruiken. Vaak gaat het om honden van buurtgenoten die zelf niet meer ver kunnen lopen, bijvoorbeeld door hun leeftijd of na een operatie.

Bij {organisatie} ziet u vast weleens een baasje dat de hond niet meer zo vaak buiten krijgt als het zou willen. Daarom een vraag: mag ik een flyer neerleggen of een poster ophangen in de wachtruimte?

Zo werkt het, kort:
- De eigenaar bepaalt wie er wandelt, hoe lang en wanneer.
- De eerste keer lopen de wandelaar en de eigenaar altijd samen. Het ID wordt dan in het echt bekeken.
- Pas daarna, en alleen als de eigenaar dat wil, loopt de wandelaar alleen. Tijdens het rondje ziet de eigenaar live waar de hond is.

Het is gratis en zonder advertenties. Ik hoor ook graag wat u als dierenarts belangrijk vindt voordat iemand anders een hond uitlaat.

Kijken kan hier: {link}

Met vriendelijke groet,
{afzender}, {app}
{telefoon}`,
  },
  {
    id: 'vet-nl-followup',
    audience: 'vet',
    lang: 'nl',
    kind: 'followup',
    subject: 'Re: Een flyer voor de wachtruimte',
    body: `Beste {naam},

Vorige week mailde ik u over {app}, het gratis platform voor baasjes die hun hond niet meer zo vaak zelf kunnen uitlaten. Mag ik in de week van {datum} even langskomen met een paar flyers? Past het niet, dan hoor ik dat ook graag.

Met vriendelijke groet,
{afzender}, {app}
{telefoon}`,
  },

  // ---------- Studentenverenigingen ----------
  {
    id: 'student-nl-mail',
    audience: 'student',
    lang: 'nl',
    kind: 'mail',
    subject: 'Voor jullie leden: gratis een vast rondje met een hond uit de buurt',
    body: `Hoi {naam},

Ik ben {afzender} en ik ben net begonnen met {app}: een nieuw, gratis platform dat mensen vanaf 18 jaar koppelt aan honden die een extra wandeling goed kunnen gebruiken. Het gaat om honden van buurtgenoten die zelf niet meer ver kunnen lopen, en om honden uit de opvang in {stad}.

Veel studenten missen de hond van thuis. Misschien is dit iets voor de leden van {organisatie}: een vast rondje in de week, gratis, met een hond die er blij mee is. En samen buiten zijn kan je dag goed doen.

- Je kiest zelf een hond in de buurt en spreekt een moment af.
- De eerste keer loop je altijd samen met de eigenaar of met de opvang.
- Pas als de eigenaar het goed vindt, en na een korte veiligheidsquiz, loop je alleen.

Zouden jullie dit willen delen in de groepsapp of de nieuwsbrief? Ik stuur graag een korte tekst en een afbeelding mee. Vragen kan altijd.

Kijk hier: {link}

Groetjes,
{afzender}, {app}
{telefoon}`,
  },
  {
    id: 'student-nl-post',
    audience: 'student',
    lang: 'nl',
    kind: 'post',
    subject: '',
    body: `Mis je de hond van thuis? 🐶 Met {app} loop je gratis een vast rondje met een hond uit de buurt, van iemand die zelf niet meer ver kan lopen, of uit de opvang. De eerste keer loop je samen met de eigenaar. Nieuw, gratis en vanaf 18 jaar: {link}`,
  },

  // ---------- Buurtapps ----------
  {
    id: 'neighbourhood-nl-whatsapp',
    audience: 'neighbourhood',
    lang: 'nl',
    kind: 'post',
    subject: '',
    body: `Hoi buren! Ik ben {afzender} uit {stad}. Kent u iemand in de buurt wiens hond vaker naar buiten wil, maar die zelf niet meer zo ver kan lopen? Of wilt u zelf graag een vast rondje met een hond?

Daarvoor is {app}: een nieuw, gratis platform dat mensen vanaf 18 jaar koppelt aan honden van buurtgenoten. De eigenaar bepaalt wie er wandelt, en de eerste keer loop je altijd samen.

Kijk gerust: {link}
Vragen mag altijd, hier of als u me tegenkomt.`,
  },
  {
    id: 'neighbourhood-nl-platform',
    audience: 'neighbourhood',
    lang: 'nl',
    kind: 'post',
    subject: 'Gezocht: honden die een extra rondje kunnen gebruiken (gratis)',
    body: `Hallo allemaal,

Ik ben {afzender} en woon in {stad}. Ik ben net begonnen met {app}: een gratis platform dat mensen vanaf 18 jaar koppelt aan honden van buurtgenoten die zelf niet meer zo ver kunnen lopen.

Zo gaat het:
- De eigenaar bepaalt wie er wandelt, hoe lang en wanneer.
- De eerste keer lopen wandelaar en eigenaar samen; het ID wordt dan in het echt bekeken.
- Daarna kan de wandelaar alleen, als de eigenaar dat wil. Tijdens het rondje ziet de eigenaar live waar de hond is.

Het is gratis en zonder advertenties. Kent u iemand voor wie dit fijn zou zijn, of wilt u zelf wandelen? Kijk op {link} of stuur me een bericht.

Groet,
{afzender}`,
  },

  // ---------- Lokale pers ----------
  {
    id: 'press-nl-mail',
    audience: 'press',
    lang: 'nl',
    kind: 'mail',
    subject: 'Nieuw in {stad}: gratis wandelen met de hond van een buurtgenoot',
    body: `Beste {naam},

Ik ben {afzender} en ik ben net begonnen met {app}: een nieuw, gratis platform dat mensen vanaf 18 jaar koppelt aan honden die een extra wandeling goed kunnen gebruiken. Het gaat om honden van buurtgenoten die zelf niet meer ver kunnen lopen, en om honden uit de opvang, die in kleine, begeleide groepjes wandelen.

Misschien is dit een verhaal voor {organisatie}. Wat het misschien interessant maakt:
- Het is gratis en zonder advertenties, en we beginnen nu in {stad}.
- Veiligheid gaat stap voor stap: eerst samen kennismaken en het ID in het echt bekijken; pas daarna alleen wandelen, als de eigenaar dat wil.
- Jong en oud in dezelfde straat leren elkaar kennen via de hond.

We zijn eerlijk gezegd nog klein. Ik vertel er graag meer over, en zoek graag mee naar een wandelaar en een eigenaar die mee willen doen aan een gesprek of foto, alleen als zij dat zelf willen.

Meer weten: {link}

Met vriendelijke groet,
{afzender}, {app}
{telefoon}`,
  },
]

export function templatesFor(audience: Audience): Template[] {
  return TEMPLATES.filter((t) => t.audience === audience)
}
