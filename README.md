# Rondje

Rondje koppelt mensen vanaf 18 jaar aan honden die een extra wandeling goed kunnen gebruiken. Het gaat vooral om honden van oudere of zieke buurtgenoten die zelf niet ver meer kunnen lopen, en daarnaast om honden uit de opvang. Wandelen kan iedereen vanaf 18, zonder bovengrens: student, werkende of gepensioneerde. Gratis, veilig, en goed voor allebei.

**Live (website en app):** https://rondjemee.nl · **Zo start je:** [`docs/LAUNCH.md`](docs/LAUNCH.md)

Eerste prototype (privé): https://claude.ai/artifact/V3UNzZhwMgq3rVwSJzZuFw

## Waarom dit idee

Drie ideeën zijn onderzocht en gescoord: honden + jongeren, een mentale-gezondheidsapp, en alles-in-één nieuws + aandelen. Rondje scoorde het hoogst (4,15 van 5):

- Het probleem is groot: bijna 10% van de Nederlanders van 15 jaar en ouder voelt zich sterk eenzaam, en bij 16–25-jarigen is dat 23%.
- Er is geen directe concurrent in Nederland.
- Er bestaat een bewezen financieringsmodel (OOPOEH).
- Het is de beste content voor TikTok en Instagram.

| Document | Inhoud |
|---|---|
| [`PROMPT.md`](PROMPT.md) | De opdracht |
| [`docs/RESEARCH.md`](docs/RESEARCH.md) | Onderzoek met bronnen, per idee in `docs/research/` |
| [`docs/STRATEGY.md`](docs/STRATEGY.md) | Scoretabel, keuze, pre-mortem, het model op één pagina en het plan voor de eerste 2 weken |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Aannames, keuzes, en wat nog op jouw akkoord wacht |
| [`docs/ITERATIONS.md`](docs/ITERATIONS.md) | Logboek van verbeteringen aan het prototype |
| [`docs/GROWTH.md`](docs/GROWTH.md) | Video-ideeën voor TikTok en Instagram die niet als reclame voelen |
| [`docs/PARTNERS.md`](docs/PARTNERS.md) | Partners en concept-mails |
| [`docs/LAUNCH.md`](docs/LAUNCH.md) | **Zo start je**: database claimen, beheerder worden, EU-database, Google/Apple-login, iOS en Android bouwen |
| [`docs/OUTREACH.md`](docs/OUTREACH.md) en [`docs/SUPPLY.md`](docs/SUPPLY.md) | Opvangen en eigenaren werven: aanpak, mails in drie talen, plan voor 30 dagen |
| [`ios/README.md`](ios/README.md) | **De native iPhone-app** (SwiftUI): wat hij doet, veiligheid, zelf bouwen |
| [`docs/MARKETING.md`](docs/MARKETING.md) | Het marketingplan: positionering, aanbod eerst, kanalen, lanceervolgorde per land, geld zonder de rode lijnen te breken, KPI's en 90 dagen |
| [`docs/INSTAGRAM.md`](docs/INSTAGRAM.md) | Startpakket voor Instagram: naam, bio's in vier talen, de eerste 9 posts, Reels, stories, toestemming en DM-sjablonen |
| [`docs/legal/REVIEW.md`](docs/legal/REVIEW.md) | Checklist voor de jurist per land; de juridische teksten zelf staan in `web/content/legal/` |

## Wat het platform doet (`web/`)

Eén app voor website, iPhone en Android (Next.js met een Capacitor-schil), in het Nederlands, Engels, Spaans en Frans, voor Nederland, België en Spanje.

1. **Snel aanmelden**: e-mail of passkey (Face ID of vingerafdruk). Google en Apple werken zodra de sleutels er zijn. Uitnodigingslinks laten zien wie meedeed via jou.
2. **Vertrouwen opbouwen**:
   - een profiel met foto en verhaal
   - alleen 18+, en anderen zien alleen je leeftijdsgroep
   - kenmerken die je verdient: ID gezien, quiz gehaald, aantal rondjes
3. **Honden aanmelden**, ook voor een buurvrouw of opa:
   - foto's, karakter en vaste momenten
   - koekjes ja, nee of alleen die van de eigenaar
   - wat de eigenaar meegeeft (zakjes, riem, water)
   - een privé afspreekplek en de dierenarts
   - een eerlijke vraag naar bijtgeschiedenis
4. **Stap voor stap vertrouwen**:
   1. eerst een kennismaking met de eigenaar erbij
   2. de eigenaar ziet het ID in het echt (Rondje bewaart geen kopie)
   3. de eigenaar geeft per hond toestemming voor zelfstandige rondjes
   4. de wandelaar haalt de veiligheidsquiz

   Contactgegevens zie je pas na acceptatie.
5. **Live wandelen**:
   - GPS-route op de kaart, waar de eigenaar live kan meekijken
   - een melding als het rondje uitloopt
   - een SOS-scherm met 112, de eigenaar, de dierenarts en wat te doen bij weglopen of een beet
6. **Na afloop**: privé-feedback die de ander nooit ziet. Zorgelijke antwoorden gaan naar moderatie. De stemmingscheck blijft op je telefoon.
7. **Opvangen**:
   - aanmelden en verificatie
   - alle honden in één keer importeren uit Excel/CSV
   - groepswandelingen met maximaal aantal plekken, aanwezigheid en ID-check
   - medewerkers toevoegen
   - een lijst van 39 opvangen in NL, BE en ES om te benaderen
8. **Veiligheid en beheer**:
   - melden en blokkeren
   - berichten over geld of IBAN worden gemarkeerd
   - accounts blokkeren met reden (DSA)
   - opvangen verifiëren
   - voorbeelddata verwijderen
   - gegevens downloaden of je account verwijderen (AVG)
   - routes na 30 dagen automatisch weg
9. **Juridisch**: voorwaarden (Rondje is tussenpersoon en geen partij bij de afspraak), privacy, gedragscode, veiligheidsbeleid, partnervoorwaarden voor opvangen en cookies, in 4 talen. Een jurist moet ze nog nakijken.

### Zelf draaien

```bash
cd web
npm install
npm run dev        # http://localhost:3000, met een ingebouwde database (geen server nodig)
npm test           # unit-tests
npm run test:e2e   # end-to-end: eigenaar + wandelaar, en opvang + beheer
```

Meer: [`web/README.md`](web/README.md).

## Het eerste prototype (`app/`)

Het prototype was een statische app zonder server. Het blijft staan als ontwerpreferentie. Je draait het met `cd app && npm install && npm run dev`.
