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
