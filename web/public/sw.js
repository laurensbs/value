// Rondje's service worker: push notifications, and a page of its own when there is no connection.
// It caches no pages and no data, so the site always shows fresh data. Only full page loads pass
// through it (never the app's own requests), straight to the network.

// The offline page, in the language the person last used Rondje in (they tell the worker, see
// components/OfflineReady.tsx). Text only: no fonts or images to keep around.
const OFFLINE = {
  nl: { title: 'Geen verbinding', text: 'Rondje kan het internet nu niet bereiken. Zodra je weer verbinding hebt, gaat het vanzelf verder.', retry: 'Probeer opnieuw', sos: 'Noodgeval? Bel <a href="tel:112">112</a>.' },
  en: { title: 'No connection', text: "Rondje can't reach the internet right now. As soon as you're back online, it carries on by itself.", retry: 'Try again', sos: 'Emergency? Call <a href="tel:112">112</a>.' },
  es: { title: 'Sin conexión', text: 'Rondje no puede conectarse a internet ahora mismo. En cuanto vuelvas a tener conexión, seguirá solo.', retry: 'Reintentar', sos: '¿Una emergencia? Llama al <a href="tel:112">112</a>.' },
  fr: { title: 'Pas de connexion', text: "Rondje n'arrive pas à joindre internet pour le moment. Dès que la connexion revient, tout reprend tout seul.", retry: 'Réessayer', sos: 'Urgence ? Appelez le <a href="tel:112">112</a>.' },
}
const STORE = 'rondje'
const LANG_KEY = '/__rondje-lang'
// Back online: load the page they asked for. Its hash is in the page's policy below.
const RETRY_SCRIPT = "addEventListener('online',function(){location.reload()})"
const RETRY_HASH = 'sha256-YA1u/H0TSxLalCUxkGd/AKPFvRdrxeC9BNQ71wXyjFU='
const MASCOT =
  '<svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true"><ellipse cx="60" cy="62" rx="34" ry="32" fill="#e2b45c"/><g fill="#c99540"><ellipse cx="31" cy="62" rx="11" ry="24" transform="rotate(14 31 62)"/><ellipse cx="89" cy="62" rx="11" ry="24" transform="rotate(-14 89 62)"/></g><g fill="#1d2421"><circle cx="47" cy="57" r="4.3"/><circle cx="73" cy="57" r="4.3"/></g><g fill="#fff"><circle cx="48.5" cy="55.6" r="1.4"/><circle cx="74.5" cy="55.6" r="1.4"/></g><ellipse cx="60" cy="76" rx="18" ry="14" fill="#f2d79b"/><path d="M55.5 80.5 q4.5 11 9 0 z" fill="#e8798a"/><ellipse cx="60" cy="70" rx="7" ry="5" fill="#1d2421"/><ellipse cx="58" cy="68.4" rx="2.2" ry="1.2" fill="#fff" opacity="0.35"/><path d="M60 75 v4 M60 79 q-5 4 -9 1 M60 79 q5 4 9 1" fill="none" stroke="#1d2421" stroke-width="2" stroke-linecap="round"/><rect x="36.88" y="89" width="46.24" height="7" rx="3.5" fill="#1f5a3d"/><circle cx="60" cy="101" r="5.5" fill="#e9c46a" stroke="#1d2421" stroke-width="1.5"/></svg>'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // The page request starts while the worker wakes up, so passing through costs no time.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable()
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  const lang = event.data && event.data.type === 'lang' ? event.data.lang : null
  if (lang && OFFLINE[lang]) event.waitUntil(caches.open(STORE).then((cache) => cache.put(LANG_KEY, new Response(lang))))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.mode !== 'navigate' || request.method !== 'GET') return
  event.respondWith(
    (async () => {
      try {
        return (await event.preloadResponse) || (await fetch(request))
      } catch {
        return offlinePage()
      }
    })(),
  )
})

async function offlinePage() {
  const saved = await caches.match(LANG_KEY).then((r) => (r ? r.text() : null)).catch(() => null)
  const device = (self.navigator.language || '').slice(0, 2)
  const lang = OFFLINE[saved] ? saved : OFFLINE[device] ? device : 'nl'
  const t = OFFLINE[lang]
  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>${t.title} · Rondje</title>
<style>
:root{--paper:#f4f6f0;--ink:#16201a;--muted:#55635a;--grass:#1f5a3d;--on-grass:#fff}
@media (prefers-color-scheme:dark){:root{--paper:#0d1310;--ink:#e7eee8;--muted:#9eafa4;--grass:#8fdcae;--on-grass:#0d1310}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:24px 16px calc(24px + env(safe-area-inset-bottom));background:var(--paper);color:var(--ink);font:17px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:center}
main{max-width:26rem;display:grid;gap:14px;justify-items:center}
h1{margin:0;font-size:1.6rem;line-height:1.2}
p{margin:0}
.muted{color:var(--muted)}
.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 24px;border-radius:999px;background:var(--grass);color:var(--on-grass);font-weight:700;text-decoration:none}
a{color:inherit;font-weight:700}
a:focus-visible{outline:3px solid var(--grass);outline-offset:3px}
</style>
</head>
<body>
<main>
${MASCOT}
<h1>${t.title}</h1>
<p class="muted">${t.text}</p>
<a class="button" href="">${t.retry}</a>
<p>${t.sos}</p>
</main>
<script>${RETRY_SCRIPT}</script>
</body>
</html>`
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': `default-src 'none'; style-src 'unsafe-inline'; script-src '${RETRY_HASH}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    },
  })
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Rondje'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/notifications' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/notifications', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const win of windows) {
        if (win.url.startsWith(self.location.origin) && 'focus' in win) {
          win.navigate(url)
          return win.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
