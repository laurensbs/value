# Logboek van verbeteringen

Fase 4 van [`PROMPT.md`](../PROMPT.md). Elke cyclus gaat zo:
1. Beoordeel het prototype als een echte gebruiker.
2. Kies de 1–3 verbeteringen met de meeste impact.
3. Bouw, test en commit.
4. Log hier wat er veranderde.

Screenshots maak je met `npm run screens` (licht en donker, mobiel en desktop).

---

## Cyclus 0: eerste versie (1 oktober 2026)

**Gebouwd:**
- de vijf MVP-functies uit `STRATEGY.md`
- een eigen ontwerp: dashed-route-logo, hondenpenningen voor de cijfers en tennisbalgeel als markeerstift
- lichte en donkere modus
- 16 unit- en integratietests en 6 browsertests

**Eerste review met screenshots** (390×844 en 1440×900, licht en donker). Gevonden en opgelost:

| Probleem | Oplossing |
|---|---|
| De app scrolde als geheel en de tabbalk viel van het scherm | `#root` krijgt een vaste hoogte, en alleen het middengedeelte scrolt |
| Hondentegels waren grijs en modderig in de donkere modus | De tegel houdt de eigen tint van de hond (relatieve OKLCH-kleur) |
| Logo met geel op mintgroen in de donkere modus: te weinig contrast | Het logo houdt in beide modi het vaste merkgroen |
| De wandelmodus was fel mintgroen in de donkere modus | Eigen tokens voor de wandelmodus: diep bosgroen in het donker |
| "Begin leeg" brak af over twee regels | Niet laten afbreken |
| Het ervaringsniveau van honden (uit de strategie) zat niet in de interface | Label "Met ervaring" op de kaart, en "Niveau" bij de details |

**Resultaat:** gepubliceerd als privé-preview (versie 1).

**Volgende stap:**
1. Review als drie personen: een gestreste student, een twijfelende eigenaar en een opvangmedewerker.
2. Een vaste-maatje-flow na de kennismaking.
3. Toegankelijkheid controleren met toetsenbord en schermlezer.

---

## Cyclus 1: aanbod, veiligheid en herkenbare honden (1 oktober 2026)

**Review als drie gebruikers:**
- **Sanne (21, student, gestrest in de tentamenweek, komt binnen via een TikTok-video):**
  - Ze ziet direct honden, en dat is goed.
  - Ze ziet niet dat het gratis en veilig is, en ook niet hoe het werkt.
  - Afspraak 2 ("laat iemand weten waar je wandelt") moet ze zelf regelen.
- **De dochter van Ans (81), die haar moeder wil aanmelden:**
  - Aanmelden zat verstopt onderaan het tabblad Hulp.
  - Volgens de pre-mortem is te weinig aanbod het grootste risico, dus dit moet juist prominent.
- **Toetsenbord- en schermlezergebruiker:**
  - Als een hond of paneel openging, bleef de focus achter op de achtergrond.
  - Je kon met Tab achter het paneel terechtkomen.

**Verbeteringen:**

| # | Wat | Waarom |
|---|---|---|
| 1 | Blok "Zo werkt het" in drie stappen, met de stippellijn van de route als verbinding | Vertrouwen bij het eerste bezoek: kies, maak kennis samen met de eigenaar, vast rondje |
| 2 | Kaart "Ken je een hond die vaker naar buiten wil?" onder de honden, plus een apart aanmeldscherm (ook voor een ander, met telefoonnummer voor de intake) | Wandelaars werven zelf eigenaren: een groeilus voor het aanbod |
| 3 | Knop "Laat iemand weten dat je gaat" bij de start van een rondje: delen, met kopiëren als terugval | Maakt veiligheidsafspraak 2 één tik |
| 4 | Panelen maken de achtergrond `inert`. Focus gaat naar de titel en terug naar de knop waarmee je het paneel opende. | Toegankelijkheid |
| 5 | Nieuwe illustraties: kopvormen, vleermuisoren, bles, wenkbrauwen voor black-and-tan | Saar en Tess leken op elkaar, Bolle en Luna op katten |
| 6 | Hover-effecten alleen op apparaten met een muis | Op een touchscreen bleef een stemmingsknop "omhoog" hangen |

