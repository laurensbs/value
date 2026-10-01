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
