# Strategie: Rondje

Fase 2 van [`PROMPT.md`](../PROMPT.md). Gebaseerd op [`RESEARCH.md`](RESEARCH.md).

## 1. Scoretabel

Score van 1 tot 5, met gewicht tussen haakjes.

| Criterium | Honden + jongeren | Mentale-gezondheidsapp | Nieuws + aandelen |
|---|---|---|---|
| Impact (30%) | **4**: jongeren, oudere eigenaren en honden hebben er alle drie baat bij; bewijs voor kortetermijneffect | 4: grote nood, maar losse apps hebben een klein effect | 3: echt probleem, onzeker effect |
| Unieke toevoeging (20%) | **5**: niemand in Nederland combineert dit gratis | 1: In je bol vult het gat met overheidsgeld | 2: alleen een smalle lokale variant is nog open |
| Samenwerking en inkomsten (15%) | **4**: OOPOEH-model, Eén tegen eenzaamheid, fondsen, dierenmerken | 2: geld gaat naar gevestigde stichtingen | 2: subsidie dekt hooguit de kosten |
| TikTok/Insta (15%) | **5**: honden + generaties + "eerste rondje" | 2: veel misinformatie, strenge regels | 1: Instagram straft aggregators |
| Haalbaarheid voor mij (10%) | **3**: tweezijdige markt, maar klein en handmatig te beginnen | 2: vraagt 24/7 moderatie | 3: de smalle versie is technisch goed te doen |
| Kosten en risico (10%) | **3**: veiligheid is goed te regelen, kosten laag | 1: crisis, AVG voor minderjarigen, AI-regels | 2: auteursrecht en licenties op beursdata |
| **Gewogen totaal** | **4,15** | 2,30 | 2,25 |

## 2. De keuze: Rondje

**Rondje koppelt mensen vanaf 18 jaar aan een hond die een extra wandeling goed kan gebruiken.** Het gaat vooral om honden van oudere of zieke buurtgenoten, en daarnaast om opvanghonden tijdens begeleide groepswandelingen. Het is gratis voor iedereen.

**Waarom de andere afvallen:**
- **Mentale-gezondheidsapp:** de belangrijkste lessen gaan wel mee in Rondje (doorverwijzen, geen AI-chat, privacy). Maar een losse app concurreert met In je bol en vraagt een organisatie met 24/7 moderatie.
- **Nieuws + aandelen:** Artifact faalde met een topteam. De alles-in-één-versie loopt vast op auteursrecht en beursdata, en groeit niet organisch op Instagram.

## 3. Pre-mortem

Stel: het is oktober 2027 en Rondje is mislukt. De meest waarschijnlijke oorzaken, en wat we daarom nu al aanpassen:

| Waarom het mislukte | Aanpassing in het model |
|---|---|
| **Te weinig honden.** Wandelaars meldden zich aan, maar ouderen van 80 installeren geen app. | Eigenaren hoeven de app niet zelf te gebruiken. Familie, buren of een welzijnsorganisatie kan iemand aanmelden met "Meld een hond aan, ook voor een ander". Werven gaat via partners: welzijnswerk, wijkteams, dierenartsen en ouderenbonden. |
| **Wandelaars haakten na 2–3 rondjes af.** Dat is het bekende probleem van welzijnsapps (3,3% na 30 dagen). | Geen losse wandelingen maar een **vast maatje**: dezelfde hond op een vast moment per week. De verplichting naar een hond die op je wacht is de motor. Geen streaks of druk, wel een zichtbaar effect: "Saar had 6 extra rondjes deze maand". |
| **Een incident** (hondenbeet, onveilige ontmoeting) en het vertrouwen was weg | Vanaf 18 jaar. Eerste kennismaking altijd samen met de eigenaar of de opvang. Drie afspraken vooraf. Honden ingedeeld op niveau. In de pilot een intakegesprek door de coördinator. WA-verzekering van de eigenaar, later collectief via een verzekeraar. |
| **Geen geld meer, en ik raakte uitgeput** | Start met één wijk en één partner. Meet impact vanaf de eerste week, want daardoor kreeg OOPOEH zijn financiering. Richt een stichting op zodra er een eerste fondsaanvraag is. |
| **Rondje werd verkocht als therapie** en verloor zijn geloofwaardigheid | Nooit therapie claimen. Altijd zichtbare hulp (113, Kindertelefoon, MIND Hulplijn, In je bol). Alle teksten volgen de richtlijnen van 113. |

