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
| 6 | **Geen chat en geen AI** | Chat vraagt moderatie. AI-chat over welzijn is riskant (onderzoek van de Autoriteit Persoonsgegevens, AI Act). |
| 7 | **Geen streaks of badges** | Rode lijn: geen verslavend ontwerp. Motivatie komt uit de vaste afspraak met de hond. |
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

## Wacht op jouw akkoord

Deze stappen heb ik voorbereid maar niet uitgevoerd:

- **Database claimen** binnen 72 uur na 2 oktober 2026, 01:28 UTC. Zie `LAUNCH.md` stap 1. **Dit is urgent.**
- **EU-database** en serverregio Frankfurt vóór echte gebruikers (kosten: Neon Launch op gebruik, of het gratis Neon-plan).
- **Google- en Apple-login**: sleutels aanmaken (Apple: Developer-account, $99 per jaar).
- **App Store en Play Store**: ontwikkelaarsaccounts en de inzending zelf (zie `LAUNCH.md`).
- **Domeinnaam** registreren, bijvoorbeeld rondje.app of rondjelopen.nl. Kost ongeveer €10–20 per jaar.
- **Partners en opvangen benaderen** met de concept-mails in `PARTNERS.md` en `OUTREACH.md`.
- **Video's posten** uit `GROWTH.md` op een eigen TikTok- of Instagram-account.
- **Een stichting oprichten.** Pas nodig bij de eerste fondsaanvraag. Kosten bij de notaris: ongeveer €300–600.