**Tests:** 20 unit- en integratietests (onder andere aanmelden, focus en `inert`, deelbericht) en 6 browsertests. Alles groen.

**Resultaat:** preview bijgewerkt naar versie 2.

**Volgende stap:**
- De vaste-maatje-flow: na de kennismaking direct een vast moment per week voorstellen.
- Een scherm "Voor organisaties" voor partners (welzijnswerk, opvang), voor de pitch.

---

## Cyclus 2: vaste maatjes en een pagina voor partners (1 oktober 2026)

**Review:**
- **Pre-mortem risico 2 (wandelaars haken af na 2–3 rondjes)** had nog geen antwoord in het product. Na een kennismaking stopte de flow gewoon.
- **Partners** (welzijnswerk, opvang, gemeente) zijn jouw echte volgende stap. Er was niets om hen te laten zien.

**Verbeteringen:**

| # | Wat | Waarom |
|---|---|---|
| 1 | Na een kennismaking vraagt de app: "Vaste maatjes worden?" Je kiest een vast moment per week. Het rondje blijft daarna ingepland ("Elke vrijdag 11:00") en heet "Vast rondje". | Gevoel van verplichting naar de hond is volgens onderzoek de motor van wandelen. Een vaste afspraak is het antwoord op het afhaakprobleem. |
| 2 | Pagina **Voor organisaties**, met: een pilot in 4 stappen, wat er gemeten wordt (met privacy), een voorbeeld van een wijkrapport (duidelijk gemarkeerd als geen echte cijfers), veiligheid, en een oproep voor een pilot | Pitch-materiaal voor welzijnswerk, opvangen en gemeenten. Ook bereikbaar via "Bekijk hoe een pilot werkt" in het desktoppaneel. |
| 3 | Desktoppaneel compacter op lage schermen | Op 1440×900 viel de onderkant weg |

**Tests:** 24 unit- en integratietests (nieuw: vaste maatjes, `weeklyLabel`, organisatiepagina) en 6 browsertests. Alles groen.

**Resultaat:** preview bijgewerkt naar versie 3.

**Volgende stap:**
- Een "bijna-tijd"-scherm voor het vaste rondje: herinnering en weer.
- Een opvang-variant van de kennismaking: groepswandeling met begeleider en een tijdslot per groep.
- Een lege staat zonder voorbeelddata nalopen met nieuwe gebruikers.

---

## Cyclus 3: groepswandelingen bij de opvang en klaar om te delen (1 oktober 2026)

**Review:**
- **Opvanghonden** gebruikten dezelfde één-op-één-kennismaking als honden uit de buurt. Volgens het onderzoek hebben opvanghonden vaak ervaren handen nodig. Opvangen werken daarom met begeleide groepen (zoals het boekmodel van Animal Trust).
- **Een gedeelde link** zag er kaal uit: geen linkvoorbeeld, geen app-icoon, en niet te installeren.

**Verbeteringen:**

| # | Wat | Waarom |
|---|---|---|
| 1 | Opvanghonden zijn altijd een **groepswandeling**: maximaal 4 wandelaars en een begeleider, met het aantal vrije plekken per moment ("Morgen 13:00 · nog 1 plek") | Past bij hoe opvangen werken, en verlaagt het risico |
| 2 | Duidelijkere soorten wandelingen in Rondjes: kennismaking, rondje, vast rondje, (vaste) groepswandeling | Je ziet meteen wat je gaat doen en waar je verzamelt |
| 3 | Een schermlezer las "13:00· nog 1 plek" voor, zonder spatie | Scheidingsteken buiten het opgemaakte deel gezet |
| 4 | **Linkvoorbeeld** (`og.png`, 1200×630) met de honden en de kernboodschap, plus Open Graph-tags | Een gedeelde link in WhatsApp of Instagram ziet er nu verzorgd uit |
| 5 | **App-iconen** en een **manifest**: je kunt Rondje op je beginscherm zetten | Voelt als een echte app |
| 6 | Eén merkteken overal: een stippellijn-route met een wandelaar | Het vorige icoon leek op een laadspinner |