## 4. Het model op één pagina

**Probleem en doelgroep**
- **Wandelaars:** iedereen vanaf 18 jaar, zonder bovengrens (besluit Laurens, 6 oktober 2026; eerst was dit 18–30). Studenten zijn een makkelijk begin, maar werkenden en gepensioneerden lopen net zo goed een vast rondje. Eenzaamheid speelt op elke leeftijd: bijna 10% van de Nederlanders van 15 jaar en ouder voelt zich sterk eenzaam, bij 16–25-jarigen is dat 23%, en 53% van de studenten heeft veel stress. Veel mensen willen naar buiten en houden van honden, maar kunnen er geen hebben.
- **Eigenaren:** ouderen of zieken die hun hond niet meer goed kunnen uitlaten, en vaak zelf ook eenzaam zijn. Daarnaast opvangen met honden die meer wandelingen nodig hebben.

**Bestaand landschap**
- BorrowMyDoggy is betaald en Brits.
- OOPOEH is alleen voor 55+.
- Pawshake en Rover zijn commercieel.
- **Wat Rondje toevoegt, in één zin:** een gratis, veilig vast rondje dat een wandelaar en een oudere buurtgenoot met elkaar verbindt via de hond.

**MVP (5 functies)**
1. **Honden in de buurt ontdekken**, met verhaal, energie, niveau en waarom een rondje telt.
2. **Kennismaking plannen** met veiligheidsafspraken (18+, eerste keer samen).
3. **Rondje lopen** met een optionele check-in voor en na (alleen op het apparaat) en kleine opdrachtjes om bewuster te wandelen.
4. **Mijn rondjes:** je vaste maatje, een logboek en wat het jou en de hond oplevert.
5. **Altijd hulp en aanmelden:** hulplijnen altijd één tik weg, en een hond aanmelden, ook voor een ander.

**Bewust níet in versie 1**
- Chat tussen gebruikers (vraagt moderatie) en AI-chat
- Een kaart met live locaties
- Streaks, badges en pushdruk
- Betalingen en reviews van mensen
- Een sociale feed
- Accounts met ID-check: in de pilot doet de coördinator dat via een intakegesprek

**Tech stack en kosten**
- **Prototype:** React + TypeScript + Vite, statisch en mobile-first. Gegevens alleen in de browser.
- **Pilot:** dezelfde frontend, aanmelden via een formulier, en handmatig koppelen door een coördinator (concierge-MVP). Daarna Supabase (EU-regio, gratis laag) voor accounts en matches.
- **Hosting:** Vercel, Netlify of Cloudflare Pages (gratis).
- **Kosten:** €0–15 per maand in de pilot, plus ongeveer €1 per maand voor een domein.

**Partners** (zie [`PARTNERS.md`](PARTNERS.md))

| Partner | Wat zij krijgen | Wat Rondje krijgt |
|---|---|---|
| 1. Welzijnsorganisatie / lokale coalitie Eén tegen eenzaamheid | Een nieuwe, laagdrempelige aanpak voor jong én oud | Toegang tot eigenaren, intake, geld voor de pilot |
| 2. Dierenopvang | Meer wandelingen, beter gedrag in de kennel, zichtbaarheid voor adoptie | Groepswandelingen, content |
| 3. Hogeschool of universiteit (studentenpsychologen, sociaal werk) | Onderzoeksdata, stageplekken | Effectmeting, toegang tot ZonMw |
| 4. Dierenwinkel of -voerfabrikant (bijv. het model Pets Place / Hondenbescherming) | Merkwaarde, goed verhaal | Rondje-pakket (poepzakjes, snoepjes), sponsoring |
| 5. Zorg- of dierenverzekeraar | Preventie, imago | Collectieve WA-dekking, fondsgeld (CZ Fonds, Zilveren Kruis Fonds) |

**Volgorde van benaderen:** 1 → 2 → 3 → 4 → 5. Eerst aanbod en vertrouwen, dan bewijs, dan geld.

