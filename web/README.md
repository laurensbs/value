# Rondje — web app

The website, which is also the iOS and Android app (Capacitor shells in `ios/` and `android/` load the live site). Next.js 16 App Router, React 19, Drizzle ORM, Better Auth, next-intl, Leaflet.

Live: https://rondje-five.vercel.app · Launch guide (Dutch): [`../docs/LAUNCH.md`](../docs/LAUNCH.md)

## Run it

```bash
npm install
npm run dev            # http://localhost:3000, data in .pglite/ (embedded Postgres)
npm test               # unit tests (Vitest)
npm run test:e2e       # Playwright: walk flow, shelters (with photo bulk add), tips, support/about pages (starts its own server)
npm run lint && npm run typecheck
npm run audit -- http://localhost:3100 audit   # mobile + desktop check of every page, signed out and in
```

`npm run audit` needs a running server whose `ADMIN_EMAILS` includes `audit@rondje.test`. It reports horizontal overflow, page errors, tap targets under 44 px on a touch phone, unlabeled form fields and slow pages, and saves a screenshot per page.

No database server is needed locally: without `DATABASE_URL` the app runs on PGlite (`.pglite/`, or in memory with `PGLITE_DIR=memory`). Migrations run automatically on the first request, and example dogs, owners and shelters are seeded into an empty database (marked as examples, removable in Admin). Set `SEED_DEMO=0` to skip them.

If Playwright cannot find Chromium, set `PW_CHROMIUM_PATH=/path/to/chrome`. Set `E2E_SERVER_CMD="npx next start --port 3200"` to test a production build (`npx next build` first).

## Environment

| Variable | Needed | What it does |
|---|---|---|
| `DATABASE_URL` or `POSTGRES_URL` | production | Postgres. Neon hosts use the Neon serverless driver, others use node-postgres. |
| `BETTER_AUTH_SECRET` | production | Signs sessions. The app refuses to start in production without it. |
| `ADMIN_EMAILS` | yes | Comma-separated emails that get `/admin`. |
| `CRON_SECRET` | yes | Bearer token for `/api/cron/cleanup` (Vercel Cron sends it). |
| `BLOB_READ_WRITE_TOKEN` | recommended | Vercel Blob for photos. Without it, photos are stored inline (max 450 KB). |
| `GOOGLE_CLIENT_ID`/`_SECRET` | optional | Google sign-in. |
| `APPLE_CLIENT_ID`/`_SECRET`/`APPLE_APP_BUNDLE_ID` | optional | Sign in with Apple. |
| `BETTER_AUTH_URL` | optional | Canonical URL; defaults to the Vercel production domain. |
| `NEXT_PUBLIC_TILE_URL` | optional | Map tiles; defaults to OpenStreetMap. Use a tile provider with an API key before heavy traffic. |
| `SUPPORT_URL` + `OPERATOR_NAME` | optional | The support button on `/support` (https Patreon, Ko-fi, Open Collective or Buy Me a Coffee only). Shown only when both are set, and never in the apps. |
| `INSTAGRAM_HANDLE`, `CONTACT_EMAIL` | optional | Instagram link (footer, about, support) and contact address. Hidden while empty. |
| `RESEND_API_KEY` + `EMAIL_FROM` | recommended | Email through Resend: password reset, and notification emails (new request, accepted, overdue walk, shelter verified). Without them no email is sent and "forgot password" explains that. `EMAIL_FROM` like `Rondje <hallo@your-domain>` (a domain verified in Resend). |

## Where things are

- `src/lib/rules.ts`: who may request, start and continue walks (18+, supervised first meeting, per-dog solo trust, safety quiz, Spanish PPP licence, overdue alerts, message scanning). Pure and unit-tested; enforced in server actions, not in the UI.
- `src/server/actions/*`: every write, with zod validation and access checks.
- `src/server/queries.ts`: reads. Private details (meeting place, vet, chip, contact) are blanked unless an appointment was accepted.
- `src/app/api/walks/[id]/points|live`: live tracking. The walker posts GPS fixes every 10 s; watchers poll every 5 s. Routes are deleted after 30 days.
- `src/app/shelter/**`: shelter sign-up, dashboard, details (`/edit`), photo-first bulk add (`/dogs/bulk`, drafts named from file names by `nameFromFile` in `src/lib/dog-import.ts`) and the printable poster (`/poster`).
- `src/server/actions/tips.ts` and `/suggest`: tips and "I want to walk here" votes for shelters (nothing is stored about private people); admins see them grouped on `/admin`.
- `src/lib/support.ts`, `src/server/native.ts`: support/Instagram/contact settings from the environment, and recognising the apps (user agent "RondjeApp", set in `capacitor.config.ts`) so no money is shown there.
- `src/server/email.ts`, `src/lib/email-layout.ts`: emails (Resend HTTP API, sent after the response with `after()`), in each person's language (`profile.locale`); people can switch notification emails off in their profile.
- `content/about/nl/story.md`: the founder's story for `/about`, hidden until `published: "true"`; `content/costs.json`: the cost table on `/support`.
- `src/db/schema.ts` and `drizzle/`: schema and SQL migrations. After a schema change run `npm run db:generate`; it also embeds the SQL into `src/db/migrations.json`, which the app applies at runtime under an advisory lock.
- `messages/*.json`: interface text. `nl` is the source; missing keys fall back to it.
- `content/legal/<locale>/*.md`: terms, privacy, conduct code, safety, shelter terms, cookies.
- `content/shelters.json`: shelter directory for `/shelters` (public sources, unverified).

## Native apps

```bash
npx cap sync           # after changing capacitor.config.ts or native-shell/
npx cap open ios       # Xcode (macOS)
npx cap open android   # Android Studio
node scripts/native-assets.mjs && npx @capacitor/assets generate   # icons and splash screens
```

The shells load `server.url` from `capacitor.config.ts` (set `CAP_SERVER_URL` to point at another deployment). They show `native-shell/offline.html` when there is no connection.