`npm run assets` maakt de iconen en het linkvoorbeeld opnieuw, met dezelfde hondentekeningen als de app.

**Tests:** 25 unit- en integratietests (nieuw: groepswandelingen met plekken) en 6 browsertests. Alles groen.

**Resultaat:** preview bijgewerkt naar versie 4.

**Volgende stap:**
- Lettertypes beperken tot de Latijnse tekenset, zodat de app sneller laadt.
- Lege staat en eerste gebruik nalopen zonder voorbeelddata.
- Teksten laten nalezen door iemand van 113 of MIND, voordat er echte gebruikers komen.

---

## Cyclus 4: sneller laden op mobiel (2 oktober 2026)

**Review:**
- De bundel bevatte lettertypes voor Vietnamees en Latin Extended, en van Caveat ook een extra WOFF-kopie.
- Nederlands gebruikt alleen de Latijnse tekenset (é, ë, ï, ’ inbegrepen).

**Verbetering:**
- Eigen `@font-face`-regels met alleen de Latijnse WOFF2-bestanden (`src/fonts.css`).
- De preview ging van 574 KB naar 442 KB (−23%).
- Gecontroleerd dat alle drie de lettertypes nog laden.

**Tests:** 25 unit- en integratietests en 6 browsertests. Alles groen.

**Resultaat:** preview bijgewerkt naar versie 5.

**Volgende stap:**
- Lege staat en eerste gebruik nalopen zonder voorbeelddata.
- Teksten laten nalezen door iemand van 113 of MIND, voordat er echte gebruikers komen.
- Een herinnering voor het vaste rondje: in de pilot via sms of WhatsApp door de coördinator, niet via pushmeldingen.

## Cyclus 5: van prototype naar echt platform (2 oktober 2026)

**Gebouwd** in `web/`. Het is één app voor website, iPhone en Android:
- Aanmelden met e-mail of passkey, en uitnodigingslinks.
- Profiel met foto en een check of je 18 bent.
- Honden aanmelden met foto's, vaste momenten, koekjes ja/nee en wat de eigenaar meegeeft.
- Aanvragen met contactgegevens pas na acceptatie.
- ID-check en toestemming per hond.
- Live wandelen met GPS, SOS en kaart.
- Meekijken voor de eigenaar.
- Anonieme feedback.
- Voor opvangen: CSV-import, groepswandelingen en aanwezigheid.
- Beheer, juridische teksten en vertalingen in 4 talen.

**Online:**
- https://rondje-five.vercel.app, met een Neon-database en foto-opslag in Vercel Blob.
- De volledige wandelflow is getest op de live site: aanmelden, hond toevoegen, aanvraag, accepteren, GPS-route, meekijken, feedback en quiz. Daarna zijn de testgegevens verwijderd.

**Review:** schermafdrukken van alle schermen in licht en donker op mobiel. Verbeterd:
- Tijdens een rondje verdwijnt de navigatiebalk. Wegtikken zou de GPS stoppen.
- De hulp- en eindknop blijven binnen duimbereik.
- Op elke andere pagina staat een balk "je rondje loopt nog".
- De hulpknop bleef op telefoons onzichtbaar; nu is het een icoon.
- De taalkeuze was afgekapt.
- Meervoud bij minuten, de opmaak van maandnamen, en lange SOS-knoppen.

**Gevonden bugs:**
- Na het accepteren van een aanvraag sprong de pagina naar het verkeerde tabblad.
- In ontwikkelmodus tekende de kaart de route op een oude kaart. React mount de kaart twee keer; de lagen worden nu opnieuw aangemaakt.
- Formulieren werden leeggemaakt na een foutmelding. React reset formulieren standaard; dat is nu omzeild.
- Zonder database onthoudt elke serverfunctie zijn eigen tijdelijke data, dus inloggen werkte op Vercel niet betrouwbaar. Opgelost door de database te koppelen.

**Tests:**
- 34 unit-tests.
- 2 end-to-endtests: eigenaar en wandelaar, en opvang met beheer. Ze draaien lokaal en tegen een productie-build.
- De wandelflow is ook getest tegen de live site.
- GitHub Actions staat klaar. Het eerste CI-werk startte niet op het account, waarschijnlijk door een instelling bij GitHub Billing.

