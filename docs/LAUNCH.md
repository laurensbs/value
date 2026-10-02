# Zo start je met Rondje

De website en de app zijn één en dezelfde: **https://rondje-five.vercel.app**. Op een telefoon kun je hem via "Zet op beginscherm" als app gebruiken. De iOS- en Android-apps (map `web/ios` en `web/android`) laden dezelfde site in een eigen app-schil.

## Wat er al staat

| Onderdeel | Status |
|---|---|
| Vercel-project `rondje`, gekoppeld aan GitHub | Elke push naar de hoofdbranch zet automatisch een nieuwe versie online. |
| Database (Neon Postgres) | Gekoppeld via `DATABASE_URL`. Tijdelijk: zie hieronder, **claimen binnen 72 uur**. |
| Foto-opslag (Vercel Blob, `rondje-photos`) | Gekoppeld. |
| Inloggen | E-mail + wachtwoord en passkeys (Face ID, vingerafdruk) werken. Google en Apple staan klaar, maar hebben jouw sleutels nodig. |
| Beheer | Jouw e-mailadres staat in `ADMIN_EMAILS`. Maak een account met dat adres; dan zie je **Beheer** (`/admin`). |
| Dagelijkse opschoning (Vercel Cron, 03:15 UTC) | Routes ouder dan 30 dagen weg, oude aanvragen verlopen, vergeten rondjes worden afgesloten. |
| Talen | Nederlands, Engels, Spaans, Frans. De browser of de taalkeuze bepaalt welke. |

## 1. Eerst doen: database claimen (vóór zondag 5 oktober 2026, 03:28 Nederlandse tijd)

De database is aangemaakt via neon.new: een gratis Neon-database die na 72 uur wordt gewist, tenzij iemand hem claimt.

1. Open de claim-link. Die staat in het eindbericht van Claude en in Vercel bij de omgevingsvariabele `DATABASE_URL` (in het veld "comment").
2. Log in of maak een gratis Neon-account en bevestig.
3. Klaar. Hij valt dan onder het gratis Neon-abonnement en de app blijft gewoon werken.

> Deel de claim-link met niemand en zet hem niet in de (openbare) repository: wie hem opent, kan de database overnemen.

## 2. Jezelf beheerder maken

1. Ga naar https://rondje-five.vercel.app/signup en maak een account met het e-mailadres dat in `ADMIN_EMAILS` staat.
2. Vul je profiel in. Je ziet nu **Beheer** in het menu.
3. Bij **Beheer → Instellingen** zie je wat gekoppeld is.
4. Zodra er echte honden zijn: **Beheer → Voorbeelddata → Verwijder voorbeelddata**. De voorbeeldhonden zijn gemarkeerd en kunnen niet geboekt worden.

## 3. Vóór de echte lancering

### Database in de EU

De huidige database staat in de VS (Ohio). Daarom draaien de serverfuncties nu ook in de VS (Cleveland), zodat de site snel blijft. Voor echte gebruikers in Nederland, België en Spanje hoort alles in de EU te staan: er worden locaties en gegevens van ouderen verwerkt.

1. Vercel → project **rondje** → **Settings → Environment Variables**: verwijder `DATABASE_URL`.
2. **Storage → Create Database → Neon**, regio **Frankfurt (eu-central-1)**, en koppel hem aan het project. Vercel zet `DATABASE_URL` dan zelf.
   - Je bestaande Neon-koppeling in Vercel staat op het Launch-abonnement en wordt afgerekend op gebruik: ongeveer $0,11 per rekenuur en $0,35 per GB per maand. Hij schaalt naar nul als niemand de site gebruikt, dus voor een kleine start is dat een paar euro per maand.
   - Gratis kan ook: maak de database direct op neon.com (Free plan, regio Frankfurt) en zet de verbindings-URL zelf als `DATABASE_URL`.
3. **Settings → Functions → Function Region**: kies **Frankfurt (fra1)**.
4. **Deployments → Redeploy**. De app maakt de tabellen bij het eerste bezoek zelf aan.

Wil je de testgegevens meenemen? Vraag het Claude: dat is een `pg_dump` van de oude naar de nieuwe database.

### Juridisch en organisatie

- Lees [`docs/legal/REVIEW.md`](legal/REVIEW.md): de checklist voor de jurist, per land en op prioriteit.
- Richt eerst de rechtsvorm op (stichting of bv). Handelen namens een organisatie die nog niet bestaat, kan jou persoonlijk aansprakelijk maken.
- Regel een collectieve aansprakelijkheids- en ongevallenverzekering voor wandelaars (zie REVIEW.md, risico 1).
- Vul in de voorwaarden de plekken met `[bedrag]`, `[te controleren]` en `[voorstel]` in.

