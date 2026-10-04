import localFont from 'next/font/local'

// Served by Next.js itself: preloaded with the page, and with a fallback font tuned to the same
// size, so text does not jump when the real font arrives. Like @fontsource, each face comes in two
// parts: the Latin set for Dutch, English, Spanish and French, and the extended set (ş, ğ, ł, ő ...)
// that only downloads when a page shows such a letter, say in a name like Ayşe. The extended part
// joins the family Next.js names after the variable ('bodyFont'); should that naming ever change,
// those letters fall back to the system font and nothing else moves. next/font needs literal
// values, hence the repeated ranges.

export const bodyFont = localFont({
  src: '../../node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2',
  weight: '300 900',
  variable: '--font-figtree',
  declarations: [
    { prop: 'unicode-range', value: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
  ],
})

export const bodyFontExtended = localFont({
  src: '../../node_modules/@fontsource-variable/figtree/files/figtree-latin-ext-wght-normal.woff2',
  weight: '300 900',
  variable: '--font-figtree-extended',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'bodyFont' },
    { prop: 'unicode-range', value: 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF' },
  ],
})

export const displayFont = localFont({
  src: '../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
  weight: '200 800',
  variable: '--font-bricolage',
  declarations: [
    { prop: 'unicode-range', value: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
  ],
})

export const displayFontExtended = localFont({
  src: '../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-ext-wght-normal.woff2',
  weight: '200 800',
  variable: '--font-bricolage-extended',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'font-family', value: 'displayFont' },
    { prop: 'unicode-range', value: 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF' },
  ],
})

/** Only for a few handwritten touches: loaded when a page uses it, not with every page. */
export const handFont = localFont({
  src: '../../node_modules/@fontsource/caveat/files/caveat-latin-600-normal.woff2',
  weight: '600',
  variable: '--font-caveat',
  preload: false,
})

/** All font classes for <html>: the extended parts are listed so their faces always ship. */
export const fontVariables = [bodyFont, bodyFontExtended, displayFont, displayFontExtended, handFont].map((f) => f.variable).join(' ')