**Volgende stap:**
- Database claimen en naar de EU verhuizen.
- Pushmeldingen voor nieuwe aanvragen en rondjes die uitlopen.
- Locatie op de achtergrond in de iOS-app.
- Een tegelserver met eigen sleutel voor de kaart, voordat het druk wordt.


## Cyclus 6: opvangen, tips, steun en drukwerk (2 oktober 2026)

**Gevraagd:** een opvang-aanmeldpagina met alles erachter, zo snel mogelijk veel honden erop, doorverwijzen, steun via Patreon, een Over ons-pagina, Instagram en een marketingplan.

**Gebouwd:**
- **Opvang-aanmelding in drie delen.**
  - De opvang: aantal honden, logo, Instagram en beschrijving.
  - Wandelen bij jullie: wandeltijden, "Zelf koekjes mee?", wat wandelaars meekrijgen en de standaardduur.
  - Contact: openbaar, plus een privé-contactpersoon voor Rondje.
  - Gegevens aanpassen kan later op een eigen pagina.
- **Snel toevoegen met foto's.** Kies een stapel foto's: elke foto wordt meteen een concepthond, en de naam komt uit de bestandsnaam ("Bram.jpg"). Vul per kaart het belangrijkste in en zet alles in één keer online.
- **Dashboard** met een checklist, "x van ongeveer N honden online" en eerlijke labels: "zichtbaar na controle" zolang een opvang niet gecontroleerd is.
- **Tips en stemmen.** Je kunt een opvang tippen (`/suggest`) of "Ik wil hier wandelen" aanklikken (`/shelters`). Beheer ziet het meest gevraagd bovenaan, en wie stemde krijgt een melding als de opvang aansluit. Over particulieren slaan we niets op.
- **Maak Rondje mogelijk** (`/support`): de belofte, een kostentabel, de steunknop (pas na instellen) en een FAQ. In de apps staat nergens iets over geld.
- **Over ons** (`/about`) en een footer met de belangrijkste links. Het persoonlijke verhaal is een sjabloon dat verborgen blijft tot Laurens het publiceert.
- **Poster voor opvangen en een flyer voor de buurt**, met een QR-code (met de eigen uitnodigingslink).
- **Beheer:**
  - een melding bij elke nieuwe opvang
  - een link naar KvK of KBO
  - een check of het e-maildomein bij de website hoort
  - aanmeldingen per uitnodigingscode
- **Zoekmachines:** `robots.txt`, een sitemap en korte links (`/over-ons`, `/steun`, `/tip`).

**Gevonden en opgelost:**
- **Privacylek:** een hond die een opvang via het gewone formulier toevoegde, kreeg de woonlocatie van de medewerker op de kaart. Opvanghonden staan nu altijd op de plek van de opvang; bestaande honden zijn verplaatst.
- Een eigenaar kon een hond die Rondje had verborgen, zelf weer online zetten.
- Honden- en profielfoto's moesten van onze eigen upload komen, maar dat werd niet gecontroleerd. Een verwijderde profielfoto kwam terug.
- Hondenpagina's van particulieren (voornaam en stad) konden in Google komen.
- **In de tests:**
  - het inloggen van de beheerder wachtte op de verkeerde pagina;
  - aanmelden in productie is beperkt tot 3 keer per 10 seconden per IP, dus elke testpersoon krijgt nu een eigen test-IP.