**Inkomstenmodel**
- **Jaar 1:**
  - kleine fondsen en een gemeentelijke pilot (€5.000–20.000)
  - hulp in natura van een dierenwinkel
  - de kosten blijven onder €200 per jaar
- **Jaar 3:**
  - gemeenten betalen per stad voor lokale coördinatie, zoals bij OOPOEH
  - een meerjarige merkpartner
  - een verzekeraar betaalt de collectieve dekking
  - Oranje Fonds-cofinanciering (tot 50%) en ZonMw-onderzoek met de hogeschool

**Update oktober 2026:** het complete marketing- en verdienplan staat in [`MARKETING.md`](MARKETING.md). Nu al live: "Maak Rondje mogelijk" (`/support`), met steun via Patreon aan de exploitant zodra `SUPPORT_URL` en `OPERATOR_NAME` zijn ingesteld. Steun geeft geen voordelen, staat nooit in de apps, en is gescheiden van later fondsgeld via een stichting.

**Rode lijnen** (dit doe ik nooit voor geld)
- Geen advertenties in de app.
- Gegevens nooit verkopen of delen voor marketing.
- Check-ins en stemming gaan nooit naar een server zonder uitdrukkelijke toestemming.
- Geen betaalmuur voor wandelaars of eigenaren.
- Geen streaks, manipulatieve meldingen of verslavend ontwerp.
- Nooit claimen dat Rondje een behandeling is.
- Een sponsor bepaalt nooit welke honden of mensen zichtbaar zijn.
- Niemand in beeld zonder toestemming, en honden alleen met toestemming van de eigenaar.

**Impactmeting** (niet alleen downloads of views)
- **Hoofdmaatstaf:** het aantal rondjes per week van vaste koppels.
- **Vaste koppels na 8 weken:** het doel is minstens 50%.
- **Wandelaar:**
  - stemming voor en na (op het apparaat, alleen met toestemming gedeeld)
  - eens per maand eenzaamheid (korte De Jong Gierveld-schaal), stress (1 vraag) en minuten buiten per week
- **Eigenaar:** gevoel van ondersteuning en sociaal contact, via een maandelijks belletje van de coördinator.
- **Hond:** het aantal extra wandelingen. Bij opvangen ook gedrag in de kennel en tijd tot adoptie.

**De grootste onbekende**
- Komen er genoeg eigenaren, en blijven wandelaars na het derde rondje terugkomen?
- **Test in 4 weken voor €0** (concierge-pilot in één wijk):
  - een aanmeldformulier, flyers via een welzijnsorganisatie en 3 video's
  - doel: 10 wandelaars en 5 honden
  - koppels maak ik met de hand, contact via de coördinator
  - succes: na 4 weken lopen minstens 3 koppels nog wekelijks
- Pas daarna bouw je accounts en matching.

## 5. Plan voor de eerste 2 weken

**Week 1**
| Dag | Taak |
|---|---|
| 1 | Kies één stad en wijk (Utrecht en Groningen zijn goede studentensteden). Zet het prototype online. |
| 2 | Maak twee formulieren (wandelaar en eigenaar), bijvoorbeeld in Tally. Neem de drie veiligheidsafspraken op. |
| 3 | Bel de lokale welzijnsorganisatie of de coalitie Eén tegen eenzaamheid, en één dierenopvang. Gebruik de concept-mails uit `PARTNERS.md`. |
| 4 | Maak een flyer voor eigenaren: "Kan uw hond wel een extra rondje gebruiken?" Leg hem bij de dierenarts, de buurthuiskamer en de supermarkt. |
| 5 | Neem de eerste 2 video's op uit `GROWTH.md` (build in public). |
| 6–7 | Verspreid het formulier voor wandelaars via studentenverenigingen en Instagram. |

**Week 2**
| Dag | Taak |
|---|---|
| 8–9 | Voer intakegesprekken: 10 minuten bellen met elke eigenaar en elke wandelaar. |
| 10–12 | Plan de eerste kennismakingen, samen met de eigenaar. |
| 13 | Eerste rondjes, met toestemming in beeld. |
| 14 | Evaluatie: hoeveel koppels willen verder, en wat ging er mis? Werk `ITERATIONS.md` bij. |
