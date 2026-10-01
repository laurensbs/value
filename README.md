# Rondje

Rondje koppelt jongvolwassenen (18–30) aan honden die een extra wandeling goed kunnen gebruiken. Het gaat vooral om honden van oudere of zieke buurtgenoten die zelf niet ver meer kunnen lopen, en daarnaast om honden uit de opvang. Gratis, veilig, en goed voor allebei.

**Prototype bekijken (privé):** https://claude.ai/artifact/V3UNzZhwMgq3rVwSJzZuFw

## Waarom dit idee

Drie ideeën zijn onderzocht en gescoord: honden + jongeren, een mentale-gezondheidsapp, en alles-in-één nieuws + aandelen. Rondje scoorde het hoogst (4,15 van 5):

- Het probleem is groot: 23% van de 16–25-jarigen is sterk eenzaam.
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

## Wat het prototype doet

1. **Honden in de buurt ontdekken**: met verhaal, energie, niveau en waarom een rondje telt.
2. **Kennismaking plannen**:
   - drie veiligheidsafspraken
   - vanaf 18 jaar
   - de eerste keer altijd samen met de eigenaar of de opvang
3. **Rondje lopen**:
   - een optionele check-in voor en na
   - kleine opdrachtjes om bewuster te wandelen
   - bij een lage stemming verwijst de app door naar hulp
4. **Mijn rondjes**: je maatjes, een logboek en wat het jou en de hond oplevert.
5. **Hulp en aanmelden**: 113, MIND Hulplijn, In je bol en Kindertelefoon altijd één tik weg, en een hond aanmelden, ook voor een ander.

Alle gegevens blijven in de browser. Er is geen server, geen account, geen tracking en geen AI-chat. Honden, mensen en opvangen in het prototype zijn verzonnen.

## Zelf draaien

Je hebt Node.js 20 of nieuwer nodig.

```bash
cd app
npm install
npm run dev          # ontwikkelserver op http://localhost:5173
npm test             # unit- en integratietests (Vitest)
npm run test:e2e     # browsertests op mobiel en desktop (Playwright)
npm run build        # productieversie in app/dist
npm run build:single # alles in één HTML-bestand voor de preview
npm run screens      # screenshots van alle schermen in licht en donker (preview-server moet draaien)
npm run assets       # app-iconen en linkvoorbeeld (og.png) opnieuw maken
```

Wordt Chromium niet gevonden bij de browsertests? Geef dan het pad mee met `PW_CHROMIUM_PATH=/pad/naar/chrome`.

## Online zetten (wacht op jouw akkoord)

De map `app/dist` is een statische site en draait gratis op Vercel, Netlify of Cloudflare Pages:

- **Vercel:** importeer de repo en kies `app` als *Root Directory*. Framework: Vite, build command `npm run build`, output `dist`.
- **Netlify:** base directory `app`, build command `npm run build`, publish directory `app/dist`.

Dat zet het prototype publiek online onder jouw account. Daarom is het niet automatisch gedaan, zie [`docs/DECISIONS.md`](docs/DECISIONS.md).

Heb je een eigen domein? Zet dan in `app/index.html` bij `og:image` de volledige URL van `og.png`, bijvoorbeeld `https://rondje.app/og.png`. Sommige apps tonen het linkvoorbeeld alleen met een volledige URL.

## Techniek

React 19, TypeScript, Vite, met gewone CSS en design tokens voor een lichte en een donkere modus. Lettertypes (Bricolage Grotesque, Figtree, Caveat) zitten in de bundle. De hondenillustraties zijn eigen SVG's.