**Tests:** 72 unit-tests en 5 end-to-endtests (wandelflow, opvang met foto's, tips, steun en Over ons, en geen geld in de app), op een productie-build. De live site is gecontroleerd: alle pagina's werken en de app ziet geen geld.

**Volgende stap:**
- De database claimen en naar de EU verhuizen.
- De Patreon-link en de ontvanger instellen in Vercel.
- Opvangen benaderen volgens `MARKETING.md`.
- Pushmeldingen.


## Cyclus 7: elke dag een betere ronde, op telefoon en desktop (2 en 3 oktober 2026)

**Gevraagd:** blijf jezelf de juiste vragen stellen om Rondje op mobiel en desktop te perfectioneren, kijk wat marktleiders doen (alles begeleid, zoals Duolingo en Headspace) en let op beveiliging en snelheid.

**Gebouwd:**
- **Meldingen op het juiste moment.** Vandaag vraagt één keer "Zal ik je een seintje geven?", en op de iPhone eerst hoe je Rondje op je beginscherm zet. "Later" houdt de vraag twee weken weg.
- **Afspraken.** Elke afspraak en groepswandeling heeft "Zet in je agenda" (een vaste week-wandeling blijft op Nederlandse tijd staan), en de ochtend ervoor komt een herinnering: "Morgen om 10:00: kennismaken met Bello."
- **Chat en kennismaken:** kant-en-klare berichten, een checklist voor de eerste kennismaking en een aanvraag in een paar tikken.
- **Een hond toevoegen, één vraag tegelijk,** met eigenschappen en zinnen om aan te tikken. "Over jou" werkt net zo.
- **Je hond delen met de buren:** een bericht, een poster met QR-code, en hoeveel wandelaars er binnen 5 km wonen. Dat aantal staat er pas vanaf 3, zodat het nooit naar één buur wijst.
- **Nieuwe honden in de buurt:** een wandelaar hoort hooguit één keer per week over een nieuwe hond, en nieuwe honden hebben een week lang een "Nieuw"-sticker.
- **Zonder verbinding** toont Rondje een eigen pagina met "Noodgeval? Bel 112". Er worden geen pagina's of gegevens bewaard.
- **Beveiliging:** een Content Security Policy met een nieuwe nonce per pagina, inloglinks die niet naar een andere site kunnen, na een blokkade geen telefoon, e-mail of ontmoetplek meer zichtbaar, geblokkeerde accounts nergens meer binnen (ook niet in de app), en beheerrechten via een e-mailadres tellen pas als dat adres bevestigd is (zodra e-mail aan staat).
- **Snelheid:** de meeste pagina's antwoorden ongeveer twee keer zo snel, en lettertypen laden zonder dat de tekst verspringt.
- **Toegankelijkheid:** gegroepeerde kaartmarkers, voortgangsbalken met een naam, genoeg contrast in licht en donker, en elke pagina past op een telefoon van 320 px breed in alle vier de talen. In het Frans blijven vraagtekens en dubbele punten bij hun woord.
- **Beheer** is op de telefoon te vinden via een rij op Profiel, en toont of e-mail werkt en in welke regio de server draait.

**Gevonden en opgelost:**
- Na het aanmelden ontbrak de tabbalk tot je de pagina herlaadde.
- Een tik op het wandelverslag zonder bereik leek opgeslagen, en twee snelle tikken konden elkaar ongedaan maken. Nu ziet de wandelaar precies wat de eigenaar ziet.
- Als de klok werd verzet, schoof een vaste wekelijkse wandeling in je agenda een uur op.
- Het chatvak zat achter de zwevende tabbalk.
- Op een smalle telefoon duwde de kop in het Spaans en Frans de inlogknop van het scherm, en een stap in het welkomstgedeelte maakte de pagina even breder.
- Oranje waarschuwingstekst had net te weinig contrast (4,49 : 1).
- Op Vandaag lekten stijlen van de nieuwe startpagina door: de kaart met eerste stappen had geen marge meer, en de tip van de dag stond in donkere letters op donkergroen (2 : 1, bijna onleesbaar). Axe zag dat niet, omdat het contrast op een kleurverloop niet meet.

**Tests:** 293 unit-tests, 15 end-to-endtests op een telefoon en 13 op desktop, een toegankelijkheidsaudit met axe (licht en donker) zonder fouten op 64 pagina's, geen verspringende lay-out op 12 pagina's, en `next build`.

**Volgende stap:**
- De live site nalopen vanaf de Mac (de cloud kan rondje-five.vercel.app niet openen).
- E-mail instellen en daarna het beheeradres één keer bevestigen op `/admin`.
- Op `/admin` kijken of de serverregio bij de regio van de database past.
- Opgeslagen honden en aanbevelingen. Daarvoor is een databasewijziging nodig, en daar beslist Laurens eerst over.
- De database claimen en naar de EU verhuizen blijft bij Laurens.
