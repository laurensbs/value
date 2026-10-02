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
| Opvangen | Aanmelden met alle gegevens (aantal honden, logo, wandeltijden, koekjes mee of niet, privé-contactpersoon), honden snel toevoegen met foto's of een CSV-bestand, groepswandelingen, een poster met QR-code. |
| Tips en stemmen | Iedereen kan een opvang tippen (`/suggest`) of "Ik wil hier wandelen" aanklikken (`/shelters`). Jij ziet ze in **Beheer → Tips en stemmen**, meest gevraagd bovenaan. |
| Maak Rondje mogelijk | `/support` staat online. De steunknop (Patreon) verschijnt pas als je hem instelt: zie stap 3. |

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

## 3. Patreon, Instagram, contact en je eigen verhaal

Deze gegevens staan niet in de code maar in Vercel, zodat je ze zonder programmeren kunt aanpassen. Zolang ze leeg zijn, laat de site er niets van zien.

1. Vercel → project **rondje** → **Settings → Environment Variables** → voeg toe (omgeving **Production**):

   | Naam | Voorbeeld | Wat het doet |
   |---|---|---|
   | `SUPPORT_URL` | `https://www.patreon.com/jouwnaam` | De knop "Steun Rondje via Patreon" op `/support`. Alleen https-links van Patreon, Ko-fi, Open Collective of Buy Me a Coffee werken. |
   | `OPERATOR_NAME` | `Webstability` | Wie de bijdragen ontvangt en Rondje runt. **Zonder deze naam verschijnt de steunknop niet**: mensen moeten weten waar hun geld heen gaat. |
   | `INSTAGRAM_HANDLE` | `rondjeapp` | Link in de footer, op Over ons en bij "Deel je rondje". |
   | `CONTACT_EMAIL` | `hallo@jouwdomein.nl` | Contactadres op Over ons en voor partners. |

2. **Deployments → Redeploy**, zodat de nieuwe waarden gelden.
3. **Let op: Vercel-abonnement.** Het gratis Hobby-abonnement van Vercel is bedoeld voor niet-commercieel gebruik. Zodra je bijdragen vraagt, val je mogelijk daarbuiten. Controleer de voorwaarden van Vercel en neem zo nodig **Pro** (ongeveer $20 per maand) voordat je `SUPPORT_URL` zet.
4. **In de apps verschijnt nooit iets over geld.** Apple en Google staan geen externe betaal- of donatielinks toe voor bedrijven. De apps sturen "RondjeApp" mee in hun user agent (na `npx cap sync`, zie stap 6 en 7); de site laat dan de kosten, de steunknop en de link in de footer weg.

**E-mail (wachtwoord vergeten en meldingen).** Zonder e-mail kan niemand een nieuw wachtwoord aanvragen, en hoort een eigenaar alleen in de app over een nieuwe aanvraag of een rondje dat uitloopt. Zo zet je het aan:

1. Maak een account bij [Resend](https://resend.com) (het gratis abonnement is genoeg om te beginnen) en voeg je domein toe. Zet de DNS-records die Resend geeft bij je domeinregistrar. Nog geen eigen domein? Begin met stap 8 (eigen domein).
2. Maak in Resend een API-sleutel (alleen "Sending access").
3. Zet in Vercel `RESEND_API_KEY` (de sleutel) en `EMAIL_FROM`, bijvoorbeeld `Rondje <hallo@jouwdomein.nl>`, en redeploy.
4. Test op `/forgot-password` met je eigen adres.

Mensen kiezen in hun profiel of ze e-mail willen bij meldingen; de taal volgt hun taalkeuze.

**Je verhaal op Over ons.** Het sjabloon staat in `web/content/about/nl/story.md`, met schrijfvragen en de richtlijnen van 113 voor schrijven over somberheid. Vul het in, zet bovenaan `published: "true"` en commit: dan staat het op `/about`. Eerst bekijken kan als beheerder via `/about?preview=1`. Wil je een foto erbij? Zet die in `web/public/` en verwijs ernaar in het verhaal.

## 4. Vóór de echte lancering

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

- [`docs/OUTREACH.md`](OUTREACH.md) bevat de aanpak, mails in het Nederlands, Frans en Spaans, en een lijst met 39 opvangen (ook zichtbaar op `/shelters`).
- [`docs/MARKETING.md`](MARKETING.md) is het complete marketingplan; [`docs/INSTAGRAM.md`](INSTAGRAM.md) het startpakket voor Instagram.
- Begin bij **Beheer → Tips en stemmen**: daar zie je welke opvangen mensen het vaakst vragen. Stuur een opvang zijn eigen aanmeldlink (`/shelter?claim=…`, staat erbij).
- Opvangen melden zich aan via `/shelter`. Jij krijgt een melding en keurt ze goed bij **Beheer → Opvangen om te controleren** (met een link naar KvK of KBO).
- Honden toevoegen gaat het snelst met **Snel toevoegen met foto's**: één foto per hond kiezen, namen kloppen vaak al (uit de bestandsnaam), alles in één keer online. Een CSV-bestand kan ook (`web/public/rondje-honden-voorbeeld.csv`).
- Elke opvang kan een **poster met QR-code** printen (dashboard → Poster). Iedereen kan een **flyer voor de buurt** printen (`/flyer`), met de eigen uitnodigingslink erin.

## 5. Inloggen met Google en Apple (optioneel)

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

## 6. De iPhone-app bouwen (Xcode)

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
   - de app stuurt "RondjeApp" mee, zodat de site er geen geld laat zien (draai `npx cap sync` na elke wijziging in `capacitor.config.ts`)
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

## 7. De Android-app bouwen

```bash
cd value/web
npx cap sync android
npx cap open android
```

Druk in Android Studio op ▶︎. Voor de Play Store heb je een Play Console-account nodig (eenmalig $25).

## 8. Eigen domein (optioneel)

Vercel → **Settings → Domains → Add** (bijvoorbeeld `rondje.app`, ongeveer €15 per jaar). Daarna:

- wordt alles automatisch het nieuwe domein (inloggen, links, passkeys)
- verwijzen de andere adressen door
- pas je `server.url` in `web/capacitor.config.ts` en de knop in `web/native-shell/offline.html` aan, en voer je `npx cap sync` uit

## 9. Lokaal ontwikkelen

Zie [`web/README.md`](../web/README.md).
