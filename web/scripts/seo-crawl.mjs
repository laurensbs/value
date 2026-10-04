// What search engines see: walks the sitemap as Googlebot, once per language (Accept-Language),
// and checks per page the status, title, description (max. 160 characters, none twice), canonical
// (equal to the sitemap address, no query), robots (never noindex in the sitemap), the preview card
// (og:title, og:description, og:url, twitter:card) and the JSON-LD blocks (valid JSON, with the
// page's nonce). Then checks pages that must stay out of search engines: noindex and not in the sitemap.
// Usage: node scripts/seo-crawl.mjs <baseUrl> [--lang nl,en,es,fr] [--noindex /login,/signup,...] [--json out.json]
// Exit code 1 when something is wrong. Previews answer robots.txt with "Disallow: /": that is on purpose.
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const base = (args[0] && !args[0].startsWith('--') ? args[0] : 'http://localhost:3000').replace(/\/$/, '')
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const langs = option('lang', 'nl,en,es,fr').split(',')
const mustBeHidden = option('noindex', '/login,/signup,/dogs/demo-noor,/dogs/demo-saar,/dogs?org=demo-olivos,/cities/amsterdam').split(',')
const jsonOut = option('json', '')
const DESCRIPTION_MAX = 160
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

function attributes(tag) {
  const out = {}
  for (const m of tag.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) out[m[1].toLowerCase()] = decode(m[2])
  return out
}

/** The tags in the page's <head> that matter here. Googlebot gets the metadata in the head, not streamed. */
function read(html) {
  const head = html.slice(0, html.indexOf('</head>') >= 0 ? html.indexOf('</head>') : html.length)
  const metas = [...head.matchAll(/<meta\s[^>]*>/g)].map((m) => attributes(m[0]))
  const links = [...head.matchAll(/<link\s[^>]*>/g)].map((m) => attributes(m[0]))
  const meta = (key) => metas.find((m) => m.name === key || m.property === key)?.content
  const blocks = [...html.matchAll(/<script([^>]*)type="application\/ld\+json"([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => {
    const attrs = attributes(`${m[1]} ${m[2]}`)
    try {
      const data = JSON.parse(m[3])
      const things = [data].flat().flatMap((d) => d['@graph'] ?? [d])
      return { ok: true, nonce: 'nonce' in attrs, types: things.map((t) => t['@type']), data }
    } catch {
      return { ok: false, nonce: 'nonce' in attrs, types: [] }
    }
  })
  return {
    title: decode(/<title>([^<]*)<\/title>/.exec(head)?.[1] ?? ''),
    description: meta('description'),
    robots: meta('robots'),
    canonical: links.find((l) => l.rel === 'canonical')?.href,
    ogTitle: meta('og:title'),
    ogDescription: meta('og:description'),
    ogUrl: meta('og:url'),
    ogImage: meta('og:image'),
    twitterCard: meta('twitter:card'),
    jsonLd: blocks,
  }
}

async function get(url, lang) {
  const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': lang }, redirect: 'manual' })
  return { status: res.status, html: res.status === 200 ? await res.text() : '' }
}

const sitemapRes = await fetch(`${base}/sitemap.xml`, { headers: { 'user-agent': UA } })
const sitemap = await sitemapRes.text()
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
  loc: decode(/<loc>([^<]*)<\/loc>/.exec(m[1])?.[1] ?? ''),
  lastmod: /<lastmod>([^<]*)<\/lastmod>/.exec(m[1])?.[1] ?? null,
}))
const robotsTxt = await (await fetch(`${base}/robots.txt`)).text()

const problems = []
const rows = []
const same = (a, b) => {
  try {
    return new URL(a).href === new URL(b).href
  } catch {
    return false
  }
}

