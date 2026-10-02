# Opvangen aansluiten: outreachplan voor Nederland, België en Spanje

Concept van 2 oktober 2026. Er is nog niets verstuurd: echte organisaties benaderen gebeurt pas na jouw akkoord, vanuit je eigen naam (zie [`DECISIONS.md`](DECISIONS.md)).

Startlijst: [`web/content/shelters.json`](../web/content/shelters.json), 39 opvangen (NL 16, BE 10, ES 13) met een `confidence` per opvang. Controleer naam, website en contactpersoon voordat je mailt. Utrecht, Rotterdam, Den Haag en Groningen ontbreken nog (naam niet te bevestigen): vul ze in week 1 aan.

## 1. Waarom opvangen eerst

- **Veel honden in één keer**, met een vaste plek en vaste tijden. Eigenaren werf je hond voor hond (zie [`SUPPLY.md`](SUPPLY.md)).
- **Begeleiders** die de honden kennen, zijn er al.
- **Geloofwaardigheid** bij wandelaars, gemeenten en fondsen.
- **Doorverwijzen:** opvangen kennen veel vrijwilligers en adoptanten (§4).

| Land | De eerlijke nuance | Wat je benadrukt |
|---|---|---|
| **Nederland** | Opvangen zitten meestal niet vol. Er is eerder een tekort aan adopteerbare honden, en opvanghonden hebben vaak gedragsproblemen ([PAWS](https://pawsnederland.org/feiten-en-fabels-in-nederland-zitten-de-asiels-niet-vol-er-is-een-tekort-aan-leuke-gezelschapshonden/), [Friends4StrayDogs](https://www.stichting-friends4straydogs.nl/misverstand-overvolle-asiels)). Wel komen er jaarlijks ruim 10.000 honden binnen ([Dierenbescherming](https://www.dierenbescherming.nl/in-actie-komen/op-school/spreekbeurten/honden)). | Kwaliteit, geen massa: begeleide groepswandelingen met niveaus (starter en ervaren) en betrouwbare, vaste wandelaars. |
| **België** | Ertussenin. Vlaanderen heeft al een wandelclub (Dierenasiel Gent) en online boeken (Animal Trust). Wallonië en Brussel zijn Franstalig. | Minder planwerk en nieuwe jonge wandelaars, naast wat er al is. |
| **Spanje** | Veel grotere aantallen: in de orde van ruim 100.000 opgevangen honden per jaar (Fundación Affinity) **[te verifiëren]**. Veel protectoras hebben al een *voluntariado de paseo*. | Meer wandelingen voor meer honden, zonder papierwerk. Let op PPP-honden (§6). |

## 2. Wat Rondje een opvang biedt

- **Meer wandelingen**, op momenten die de opvang kiest. Onderzoek koppelt regelmatige wandelingen aan positievere emoties bij opvanghonden ([ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1558787823001338)), maar beloof geen effect.
- **Gescreende jonge vrijwilligers:** 18+, de eerste kennismaking altijd begeleid, en een ID-check in persoon bij het eerste bezoek.
- **Een gratis hulpmiddel:** groepswandelingen boeken (maximaal 4 wandelaars per begeleider), aanwezigheid, herinneringen, en tijdens de wandeling de live route voor de begeleider.
- **Geen extra administratie:** alle honden in één keer importeren met een CSV-bestand.
- **Zichtbaarheid voor adoptie**, als de opvang dat wil: korte video's van langverblijvers, met toestemming.
- **De opvang houdt de regie** over welke honden meedoen en welke wandelaars komen.

| | Publiek centrum (CAACB, CMPA Zaragoza, CIAAM) | Stichting, vzw/asbl of asociación |
|---|---|---|
| Wat telt | Wetgeving, veiligheid, aansprakelijkheid, verantwoording | Adopties, vrijwilligers, zichtbaarheid |
| Pitch | Meer wandelingen zonder extra personeel; overzicht van aanwezigheid en uren | Betrouwbare vrijwilligers, minder plannen, video's |
| Beslissing | Traag: vaak een formele overeenkomst (*convenio de colaboración*) | Snel: coördinator of bestuur |

Begin bij particuliere opvangen en benader publieke centra tegelijk. Sommige Nederlandse opvangen horen bij de Dierenbescherming (Gouda, Ede): één afspraak daar kan meerdere deuren openen.

**Beloof niets wat je nog niet hebt:** geen "meer adopties", en laat in een demo alleen zien wat echt werkt (check bijvoorbeeld de live route).

## 3. De funnel

| Stap | Wat | Doel (aanname) |
|---|---|---|
| 1. Lijst | `shelters.json` controleren en aanvullen, en de vrijwilligerscoördinator vinden. Bronnen: de Dierenbescherming, gemeentesites (wie heeft het zwerfdierencontract?) en adopteereendier.be **[te verifiëren]**. | 10 opvangen per week |
| 2. Eerste contact | Mail (§5), na 2 werkdagen bellen | 35% reageert |
| 3. Demo van 20 minuten | 5 minuten demo, 15 minuten vragen: honden, begeleiders, momenten, zorgen | De helft van de reacties |
| 4. Verificatie | Controle van het KvK-nummer (NL), KBO-nummer (BE) of CIF/NIF (ES). In België ook het erkenningsnummer, in Spanje de registratie als *núcleo zoológico* **[te verifiëren]**. | 70% van de demo's |
| 5. Honden importeren | CSV-template, eerst 3 tot 5 starterhonden | Binnen 7 dagen |
| 6. Eerste groepswandeling | Begeleid, maximaal 4 wandelaars, ID-check bij aankomst | Binnen 14 dagen na verificatie |
| 7. Content | Korte video, met schriftelijke toestemming van opvang en wandelaars | 1 per live opvang |
| 8. Doorverwijzen | Vraag twee introducties bij andere opvangen (§4) | 1 op de 3 live opvangen |

**Wat nu in de app staat (oktober 2026)** en de funnel sneller maakt:
- **Wie eerst?** Kijk in **Beheer → Tips en stemmen**: opvangen waar mensen "Ik wil hier wandelen" klikten of die ze tipten, met het meest gevraagd bovenaan. Noem dat aantal in je eerste mail ("12 jongeren in jouw stad willen bij jullie wandelen").
- **Aanmeldlink per opvang:** `/shelter?claim=<id>` vult de gegevens uit de lijst al in. De link staat in Beheer bij elke tip.
- **Stap 5 in een kwartier:** met **Snel toevoegen met foto's** kiest de opvang één foto per hond. Elke foto wordt een concept, en heet de foto "Bram.jpg", dan staat de naam er al. CSV kan nog steeds.
- **Poster met QR-code** (dashboard → Poster): ophangen bij de ingang en in de wachtruimte. Bezoekers zien zo meteen de honden van de opvang.
- **Melding bij aansluiten:** wie op een opvang stemde, krijgt een melding zodra jij de opvang goedkeurt. Zo staan er bij de eerste groepswandeling al wandelaars klaar.

Staan de opvangfuncties nog niet live? Doe stap 4 tot en met 6 met de hand (de concierge-aanpak uit [`STRATEGY.md`](STRATEGY.md)).

**CSV-template** `web/public/rondje-honden-voorbeeld.csv`: één rij per hond, volgens de voorbeeldrij.
- `name`, `breed`, `sex`, `age_years`, `size`, `walk_minutes`, `traits`, `story`, `photo_url`: de basis.
- `energy` en `level` (starter of ervaren), zoals in de app.
- `treats` en `off_leash`: snoepjes geven en los laten lopen; bij opvanghonden standaard nee.
- `ppp`: Spanje. Bij ja alleen wandelaars met licentie.

**Weekritme (ongeveer 10 uur)**

| Dag | Wat | Tijd |
|---|---|---|
| Maandag | Lijst bijwerken, 8 tot 10 eerste mails | 2 u |
| Dinsdag | Nabellen en follow-ups | 1,5 u |
| Woensdag | Twee demo's | 1,5 u |
| Donderdag | Onboarding: verificatie, CSV, eerste wandeling plannen | 2 u |
| Vrijdag of zaterdag | Eerste groepswandeling: erbij (NL/BE) of op afstand (ES); content | 2,5 u |
| Zondag | KPI's bijwerken | 0,5 u |

Begin met Nederland en Vlaanderen: zelfde taal, en je kunt erheen. Spanje vanaf week 1 per mail en telefoon (Madrid, Barcelona, Málaga/Sevilla). Wallonië en Brussel vanaf week 3.

**KPI's**

| KPI | Definitie | Week 4 | Week 8 | Week 12 |
|---|---|---|---|---|
| Opvangen benaderd | Gemaild én gebeld | 30 | 60 | 90 |
| Demo's | Gehouden | 5 | 12 | 20 |
| Live opvangen | Geverifieerd, eerste wandeling gehouden | 1 | 4 | 7 |
| Honden op Rondje | Boekbaar | 10 | 50 | 120 |
| Groepswandelingen | Gehouden, opgeteld | 2 | 12 | 30 |
| Wandelaars per wandeling | Gemiddeld, maximaal 4 | 3 | 3,5 | 3,5 |
| Terugkerende wandelaars | Loopt binnen 30 dagen opnieuw | – | 40% | 50% |

Alle doelen zijn aannames; de lijst moet ervoor groeien, vooral in Spanje. Stuur bij in week 4:
- Minder dan 15% wil een demo: verbeter eerst de mail.
- Minder dan 30% van de demo's gaat live: los eerst het terugkerende bezwaar op (§6).
- Minder dan 3 wandelaars per wandeling: het probleem zit bij het werven van wandelaars.

## 4. Doorverwijzen

| Lus | Hoe |
|---|---|
| **Opvang → Rondje** | Opvangen verwijzen mensen op hun wachtlijst voor vrijwilligers naar Rondje, met een kant-en-klare tekst en een eigen uitnodigingscode (`/r/DOA`, aanmeldingen per code staan in Beheer). |
| **Rondje → opvang** | Geen hond in de buurt? Dan toont de app de dichtstbijzijnde partneropvang met groepswandelingen. |
| **Opvang → buren van adoptanten** | In het adoptiepakket zit een kaartje: "Kent u iemand in uw straat wiens hond vaker naar buiten wil?" (zie [`SUPPLY.md`](SUPPLY.md)). |
| **Eigenaar → eigenaar** | Tevreden eigenaren geven een kaartje "Breng je buur" met hun code door. |
| **Opvang → opvang** | Een tevreden opvang introduceert je bij twee collega's, of bij een koepel zoals de Dierenbescherming. |

Meet alleen totalen per code, geef geen geldbeloningen, en vraag pas om een doorverwijzing na een geslaagde eerste wandeling. Dat opvangen wachtlijsten hebben, is een aanname: vraag het in elke demo.

## 5. Templates

### Nederlands (Nederland en Vlaanderen)

In Vlaanderen schrijf je "vzw" en "gsm".

**Eerste mail**

> **Onderwerp:** Extra wandelingen voor uw honden, met jonge vrijwilligers (gratis)
>
> Beste [naam],
>
> Ik ben [je naam] van Rondje: een gratis platform dat jongvolwassenen van 18 jaar en ouder koppelt aan honden die een extra wandeling goed kunnen gebruiken. Ik zou graag samenwerken met [opvang].
>
> - U bepaalt welke honden meedoen en welke wandelaars komen.
> - Er wordt gewandeld in kleine groepen, altijd onder begeleiding, op momenten die u kiest.
> - Bij de eerste kennismaking controleert uw begeleider het ID. Tijdens de wandeling ziet de begeleider de route live.
> - Inschrijven, aanwezigheid en herinneringen regelt Rondje. Uw honden zet u er in één keer op met een spreadsheet, en ik help daarbij.
>
> Het is gratis. Heeft u 20 minuten voor een kort gesprek? Dan laat ik zien hoe het werkt, en hoor ik vooral graag wat wel en niet bij uw honden past.
>
> Met vriendelijke groet,
> [je naam], Rondje
> [telefoon] · [website]

**Follow-up (na 5 werkdagen)**

> **Onderwerp:** Re: Extra wandelingen voor uw honden
>
> Beste [naam],
>
> Vorige week mailde ik u over Rondje. Kort: het is gratis, u kiest de honden en de wandelaars, en elke wandeling is begeleid, met een ID-check bij het eerste bezoek.
>
> Past een gesprek van 20 minuten in de week van [datum]? Komt het niet uit, of kan ik beter iemand anders spreken? Laat het me gerust weten.
>
> Met vriendelijke groet,
> [je naam], Rondje

**Belscript (60 seconden)**

> "Goedemorgen, u spreekt met [je naam] van Rondje. Spreek ik met [naam], of met wie de vrijwilligers coördineert? Heeft u één minuut?
>
> Rondje is een gratis platform dat jongvolwassenen van 18 jaar en ouder koppelt aan honden die een extra wandeling kunnen gebruiken. Bij opvangen gaat dat in kleine groepen, altijd onder begeleiding, op momenten die u kiest. U bepaalt welke honden meedoen en wie er mag komen. Uw begeleider controleert bij het eerste bezoek het ID en ziet tijdens de wandeling de route live. Inschrijven en aanwezigheid regelen wij.
>
> Ik bel om te horen of dit bij [opvang] past. Heeft u twintig minuten voor een gesprek, bijvoorbeeld [dag] of [dag]?"
>
> - **"Stuur maar een mail."** Doe ik. Naar welk adres? Mag ik volgende week nabellen?
> - **"Nee, dank u."** Dank u voor uw tijd. Mag ik vragen waarom? Dan weet ik of het later wel past.

### Français (Wallonie et Bruxelles)

**Premier e-mail**

> **Objet :** Des promenades en plus pour vos chiens, avec de jeunes bénévoles (gratuit)
>
> Bonjour [naam],
>
> Je suis [je naam], de Rondje : une plateforme gratuite qui met en relation des jeunes de 18 ans et plus avec des chiens qui ont besoin d'une promenade en plus. J'aimerais beaucoup collaborer avec [refuge].
>
> - Vous choisissez les chiens qui participent et les promeneurs qui viennent.
> - Les promenades se font en petits groupes, toujours encadrés, aux moments que vous fixez.
> - Lors de la première rencontre, votre encadrant vérifie la pièce d'identité. Pendant la promenade, il voit l'itinéraire en direct.
> - Rondje gère les inscriptions, les présences et les rappels. Vous ajoutez tous vos chiens en une fois avec un tableur, et je vous aide volontiers.
>
> C'est gratuit. Auriez-vous 20 minutes pour un appel ? Je vous montre comment cela fonctionne et, surtout, j'aimerais savoir ce qui convient ou non à vos chiens.
>
> Bien cordialement,
> [je naam], Rondje
> [téléphone] · [site web]

**Relance (après 5 jours ouvrables)**

> **Objet :** Re : Des promenades en plus pour vos chiens
>
> Bonjour [naam],
>
> Je reviens vers vous au sujet de Rondje. En bref : c'est gratuit, vous choisissez les chiens et les promeneurs, et chaque promenade est encadrée, avec un contrôle d'identité à la première visite.
>
> Un appel de 20 minutes la semaine du [date] vous conviendrait-il ? Si ce n'est pas le moment, ou s'il vaut mieux que je contacte quelqu'un d'autre, dites-le-moi simplement.
>
> Bien cordialement,
> [je naam], Rondje

**Script d'appel (60 secondes)**

> « Bonjour, [je naam], de Rondje. Je parle bien à [naam], ou à la personne responsable des bénévoles ? Vous avez une minute ?
>
> Rondje est une plateforme gratuite qui met en relation des jeunes de 18 ans et plus avec des chiens qui ont besoin d'une promenade en plus. Avec les refuges, cela se fait en petits groupes, toujours encadrés, aux moments que vous choisissez. Vous décidez quels chiens participent et qui peut venir. Votre encadrant vérifie la pièce d'identité à la première visite et voit l'itinéraire en direct pendant la promenade. Nous gérons les inscriptions et les présences.
>
> Je vous appelle pour savoir si cela pourrait convenir à [refuge]. Auriez-vous 20 minutes pour en parler, par exemple [jour] ou [jour] ? »
>
> - **« Envoyez-moi un e-mail. »** Avec plaisir. À quelle adresse ? Je peux vous rappeler la semaine prochaine ?
> - **« Non, merci. »** Merci pour votre temps. Puis-je vous demander pourquoi ? Cela m'aide pour plus tard.

### Español (España)

"Vosotros" past bij protectoras. Bij een publiek centrum: "usted", en vraag naar de coördinator van het voluntariado.

**Primer correo**

> **Asunto:** Más paseos para vuestros perros, con voluntarios jóvenes (gratis)
>
> Hola, [naam]:
>
> Soy [je naam], de Rondje: una plataforma gratuita que pone en contacto a jóvenes mayores de 18 años con perros que necesitan un paseo más. Me encantaría colaborar con [protectora].
>
> - Vosotros decidís qué perros participan y qué voluntarios vienen.
> - Los paseos son en grupos pequeños, siempre supervisados, en los horarios que elijáis.
> - En el primer encuentro, vuestro responsable comprueba el DNI o NIE. Durante el paseo, ve la ruta en directo.
> - Los perros PPP solo los pasean voluntarios con licencia, o no participan. Lo decidís vosotros.
> - Rondje se encarga de las inscripciones, la asistencia y los recordatorios. Subís todos los perros a la vez con una hoja de cálculo, y os ayudo con ello.
>
> Es gratis. ¿Tendríais 20 minutos para una llamada? Os enseño cómo funciona y, sobre todo, quiero saber qué encaja y qué no con vuestros perros.
>
> Un saludo,
> [je naam], Rondje
> [teléfono] · [web]

**Seguimiento (a los 5 días laborables)**

> **Asunto:** Re: Más paseos para vuestros perros
>
> Hola, [naam]:
>
> La semana pasada os escribí sobre Rondje. En resumen: es gratis, vosotros decidís qué perros y qué voluntarios participan, y todos los paseos son supervisados, con comprobación del DNI o NIE en la primera visita.
>
> ¿Os vendría bien una llamada de 20 minutos la semana del [fecha]? Si no es buen momento, o si es mejor hablar con otra persona, decídmelo sin problema.
>
> Un saludo,
> [je naam], Rondje

**Guion de llamada (60 segundos)**

> «Hola, buenos días. Soy [je naam], de Rondje. ¿Hablo con [naam], o con quien coordina el voluntariado? ¿Tienes un minuto?
>
> Rondje es una plataforma gratuita que pone en contacto a jóvenes mayores de 18 años con perros que necesitan un paseo más. Con las protectoras funciona con paseos en grupos pequeños, siempre supervisados, en los horarios que elijáis. Vosotros decidís qué perros participan y quién viene. Vuestro responsable comprueba el DNI o NIE en la primera visita y ve la ruta en directo durante el paseo. Nosotros nos encargamos de las inscripciones y la asistencia.
>
> Te llamo para saber si podría encajar con [protectora]. ¿Tendrías 20 minutos para hablarlo, por ejemplo el [día] o el [día]?»
>
> - **«Mándame un correo.»** Perfecto. ¿A qué dirección? ¿Te llamo la semana que viene?
> - **«No, gracias.»** Gracias por tu tiempo. ¿Puedo preguntarte por qué? Así sé si podría encajar más adelante.

## 6. Risico's en bezwaren

| Bezwaar of risico | Antwoord en aanpak |
|---|---|
| **Aansprakelijkheid** | Wie een dier houdt, is in principe aansprakelijk voor schade: in Nederland art. 6:179 BW, in Spanje art. 1905 Código Civil, in België vergelijkbaar **[te verifiëren]**. Bij een groepswandeling blijft de opvang houder en loopt de wandelaar onder hun begeleiding. Leg dat vast in een korte samenwerkingsafspraak. Rondje neemt geen aansprakelijkheid over en zegt dat eerlijk; later misschien een collectieve dekking (zie [`PARTNERS.md`](PARTNERS.md)). |
| **Verzekering van vrijwilligers** | NL: veel gemeenten hebben een vrijwilligersverzekering (VNG). BE: organisaties met vrijwilligers moeten hun burgerlijke aansprakelijkheid verzekeren **[te verifiëren]**. ES: de Ley 45/2015 del Voluntariado vraagt een ongevallen- en aansprakelijkheidsverzekering **[te verifiëren]**. Vraag in de demo hoe hun polis vrijwilligers dekt; schrijf wandelaars zo nodig in als vrijwilliger van de opvang. |
| **Privacy** | Zo weinig mogelijk gegevens. Het ID wordt in persoon bekeken, zonder kopie: alleen "gecontroleerd door [opvang] op [datum]". De live route ziet alleen de begeleider, tijdens de wandeling (voorstel: daarna alleen afstand en duur bewaren). Per opvang een verwerkersovereenkomst (AVG/RGPD). |
| **"We hebben al vrijwilligers."** | Rondje vervangt ze niet. Gebruik het voor extra momenten of uw wachtlijst. U bepaalt hoeveel plekken openstaan. |
| **"Onze honden zijn moeilijk."** | U zet alleen honden op Rondje die passen. Nieuwe wandelaars lopen met starterhonden, ervaren-honden pas na uw goedkeuring. Moeilijke honden blijven bij uw eigen mensen. |
| **PPP-honden (Spanje)** | Wie een *perro potencialmente peligroso* uitlaat, heeft een gemeentelijke licentie nodig. In het openbaar gelden muilkorf en korte lijn, en maximaal één PPP-hond per persoon **[te verifiëren per regio; de regels zijn in beweging sinds Ley 7/2023]**. In Rondje: kolom `ppp`, standaard niet boekbaar, alleen voor wandelaars van wie de opvang de licentie in persoon zag. |
| **Begeleiderstijd** | Eén begeleider per groep kost tijd. Daarom vaste tijden, groepen van maximaal 4 en herinneringen tegen no-shows. Vaste wandelaars kunnen later zelf begeleider worden, als de opvang wil. |
| **Incident tijdens een wandeling** | De begeleider beslist en stopt de wandeling. Daarna een melding in de app, een evaluatie met de opvang, en zo nodig een ander niveau of een andere groep. |
