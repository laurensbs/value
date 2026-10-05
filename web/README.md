# Rondje — web app

The website, which is also the iOS and Android app (Capacitor shells in `ios/` and `android/` load the live site). Next.js 16 App Router, React 19, Drizzle ORM, Better Auth, next-intl, Leaflet.

Live: https://rondjemee.nl · Launch guide (Dutch): [`../docs/LAUNCH.md`](../docs/LAUNCH.md)

## Run it

```bash
npm install
npm run dev            # http://localhost:3000, data in .pglite/ (embedded Postgres)
npm test               # unit tests (Vitest)
npm run test:e2e       # Playwright: walk flow, shelters (with photo bulk add), tips, support/about pages (starts its own server)
npm run lint && npm run typecheck
npm run audit -- http://localhost:3100 audit   # mobile + desktop check of every page, signed out and in
```

`npm run audit` needs a running test server on PGlite whose `ADMIN_EMAILS` includes `audit@rondje.test`, with `TEST_CLOCK=1` (only such a throwaway server trusts the list without a confirmed address). It reports horizontal overflow, page errors, tap targets under 44 px on a touch phone, unlabeled form fields and slow pages, and saves a screenshot per page.

No database server is needed locally: without `DATABASE_URL` the app runs on PGlite (`.pglite/`, or in memory with `PGLITE_DIR=memory`). Migrations run automatically on the first request, and example dogs, owners and shelters are seeded into an empty database (marked as examples, removable in Admin). Set `SEED_DEMO=0` to skip them.

If Playwright cannot find Chromium, set `PW_CHROMIUM_PATH=/path/to/chrome`. Set `E2E_SERVER_CMD="npx next start --port 3200"` to test a production build (`npx next build` first).

## Environment