### Opvangen benaderen

[`docs/OUTREACH.md`](OUTREACH.md) bevat de aanpak, mails in het Nederlands, Frans en Spaans, en een lijst met 39 opvangen (ook zichtbaar op `/shelters`). Opvangen melden zich aan via `/shelter`. Jij keurt ze goed bij **Beheer → Opvangen om te controleren**. Ze importeren hun honden met het voorbeeldbestand `web/public/rondje-honden-voorbeeld.csv`.

## 4. Inloggen met Google en Apple (optioneel)

Zonder deze sleutels zie je de knoppen gewoon niet; e-mail en passkeys werken altijd.

**Google**

1. Ga naar Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** (type Web application).
2. Authorized redirect URI: `https://rondje-five.vercel.app/api/auth/callback/google`
3. Zet in Vercel `GOOGLE_CLIENT_ID` en `GOOGLE_CLIENT_SECRET` (Production) en redeploy.

**Apple** (vereist een Apple Developer-account, $99 per jaar)

1. Ga naar Certificates, Identifiers & Profiles → Identifiers → maak een **Services ID** (bijvoorbeeld `app.rondje.web`) en zet Sign in with Apple aan.
2. Domein: `rondje-five.vercel.app`. Return URL: `https://rondje-five.vercel.app/api/auth/callback/apple`
3. Maak onder Keys een sleutel met Sign in with Apple en maak daarmee een client secret (een JWT, maximaal 6 maanden geldig).
4. Zet in Vercel `APPLE_CLIENT_ID` (de Services ID), `APPLE_CLIENT_SECRET` (de JWT) en `APPLE_APP_BUNDLE_ID` (`app.rondje.mobile`), en redeploy.

In de iOS- en Android-app tonen we alleen e-mail en wachtwoord. Google blokkeert inloggen in app-webviews, en passkeys vragen in de app een "associated domain" (zie hieronder).

## 5. De iPhone-app bouwen (Xcode)

Je hebt een Mac met Xcode 26 of nieuwer nodig. Voor de App Store heb je ook een Apple Developer-account nodig.

```bash
git clone https://github.com/laurensbs/value.git
cd value/web
npm install
npx cap sync ios
npx cap open ios
```

1. Kies in Xcode bij het target **App → Signing & Capabilities** je Team. Pas de Bundle Identifier aan als `app.rondje.mobile` al bezet is; doe dat dan ook in `web/capacitor.config.ts`.
2. Sluit je iPhone aan en druk op ▶︎.
3. Wat al geregeld is:
   - toestemmingsteksten voor locatie, camera en foto's (Nederlands)
   - alleen staand scherm
   - app-icoon en opstartscherm
   - een offline-pagina met 112
4. Voor de App Store:
   - **Privacy labels**: locatie (gekoppeld aan de gebruiker, voor appfunctionaliteit), contactgegevens, foto's en gebruikersinhoud.
   - **Review notes**: geef Apple een testaccount.
   - **Let op richtlijn 4.2 (minimale functionaliteit)**: Apple wijst apps af die alleen een website tonen. Sterkere kans met native extra's. Die zijn de logische volgende stap:
     - pushmeldingen bij een nieuwe aanvraag of een rondje dat uitloopt
     - locatie op de achtergrond tijdens een rondje (plugin `@capacitor-community/background-geolocation`); nu blijft het scherm aan tijdens het rondje
     - passkeys via associated domains
   - Sign in with Apple is pas verplicht als de app Google-login aanbiedt. Dat doet hij nu niet.

## 6. De Android-app bouwen

```bash
cd value/web
npx cap sync android
npx cap open android
```

Druk in Android Studio op ▶︎. Voor de Play Store heb je een Play Console-account nodig (eenmalig $25).

## 7. Eigen domein (optioneel)

Vercel → **Settings → Domains → Add** (bijvoorbeeld `rondje.app`, ongeveer €15 per jaar). Daarna:

- wordt alles automatisch het nieuwe domein (inloggen, links, passkeys)
- verwijzen de andere adressen door
- pas je `server.url` in `web/capacitor.config.ts` en de knop in `web/native-shell/offline.html` aan, en voer je `npx cap sync` uit

## 8. Lokaal ontwikkelen

Zie [`web/README.md`](../web/README.md).
