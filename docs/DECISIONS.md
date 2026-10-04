# Aannames en keuzes

Wat er niet in de prompt stond, heb ik hier zelf aangenomen of besloten. Elke keuze kan later terug.

## Aannames over jou

De velden in `PROMPT.md` waren niet ingevuld, dus ik gebruik de voorbeeldwaarden:

| Onderwerp | Aanname |
|---|---|
| Vaardigheden | Beginnend developer, kan meelezen met React |
| Tijd | 10 uur per week |
| Budget | Maximaal €50 per maand |
| Locatie | Nederland, Nederlandstalig. Voorbeeldstad in het prototype: Utrecht. |
| Voor de camera | Liever niet, wel met stem of handen in beeld. Daarom werken de video-ideeën ook zonder gezicht. |

## Keuzes

| # | Keuze | Waarom |
|---|---|---|
| 1 | Het idee wordt **honden + jongeren**, uitgebreid met oudere eigenaren | Hoogste score (4,15 tegenover 2,30 en 2,25), zie `STRATEGY.md` |
| 2 | Naam: **Rondje** | Gewoon Nederlands ("even een rondje lopen"), kort, warm en niet klinisch. Domein en merk nog niet gecontroleerd: dat is een actie voor jou. |
| 3 | Wandelaars vanaf **18 jaar** | Alle vergelijkbare diensten werken met 18+ of met volwassen begeleiding. Onder de 18 verwijst de app door naar opvangen met jeugdplekken en naar de Kindertelefoon. |
| 4 | **Eerste keer altijd samen** met de eigenaar of de opvang | Zo doen BorrowMyDoggy en OOPOEH het ook. Dit verlaagt het risico voor beide kanten. |
| 5 | Check-ins blijven **alleen op het apparaat** | Stemming telt als gezondheidsgegeven. Zonder server is er geen datalek-risico, en een DPIA is pas nodig als data wél gedeeld wordt. |
| 6 | **Chat per aanvraag, geen AI** (eerst: geen chat) | Sinds oktober 2026 is er een chat per aanvraag, zodat niemand een telefoonnummer hoeft te delen vóór de kennismaking. Gaat een bericht over geld of staat er een link in, dan ziet de ontvanger een waarschuwing en kan die het melden. Beheer ziet alleen wie en hoe vaak, nooit de tekst. Chats gaan na een jaar weg. Geen AI-chat over welzijn (onderzoek van de Autoriteit Persoonsgegevens, AI Act). |
| 7 | **Levels en penningen, maar geen streaks** (eerst: geen badges) | Laurens vroeg in oktober 2026 om meer speelsheid, zoals bij Duolingo. De rode lijn blijft: geen verslavend ontwerp. Punten komen alleen uit echte dingen voor een hond, elk rondje telt even zwaar, er gaat nooit iets verloren, alleen jij ziet je niveau en penningen, ze geven geen voorrang en ja zeggen op een aanvraag levert nooit punten op. De uitdaging van de maand telt alleen rondjes, nooit wie ze liep. Regels in `web/src/lib/progress.ts`. |
| 8 | Prototype als **statische webapp** (React + Vite) | Gratis te hosten, werkt op elke telefoon, geen installatie nodig. Een PWA of native app kan later. |
| 9 | Voorbeeldhonden, -personen en -opvangen in het prototype zijn **verzonnen** | Geen echte personen of organisaties nadoen. |
| 10 | Het prototype is gepubliceerd als **privé-preview** (Claude Artifact) en niet op een publieke URL | Publiek online zetten op jouw naam vraagt jouw akkoord, zie hieronder. |
| 11 | Hulplijnen in de app: 113 (0800-0113), Kindertelefoon (0800-0432), MIND Hulplijn (0900-1450), In je bol, 112 | **Controleer de nummers voor de lancering.** De sites van MIND en In je bol konden niet worden geopend. MIND Korrelatie heet nu MIND Hulplijn, en het nummer is overgenomen uit eerdere bekende gegevens. |
| 12 | Opvanghonden zitten in het model als **begeleide wandelingen** | Nederlandse opvangen hebben minder honden dan gedacht, en die honden hebben vaak ervaren handen nodig. Vaste één-op-één koppels passen beter bij eigenaren in de buurt. |
| 13 | **Dagelijkse verbetercyclus** ingepland als Routine "Rondje verbetercyclus", elke dag om 07:54 (Nederlandse tijd) | De prompt vraagt om continu verbeteren. Elke cyclus test, verbetert 1–3 dingen, en publiceert alleen als alles groen is. Stoppen kan door te vragen "stop de verbetercyclus", of in de Routines-lijst op claude.ai. |
| 14 | Het platform is **één Next.js-webapp** (`web/`) die ook de iOS- en Android-app is (Capacitor-schil rond de live site) | Eén codebase: elke verbetering staat meteen in de website én de apps, zonder App Store-update. Het prototype in `app/` blijft als ontwerpreferentie. |
| 15 | **Neon Postgres** in productie, **PGlite** lokaal en in tests | Neon schaalt naar nul (bijna gratis bij weinig gebruik). PGlite is een echte Postgres zonder server, dus tests draaien op dezelfde SQL als productie. |
| 16 | Inloggen met **e-mail + wachtwoord en passkeys**; Google en Apple zodra de sleutels er zijn | Snel aanmelden zonder afhankelijkheid van derden. Passkeys zijn veiliger en sneller op telefoons. |
| 17 | **Vertrouwen per stap, technisch afgedwongen**: kennismaking → ID in het echt gezien → toestemming per hond → veiligheidsquiz → zelfstandig rondje | Eigenaren geven hun hond niet zomaar mee. Elke stap staat in de serverregels (`rules.ts`), niet alleen in de interface. |
| 18 | **Contactgegevens pas na acceptatie**; locatie afgerond op ~500 m; live locatie alleen tijdens een rondje; routes 30 dagen | Privacy by design (AVG), en het voorkomt dat het platform wordt gebruikt om mensen of honden te vinden. |
| 19 | **Anonieme feedback** die de ander nooit ziet; zorgelijke antwoorden (gewond, agressief, onveilig gevoeld) gaan naar moderatie | Eerlijke signalen zonder sociale druk of wraakreviews. Er is geen openbare sterrenscore. |
| 20 | **Geldberichten** (bedragen, IBAN, betaallinks) worden gemarkeerd en nagekeken | Rondje is gratis. Wie om geld vraagt, valt daardoor op. Dit is de belangrijkste fraudesignalering. |
| 21 | Opvanghonden **alleen in begeleide groepswandelingen**, met aanwezigheids- en ID-registratie door de opvang | Opvangen houden de regie. Zo kunnen veel honden tegelijk en veilig online. |
| 22 | De database werd tijdelijk via **neon.new** aangemaakt (VS), met serverfuncties in Cleveland | De Neon-integratie was via de API niet te gebruiken. Zo werkt de app direct. **Jij moet hem binnen 72 uur claimen**, en vóór de echte lancering naar een EU-database verhuizen (zie `LAUNCH.md`). |
| 23 | Talen: **Nederlands (bron), Engels, Spaans, Frans**; landen NL, BE en ES met eigen noodnummers, hulplijnen en regels (PPP-licentie in Spanje) | De eerste drie markten. Frans is nodig voor Wallonië en Brussel. |
| 24 | Opvangen voegen honden toe met **foto's eerst**: elke foto wordt meteen een concept, de naam komt uit de bestandsnaam als die er een is | Opvangen hebben veel honden en weinig tijd. Twintig honden online in een kwartier; niets gaat verloren bij slecht bereik. Concepten zijn alleen zichtbaar voor de opvang. |
| 25 | Een opvang heeft een **privé-contactpersoon** voor Rondje, apart van de openbare contactgegevens | Rondje moet een opvang kunnen bereiken zonder dat een medewerker privégegevens openbaar zet. |
| 26 | Naam, nummer en land van een **geverifieerde opvang** kan alleen beheer wijzigen | Die zijn met de hand gecontroleerd; anders kan een account na verificatie een andere organisatie worden. |
| 27 | **Tips gaan alleen over opvangen.** Over particulieren slaan we niets op: wie iemand met een hond kent, vraagt het zelf en stuurt zijn eigen uitnodigingslink | Gegevens over iemand die niets weet van Rondje (vaak een oudere, soms met gezondheidsinformatie) mogen we niet zomaar bewaren (AVG art. 14). Rondje benadert nooit zelf iemand. |
| 28 | **"Ik wil hier wandelen"**: stemmen op opvangen uit de lijst, max. 10 tips of stemmen per dag; stemmers krijgen een melding als de opvang aansluit | De vraag van wandelaars wordt zichtbaar, zodat je weet welke opvang je eerst benadert, en het sluit de cirkel voor wie stemde. |
| 29 | **Steun via Patreon aan Webstability**, alleen als `SUPPORT_URL` én `OPERATOR_NAME` zijn ingesteld; woorden "steun" en "bijdrage", niet "donatie" | Rondje is (nog) geen goed doel: een bijdrage is niet aftrekbaar. Wie geeft, moet weten aan wie. Steun geeft nooit voorrang of extra's. |
| 30 | **Geen geld in de apps**: geen kosten, geen steunknop, geen link | Apple (3.1.1/3.2.2) en Google Play staan externe betaallinks alleen toe voor erkende goede doelen. De apps herkennen we aan "RondjeApp" in de user agent. |
| 31 | **Deelkaarten na een wandeling** (zoals een Strava-plaatje) zijn bewust nog niet gebouwd | Ze zouden een route, plek of hond van iemand anders kunnen tonen. Eerst toestemming per eigenaar goed regelen; delen kan nu met de toestemmingsregels op Over ons. |
| 32 | Het **verhaal van Laurens** op Over ons is een sjabloon met schrijfvragen, verborgen tot hij het zelf publiceert | Een persoonlijk verhaal over somberheid schrijft niemand anders. De repository is openbaar, dus ook een concept staat niet online. |
| 33 | **Posters en flyers met QR-code**, met de eigen uitnodigingslink van wie print | Ouderen en opvangen bereik je beter op papier dan online. Via de code zie je in Beheer welke flyers werken. |
| 34 | Hondenpagina's van **particuliere eigenaren worden niet geïndexeerd** door zoekmachines | Een voornaam, een stad en een hond samen hoeven niet in Google. Opvangpagina's wel. |
| 35 | **Rol bij de start** (wandelaar, eigenaar, allebei of opvang) bepaalt de app: tabs, eerste stappen, tips en het Vandaag-scherm | Laurens wilde dat de app alles voorkauwt, zoals Headspace en Duolingo. Iemand met een hond hoeft geen hondenlijst te zien, een wandelaar geen "Mijn honden". Kiezen kan later opnieuw in je profiel. |
| 36 | **Vriendelijke herinneringen**: hooguit één per drie dagen, standaard aan, met één schakelaar uit | Terugkomen hoort bij een app die alles voorkauwt. Alleen over wat je zelf koos of begon (eerste stappen, weekdoel, de uitdaging in je stad, een hond die je kent), plus voor wandelaars een hond die net nieuw is binnen 5 km (elke hond één keer, hooguit één zo'n bericht per week, nooit van iemand die je blokkeerde). Nooit met schuldgevoel, en elke soort stopt vanzelf: drie stapherinneringen in de eerste weken, twee keer "zin in een rondje?" na een stille periode. Push als dat kan, anders e-mail als je e-mail aan hebt. Regels in `web/src/lib/nudges.ts`. |
| 37 | **Eigenaren zien hoeveel wandelaars er binnen 5 km wonen**, alleen als getal en pas vanaf drie | Een eigenaar die wacht op een eerste aanvraag wil weten of er iemand in de buurt is, zoals bij BorrowMyDoggy. Wie die wandelaars zijn blijft privé tot ze zelf een hond benaderen, en onder de drie wijst het getal te makkelijk naar één buur: dan krijgt de eigenaar een link om de buren over de hond te vertellen. Regels in `web/src/lib/nearby.ts`. |
| 38 | **Zonder verbinding toont Rondje een eigen scherm**, maar bewaart geen pagina's of gegevens op het toestel | Een kale browserfout ("Geen internet") voelt kapot, juist buiten op een wandeling. Het scherm zegt in je eigen taal wat er aan de hand is, gaat vanzelf verder zodra er weer verbinding is en heeft altijd "Noodgeval? Bel 112". Pagina's bewaren zou oude afspraken of berichten kunnen tonen, en op een gedeelde telefoon zie je dan andermans gegevens. Alles in `web/public/sw.js`. |

## Wacht op jouw akkoord

Deze stappen heb ik voorbereid maar niet uitgevoerd:

- **Database claimen** binnen 72 uur na 2 oktober 2026, 01:28 UTC. Zie `LAUNCH.md` stap 1. **Dit is urgent.**
- **EU-database** en serverregio Frankfurt vóór echte gebruikers (kosten: Neon Launch op gebruik, of het gratis Neon-plan).
- **Google- en Apple-login**: sleutels aanmaken (Apple: Developer-account, $99 per jaar).
- **App Store en Play Store**: ontwikkelaarsaccounts en de inzending zelf (zie `LAUNCH.md`).
- **Domeinnaam** registreren, bijvoorbeeld rondjelopen.nl (het .app-domein met de naam Rondje is al van een ander bedrijf). Kost ongeveer €10–20 per jaar. Zet daarna `CONTACT_EMAIL` op een adres van dat (of een ander eigen) domein.
- **Partners en opvangen benaderen** met de concept-mails in `PARTNERS.md` en `OUTREACH.md`.
- **Video's posten** uit `GROWTH.md` op een eigen TikTok- of Instagram-account.
- **Een stichting oprichten.** Pas nodig bij de eerste fondsaanvraag. Kosten bij de notaris: ongeveer €300–600.
- **Steun via Patreon aanzetten**: `SUPPORT_URL` en `OPERATOR_NAME` in Vercel, en eerst het Vercel-abonnement controleren (zie `LAUNCH.md` stap 3).
- **Instagram-account aanmaken** met het startpakket in `INSTAGRAM.md`. Ik maak geen accounts op jouw naam.
- **Je verhaal schrijven** voor Over ons (`web/content/about/nl/story.md`).
