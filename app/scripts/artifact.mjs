// Turns the single-file build into a page fragment for a Claude Artifact:
// the artifact host adds its own <html>/<head>/<body>, so we keep only the
// title, styles, root element and inline script.
import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist-single/index.html', 'utf8')
const title = html.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '<title>Rondje</title>'
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0])
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0])
const fragment = [title, ...styles, '<div id="root"></div>', ...scripts].join('\n')
writeFileSync('dist-single/rondje.html', fragment)
console.log(`dist-single/rondje.html: ${(fragment.length / 1024).toFixed(0)} KB`)