for (const lang of langs) {
  const seen = new Map()
  for (const { loc, lastmod } of entries) {
    const path = new URL(loc).pathname
    const { status, html } = await get(`${base}${path}`, lang)
    const p = read(html)
    const issues = []
    if (status !== 200) issues.push(`status ${status}`)
    // Only cities (last real change) and legal texts (their own date) carry a date; the rest none.
    if (!lastmod && /^\/(cities|legal)\//.test(path)) issues.push('no lastmod')
    if (!p.title) issues.push('no title')
    if (!p.description) issues.push('no description')
    else if (p.description.length > DESCRIPTION_MAX) issues.push(`description ${p.description.length} > ${DESCRIPTION_MAX}`)
    if (!p.canonical) issues.push('no canonical')
    else if (!same(p.canonical, loc)) issues.push(`canonical ${p.canonical} ≠ ${loc}`)
    if (p.robots && /noindex/.test(p.robots)) issues.push(`robots ${p.robots} in the sitemap`)
    if (!p.ogTitle || !p.ogDescription) issues.push('no og:title/og:description')
    if (!p.ogUrl) issues.push('no og:url')
    else if (p.canonical && !same(p.ogUrl, p.canonical)) issues.push('og:url ≠ canonical')
    if (!p.twitterCard) issues.push('no twitter:card')
    for (const block of p.jsonLd) {
      if (!block.ok) issues.push('JSON-LD is not valid JSON')
      if (!block.nonce) issues.push('JSON-LD without nonce')
    }
    if (p.description) {
      const other = seen.get(p.description)
      if (other) issues.push(`same description as ${other}`)
      else seen.set(p.description, path)
    }
    for (const issue of issues) problems.push(`[${lang}] ${path}: ${issue}`)
    rows.push({ lang, path, status, title: p.title, description: p.description ?? '', robots: p.robots ?? '', canonical: p.canonical ?? '', ogTitle: p.ogTitle ?? '', ogUrl: p.ogUrl ?? '', jsonLd: p.jsonLd.flatMap((b) => b.types), lastmod, issues })
  }
}

// Pages that must not be found: noindex in the page, and not in the sitemap.
const hidden = []
for (const path of mustBeHidden) {
  const { status, html } = await get(`${base}${path}`, langs[0])
  const p = read(html)
  const inSitemap = entries.some((e) => new URL(e.loc).pathname === path.split('?')[0] && !path.includes('?'))
  const ok = status === 200 && /noindex/.test(p.robots ?? '') && !inSitemap
  hidden.push({ path, status, robots: p.robots ?? '', canonical: p.canonical ?? '', inSitemap, ok })
  if (status === 404) continue // not there on this server (e.g. no example data): nothing to hide
  if (!ok) problems.push(`${path}: should be noindex and out of the sitemap (status ${status}, robots "${p.robots ?? ''}", in sitemap: ${inSitemap})`)
}

// Summary.
const byLang = (lang) => rows.filter((r) => r.lang === lang)
const descLengths = rows.map((r) => r.description.length)
console.log(`Base: ${base}`)
console.log(`robots.txt: ${robotsTxt.includes('Disallow: /\n') || /Disallow: \/$/m.test(robotsTxt) ? 'Disallow: / (preview)' : 'open, with sitemap'}`)
console.log(`Sitemap: ${entries.length} URLs (${entries.filter((e) => e.lastmod).length} with lastmod), of which ${entries.filter((e) => e.loc.includes('/cities/')).length} city pages`)
console.log(`Languages: ${langs.join(', ')}; descriptions ${Math.min(...descLengths)}–${Math.max(...descLengths)} characters`)
for (const lang of langs) {
  const r = byLang(lang)
  console.log(`  ${lang}: ${r.filter((x) => x.status === 200).length}/${r.length} status 200, ${r.filter((x) => x.canonical).length} canonical, ${r.filter((x) => x.ogUrl).length} og:url, ${new Set(r.map((x) => x.description)).size} different descriptions, ${r.filter((x) => x.jsonLd.length).length} with JSON-LD`)
}
console.log('\n| path | title | desc | robots | JSON-LD |')
console.log('|---|---|---|---|---|')
for (const r of byLang(langs[0])) console.log(`| ${r.path} | ${r.title} | ${r.description.length} | ${r.robots || 'index'} | ${r.jsonLd.join(', ')} |`)
console.log('\nMust stay out of search engines:')
for (const h of hidden) console.log(`  ${h.ok ? 'ok ' : h.status === 404 ? '–  ' : 'NO '} ${h.path} → ${h.status}, robots "${h.robots}", canonical ${h.canonical || '–'}, in sitemap: ${h.inSitemap}`)
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ base, entries, rows, hidden, problems }, null, 2))
console.log(problems.length ? `\n${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join('\n')}` : '\nNo problems.')
process.exit(problems.length ? 1 : 0)
