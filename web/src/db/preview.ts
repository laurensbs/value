/**
 * Vercel previews use the production database unless previews get their own (for example a Neon
 * branch per preview). A preview must never change that database's schema, so it only migrates
 * when PREVIEW_MIGRATIONS=1 is set for the Preview environment, which you do once previews have
 * their own database. Production, local development and tests always migrate.
 */
export function shouldMigrate(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL_ENV !== 'preview' || env.PREVIEW_MIGRATIONS === '1'
}