| Variable | Needed | What it does |
|---|---|---|
| `DATABASE_URL` or `POSTGRES_URL` | production | Postgres. Neon hosts use the Neon serverless driver, others use node-postgres. |
| `BETTER_AUTH_SECRET` | production | Signs sessions. The app refuses to start in production without it. |
| `ADMIN_EMAILS` | yes | Comma-separated emails that may get `/admin`, once that address is confirmed through a link in its inbox (needs email) or Google/Apple. While email is off, only the `admin` role in the database opens `/admin`. |
| `CRON_SECRET` | yes | Bearer token for the daily jobs `/api/cron/cleanup` and `/api/cron/nudges` (friendly reminders; Vercel Cron sends it). |
| `BLOB_READ_WRITE_TOKEN` | recommended | Vercel Blob for photos. Without it, photos are stored inline (max 450 KB). |
| `GOOGLE_CLIENT_ID`/`_SECRET` | optional | Google sign-in. |
| `APPLE_CLIENT_ID`/`_SECRET`/`APPLE_APP_BUNDLE_ID` | optional | Sign in with Apple. |
| `BETTER_AUTH_URL` | optional | Canonical URL; defaults to the Vercel production domain. |
| `NEXT_PUBLIC_TILE_URL` | optional | Map tiles; defaults to OpenStreetMap. Use a tile provider with an API key before heavy traffic. |
| `SUPPORT_URL` + `OPERATOR_NAME` | optional | The support button on `/support` (https Patreon, Ko-fi, Open Collective or Buy Me a Coffee only). Shown only when both are set, and never in the apps. |
| `CROWDFUNDING_URL` | optional | A one-off campaign (https Whydonate, GoFundMe, Doneeractie, Kickstarter, Ulule, Goteo or Verkami only), with `OPERATOR_NAME`. On `/support` the button "Geef een rondje via Whydonate" (new tab); goal and amount raised come from `content/crowdfunding.json`. In the apps exactly two quiet entries, never at the top: the block at the bottom of the home page and one row "Help ons via Whydonate" low in the profile (just above signing out); both open it in the phone's browser, and the app footer has no support link. `/api/v1/config` returns it as `support`. The amount raised shows once it is above €0; before that the goal: in rounds in Dutch ("Doel: 600 rondjes"), in euros in English, Spanish and French ("Goal: €3,000", "From €5"), so nothing there reads like a price per walk. |
| `SUPPORT_IN_APP` | optional | The default for both apps: unset shows "Help ons via Whydonate" in the apps (`support.inApp` in `/api/v1/config`); `0` hides every entry. `1`, `true`, `on`, `ja` or `aan` is on, anything else (a typo too) is off. The website never changes. Never for hiding the row from app reviewers: see `docs/LAUNCH.md` §3 and `docs/app-store/indienen.md`. |
| `SUPPORT_IN_APP_IOS` | optional | The same, for the iPhone and iPad only (the Capacitor shell by its user agent, the native app by `X-Rondje-Platform: ios`). Unset: follows `SUPPORT_IN_APP`. `0` takes the row out of iOS for good, for example if Apple does not accept it. |
| `SUPPORT_IN_APP_ANDROID` | optional | The same, for the Android app only. Unset: follows `SUPPORT_IN_APP`. |
| `LIVE_LOCATION` | optional | Live location during walks. **Off unless set:** only `1`, `true`, `on`, `ja` or `aan` switch it on; unset, empty or anything else (a typo too) is off. Even when on, only a walk alone with the dog (`kind` `solo`) collects location (`walkHasLiveLocation` in `src/lib/rules.ts`): a first meeting walks together with the owner or shelter, and group walks never start a walk in the app, so neither has GPS (`POST /api/walks/<id>/points` answers 403 `live-location-off`). Off: no location points are stored, the walk screens show no live map and say calmly that live location is off for now, and a walk alone with the dog cannot be asked for, accepted or started (`live-location-off`, also from `/api/v1/requests`, `/api/v1/requests/<id>` and `canRequest.solo` in `/api/v1/dogs/<id>`); one agreed while it was on waits with a calm note on both sides (`paused` in `GET /api/v1/requests`), and nothing on the site promises following a walk live. A first meeting still starts and ends. The apps read it from `/api/v1/config` as `features.liveLocation`. Privacy art. 5 and 14: leave it unset in production until the DPIA is finished. The Playwright test server sets it on (`playwright.config.ts`); a test browser switches it off again with the header `x-rondje-live-location: off`, so both states stay tested. |
| `INSTAGRAM_HANDLE` | optional | Instagram link (footer, about, support, and `sameAs` in the home page's structured data). Hidden while empty. |
| `GOOGLE_SITE_VERIFICATION` | optional | The token of Google Search Console's HTML tag (`<meta name="google-site-verification">`). No tag while empty. |
| `CONTACT_EMAIL` | needed before launch | The only contact address: `/contact`, the legal texts (`{{contact}}` in `content/legal`), `/banned`, about and forgot password. While empty, those link to `/contact`, which says the address is coming. Use an address on a domain we own. |
| `RESEND_API_KEY` + `EMAIL_FROM` | recommended | Email through Resend: password reset, and notification emails (new request, accepted, overdue walk, shelter verified). Without them no email is sent and "forgot password" explains that. `EMAIL_FROM` like `Rondje <hallo@your-domain>` (a domain verified in Resend). |
| `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` | optional | Push notifications in browsers (and on iPhone once the site is on the home screen). Generate a pair with `npx web-push generate-vapid-keys`; `VAPID_SUBJECT` is `mailto:` plus your address. Without them the toggle in the profile stays hidden. |
| `APNS_KEY_ID` + `APNS_TEAM_ID` + `APNS_PRIVATE_KEY` + `APNS_BUNDLE_ID` | optional | Push notifications in the native iOS app, through Apple (token auth with a .p8 key from developer.apple.com → Keys). `APNS_PRIVATE_KEY` is the contents of the .p8 file; newlines may be written as `\n`. The app registers its device token at `POST /api/v1/devices`. |

## Where things are

- `src/lib/rules.ts`: who may request, start and continue walks (18+, supervised first meeting, per-dog solo trust, safety quiz, Spanish PPP licence, overdue alerts, message scanning). Pure and unit-tested; enforced in server actions, not in the UI.
- `src/server/actions/*`: every write, with zod validation and access checks.
- `src/server/queries.ts`: reads. Private details (meeting place, vet, chip, contact) are blanked unless an appointment was accepted.
- `src/app/api/walks/[id]/points|live`: live tracking. The walker posts GPS fixes every 10 s; watchers poll every 5 s. Routes are deleted after 30 days.
- `src/app/shelter/**`: shelter sign-up, dashboard, details (`/edit`), photo-first bulk add (`/dogs/bulk`, drafts named from file names by `nameFromFile` in `src/lib/dog-import.ts`) and the printable poster (`/poster`).
- `src/server/actions/tips.ts` and `/suggest`: tips and "I want to walk here" votes for shelters (nothing is stored about private people); admins see them grouped on `/admin`.
- `/admin/sources` ("Bronnen"), `src/server/sources.ts` and `sources-core.ts`: new sign-ups per ISO week for the last 8 weeks, per source (the campaign code of the sign-up link, "Uitnodiging" for a member's own code, "Direct" without one) and per role, the new real dogs, and the crowdfunding from `content/crowdfunding.json`. Counts only: never a name, an e-mail address or a member's own code; example data and admins never count.
- `src/lib/support.ts`, `src/server/native.ts`: support/Instagram/contact settings from the environment, and recognising the apps (user agent "RondjeApp", set in `capacitor.config.ts`) so no money is shown there.
- `src/server/email.ts`, `src/lib/email-layout.ts`: emails (Resend HTTP API, sent after the response with `after()`), in each person's language (`profile.locale`); people can switch notification emails off in their profile.
- `content/about/nl/story.md`: the founder's story for `/about`, hidden until `published: "true"`; `content/costs.json`: the cost table on `/support`.
- `src/db/schema.ts` and `drizzle/`: schema and SQL migrations. After a schema change run `npm run db:generate`; it also embeds the SQL into `src/db/migrations.json`, which the app applies at runtime under an advisory lock.
- `messages/*.json`: interface text. `nl` is the source; missing keys fall back to it.
- `src/i18n/config.ts` (`pickLocale`), `src/i18n/request.ts`: which language a page is in. A choice first (the `NEXT_LOCALE` cookie from the language switcher, then `profile.locale` when signed in; the iPhone app sends its own language as `Accept-Language`), then the browser's language if it is nl/en/es/fr, then the country (Vercel's `x-vercel-ip-country`: NL/BE → nl, Spain and Latin America → es, France/Luxembourg → fr, anywhere else → en), then Dutch. The switcher is in the header and in both footers.
- `content/legal/<locale>/*.md`: terms, privacy, conduct code, safety, shelter terms, cookies.
- `src/app/cities/**`, `src/lib/cities.ts`: a public page per city for search engines (cities from the shelter directory and verified shelters): shelters, group walks, a count of dogs waiting (never the dogs themselves) and the free promise. A city is in search engines and the sitemap only once it has a real dog, an upcoming real group walk or a verified partner shelter (`indexableCities` in `src/server/cities.ts`; example data never counts); until then the page says noindex.
- `src/lib/seo.ts`, `src/components/JsonLd.tsx`: per page title, description (max. 155), canonical without query, preview card; JSON-LD (Organization + WebSite on the home page, BreadcrumbList and Event on city pages). `node scripts/seo-crawl.mjs <baseUrl>` walks the sitemap as Googlebot in four languages and checks all of it.
- `content/shelters.json`: shelter directory for `/shelters` (public sources, unverified).

## Native apps

```bash
npx cap sync           # after changing capacitor.config.ts or native-shell/
npx cap open ios       # Xcode (macOS)
npx cap open android   # Android Studio
node scripts/brand-assets.mjs   # every logo image: favicon, PWA and app icons, splash screens
```

The logo sources (wordmark, stacked app icon, favicon) are in `assets/brand/`; `scripts/brand-assets.mjs` renders the website icons, the Capacitor sources in `assets/` and every app icon and splash screen of both shells from them.

The shells load `server.url` from `capacitor.config.ts` (set `CAP_SERVER_URL` to point at another deployment). They show `native-shell/offline.html` when there is no connection.
