# Zo start je met Rondje

De website en de app zijn één en dezelfde: **https://rondjemee.nl**. Op een telefoon kun je hem via "Zet op beginscherm" als app gebruiken. De iOS- en Android-apps (map `web/ios` en `web/android`) laden dezelfde site in een eigen app-schil.

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

1. Ga naar https://rondjemee.nl/signup en maak een account met het e-mailadres dat in `ADMIN_EMAILS` staat.
2. Vul je profiel in. Je ziet nu **Beheer** in het menu.
3. Bij **Beheer → Instellingen** zie je wat gekoppeld is.
4. Zodra er echte honden zijn: **Beheer → Voorbeelddata → Verwijder voorbeelddata**. De voorbeeldhonden zijn gemarkeerd en kunnen niet geboekt worden.

## 3. Patreon, Instagram, contact en je eigen verhaal

Deze gegevens staan niet in de code maar in Vercel, zodat je ze zonder programmeren kunt aanpassen. Zolang ze leeg zijn, laat de site er niets van zien.

1. Vercel → project **rondje** → **Settings → Environment Variables** → voeg toe (omgeving **Production**):

   | Naam | Voorbeeld | Wat het doet |
   |---|---|---|
   | `SUPPORT_URL` | `https://www.patreon.com/jouwnaam` | De knop "Steun Rondje Mee via Patreon" op `/support`. Alleen https-links van Patreon, Ko-fi, Open Collective of Buy Me a Coffee werken. |
   | `OPERATOR_NAME` | `Webstability` | Wie de bijdragen ontvangt en Rondje Mee runt. **Zonder deze naam verschijnt de steunknop niet**: mensen moeten weten waar hun geld heen gaat. |
   | `INSTAGRAM_HANDLE` | `rondjeapp` | Link in de footer, op Over ons en bij "Deel je rondje". |
   | `CONTACT_EMAIL` | een adres op `rondjemee.nl` (staat sinds 4 okt 2026 in Vercel) | **Nodig vóór de lancering.** Het enige contactadres van Rondje Mee: op `/contact` (de support-URL voor de App Store), in de juridische teksten (privacyverzoeken, klachten, DSA-contactpunt, onveilige situaties), op `/banned`, Over ons en Wachtwoord vergeten. Zonder deze variabele verwijzen die plekken naar `/contact`, waar staat dat het adres binnenkort komt. Dat is eerlijk, maar dan heeft een geblokkeerd account geen enkele weg om bezwaar te maken (de meldknop werkt voor hen niet) en is het DSA-contactpunt onbereikbaar: zet hem dus vóór je echte gebruikers toelaat. Zet hier nooit een adres op een domein dat niet van ons is. |

2. **Deployments → Redeploy**, zodat de nieuwe waarden gelden.
3. **Let op: Vercel-abonnement.** Het gratis Hobby-abonnement van Vercel is bedoeld voor niet-commercieel gebruik. Zodra je bijdragen vraagt, val je mogelijk daarbuiten. Controleer de voorwaarden van Vercel en neem zo nodig **Pro** (ongeveer $20 per maand) voordat je `SUPPORT_URL` zet.
4. **In de apps verschijnt nooit iets over geld.** Apple en Google staan geen externe betaal- of donatielinks toe voor bedrijven. De apps sturen "RondjeApp" mee in hun user agent (na `npx cap sync`, zie stap 6 en 7); de site laat dan de kosten, de steunknop en de link in de footer weg.

**E-mail (wachtwoord vergeten en meldingen).** Zonder e-mail kan niemand een nieuw wachtwoord aanvragen, en hoort een eigenaar alleen in de app over een nieuwe aanvraag of een rondje dat uitloopt. Zo zet je het aan:

