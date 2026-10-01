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

## Wacht op jouw akkoord

Deze stappen heb ik voorbereid maar niet uitgevoerd:

- **Publiek online zetten** op een eigen domein of op Vercel onder jouw account (gratis). Zie `README.md`.
- **Domeinnaam** registreren, bijvoorbeeld rondje.app of rondjelopen.nl. Kost ongeveer €10–20 per jaar.
- **Partners benaderen** met de concept-mails in `PARTNERS.md`.
- **Video's posten** uit `GROWTH.md` op een eigen TikTok- of Instagram-account.
- **Een stichting oprichten.** Pas nodig bij de eerste fondsaanvraag. Kosten bij de notaris: ongeveer €300–600.