1. Maak een account bij [Resend](https://resend.com) (het gratis abonnement is genoeg om te beginnen) en voeg je domein toe. Zet de DNS-records die Resend geeft bij je domeinregistrar. Nog geen eigen domein? Begin met stap 8 (eigen domein).
2. Maak in Resend een API-sleutel (alleen "Sending access").
3. Zet in Vercel `RESEND_API_KEY` (de sleutel) en `EMAIL_FROM`, bijvoorbeeld `Rondje Mee <hallo@jouwdomein.nl>`, en redeploy.
4. Test op `/forgot-password` met je eigen adres.

Mensen kiezen in hun profiel of ze e-mail willen bij meldingen; de taal volgt hun taalkeuze.

**Pushmeldingen (optioneel).** Een seintje op telefoon of computer bij een nieuw bericht, een geaccepteerde afspraak of een rondje dat uitloopt.

- *Website:* draai één keer `npx web-push generate-vapid-keys` in `web/`. Zet in Vercel `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` en `VAPID_SUBJECT` (bijvoorbeeld `mailto:hallo@jouwdomein.nl`) en redeploy. In het profiel verschijnt dan "Pushmeldingen in deze browser".
- *iPhone-app:* maak bij developer.apple.com onder Keys een sleutel met "Apple Push Notifications service". Zet in Vercel `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` (de inhoud van het .p8-bestand) en `APNS_BUNDLE_ID` (de bundle-id van de app). In Xcode zet je bij de app de capability "Push Notifications" aan.

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

## 5. Inloggen met Apple en Google

Eén account voor de website en de iPhone-app: wie op beide plekken met hetzelfde e-mailadres inlogt, komt in hetzelfde account. De knoppen "Doorgaan met Apple" en "Doorgaan met Google" verschijnen vanzelf op `/login` en `/signup` (en in de app, via `/api/v1/config`) zodra de sleutels in Vercel staan en er opnieuw is gedeployd. Zonder sleutels zie je ze niet; e-mail en passkeys werken altijd.

**Wat je nodig hebt**

- [ ] **Apple Developer Program** (€99 per jaar), op je eigen naam of later op die van de stichting. Nodig voor Apple-login én voor de App Store.
- [ ] Een **Google-account** voor Google Cloud (gratis).

**Apple** (developer.apple.com → Certificates, Identifiers & Profiles)

1. [ ] **App ID** `app.rondje.mobile` (Identifiers → App IDs): zet **Sign in with Apple** aan. Dit is de iPhone-app; die logt in met het systeemscherm van Apple.
2. [ ] **Services ID** (Identifiers → Services IDs), bijvoorbeeld `app.rondje.web`. Zet Sign in with Apple aan → Configure:
   - Primary App ID: `app.rondje.mobile`
   - Domain: `rondjemee.nl`
   - Return URL: `https://rondjemee.nl/api/auth/callback/apple`

   Deze Services ID is `APPLE_CLIENT_ID`. Hij is voor de website (en voor de app als het systeemscherm niet kan).
3. [ ] **Sleutel** (Keys → +): vink Sign in with Apple aan, kies `app.rondje.mobile` als Primary App ID en download het `.p8`-bestand. Dat kan maar één keer: bewaar het in je wachtwoordkluis, **nooit in de repo**. Noteer de **Key ID** en je **Team ID** (rechtsboven op developer.apple.com).
4. [ ] **Niets meer te maken.** Zet de hele inhoud van het `.p8`-bestand in Vercel als `APPLE_PRIVATE_KEY` (met de regels `-----BEGIN PRIVATE KEY-----` en `-----END PRIVATE KEY-----` erbij; op één regel of met `\n` erin mag ook), samen met `APPLE_KEY_ID` en `APPLE_TEAM_ID` (zie de tabel hieronder). De server maakt daar bij elke start zelf de "client secret" van die Apple vraagt (`web/src/lib/apple-secret.ts`). Die verloopt dus nooit: geen herinnering, geen script.

   Liever geen sleutel in Vercel? Dan kan het oude script nog: `node scripts/apple-client-secret.mjs --team <Team ID> --key-id <Key ID> --client-id app.rondje.web --key ~/Downloads/AuthKey_<Key ID>.p8` (in `web/`) en de uitvoer als `APPLE_CLIENT_SECRET` zetten. Die werkt **maximaal 6 maanden**; daarna moet je een nieuwe maken. Staan beide er, dan wint de sleutel.

**Google** (console.cloud.google.com)

1. [ ] Maak een project (bijvoorbeeld "Rondje Mee") → APIs & Services → **OAuth consent screen**: app-naam Rondje Mee, je support-e-mail, links naar `https://rondjemee.nl/legal/privacy` en `/legal/terms`. Scopes: alleen e-mail, profiel en openid. Zet hem daarna op **In production** (anders kunnen alleen testgebruikers inloggen).
2. [ ] Credentials → **Create OAuth client ID** → type **Web application**:
   - Authorized JavaScript origin: `https://rondjemee.nl`
   - Authorized redirect URI: `https://rondjemee.nl/api/auth/callback/google`
3. [ ] Noteer Client ID en Client secret. De iPhone-app gebruikt dezelfde webclient (via de website), dus een aparte iOS-client is niet nodig.

**In Vercel** (project `rondje` → Settings → Environment Variables, omgeving **Production**; voor previews alleen als je daar wilt testen)

| Naam | Waarde |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID van de webclient |
| `GOOGLE_CLIENT_SECRET` | Client secret van de webclient |
| `APPLE_CLIENT_ID` | de Services ID, bijvoorbeeld `app.rondje.web` |
| `APPLE_PRIVATE_KEY` | de inhoud van `AuthKey_<Key ID>.p8` |
| `APPLE_KEY_ID` | de Key ID van die sleutel (10 tekens) |
| `APPLE_TEAM_ID` | je Team ID (10 tekens) |
| `APPLE_APP_BUNDLE_ID` | `app.rondje.mobile` |

Google en Apple staan los van elkaar: Google kan dus al aan terwijl het Apple Developer-account nog loopt (dan staat op de website alleen "Doorgaan met Google"). Let wel op voor de iPhone-app: App Store-regel 4.8 vraagt Apple erbij zodra Google in de app staat, dus zet Apple aan vóór je de app instuurt.

Daarna **Redeploy** (Deployments → laatste productie-deploy → Redeploy). Is de sleutel onleesbaar of ontbreekt de Key ID of Team ID, dan blijft Apple uit en staat de reden in de Vercel-logs ("Sign in with Apple: …"). Controle: `https://rondjemee.nl/api/v1/config` toont dan `"auth":{"providers":["google","apple"],"appleNative":true}`, en op `/login` ("Welkom terug") en `/signup` ("Maak een account") staan de twee knoppen, Apple bovenaan. Ook het beheerdersdashboard laat zien welke aanstaan.

**Goed om te weten**

- **Hetzelfde e-mailadres = hetzelfde account.** Wie eerst met Apple of Google begon en later met Google of Apple inlogt, komt vanzelf in hetzelfde account. Wie eerst met e-mail en wachtwoord een account maakte, krijgt bij de eerste keer Apple/Google de vraag om één keer met het wachtwoord in te loggen; daarna is Apple/Google gekoppeld en werkt allebei. Dat is bewust: we sturen nog geen bevestigingsmail, dus zonder die stap zou iemand een account op andermans adres kunnen klaarzetten en later meelezen. Andersom (eerst Apple/Google, later een wachtwoord) gaat via "Wachtwoord vergeten" zodra de e-mail (Resend) aanstaat.
- **"Verberg mijn e-mail" bij Apple** geeft een doorstuuradres (`…@privaterelay.appleid.com`). Dat is een ander adres, dus dan ontstaat een apart, nieuw account, ook als iemand al een account met zijn echte adres had. Wie dat wil samenvoegen: inloggen met het oude account en daar Apple koppelen, of ons mailen.
- **Mails via het doorstuuradres** komen alleen aan als je verzenddomein bij Apple geregistreerd is (Certificates, Identifiers & Profiles → Services → Sign in with Apple for Email Communication). Doe dat zodra Resend met een eigen domein werkt.
- **App Store-regel 4.8:** een app die met Google laat inloggen, moet ook Sign in with Apple bieden. De native app doet allebei, dus dat klopt. De Capacitor-schil toont alleen e-mail en wachtwoord (Google weigert inloggen in webviews).
- Google of Apple later weer uitzetten: de variabelen weghalen en redeployen. Accounts blijven bestaan; wie alleen via Google of Apple inlogde, kan dan via "Wachtwoord vergeten" een wachtwoord instellen.

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

## 8. Eigen domein: rondjemee.nl

Het domein is gekocht (4 okt 2026): **https://rondjemee.nl** is het adres van de site, `rondjemee.com` en `www` sturen door. In de code staat het al: `server.url` in `web/capacitor.config.ts`, de knop in `web/native-shell/offline.html`, de controle in `.github/workflows/live.yml` en de release-build van de iPhone-app. Nog te doen in Vercel, zodra het domein bereikbaar is:

- zet `BETTER_AUTH_URL` op `https://rondjemee.nl` en redeploy. Daarna wordt alles het nieuwe domein (inloggen, links, passkeys) en sturen de andere adressen, zoals rondje-five.vercel.app, door. Een passkey die op het oude adres is gemaakt, werkt op het nieuwe niet: log dan één keer in met je wachtwoord en voeg een nieuwe passkey toe
- voer daarna voor de app-schillen `npx cap sync` uit

## 9. Lokaal ontwikkelen

Zie [`web/README.md`](../web/README.md).

## Previews en de database

Vercel-previews gebruiken nu dezelfde database als productie (`DATABASE_URL` staat voor alle omgevingen). Daarom voert een preview **geen migraties** uit (`web/src/db/preview.ts`): een PR kan het schema van productie nooit meer veranderen. Productie, lokaal en de tests migreren gewoon.

Een eigen database per preview (gratis bij Neon):
1. Vercel → project **rondje** → Integrations → **Neon** → Manage → zet **"Create a database branch for each preview deployment"** aan (Neon maakt per preview een kopie van `rondje-db` en zet `DATABASE_URL` voor die preview).
2. Vercel → Settings → Environment Variables → nieuwe variabele `PREVIEW_MIGRATIONS` = `1`, alleen voor **Preview**.
3. Daarna draait elke preview zijn eigen migraties op zijn eigen kopie, zonder productie te raken.
