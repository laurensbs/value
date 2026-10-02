import { z } from 'zod'

/** What the bulk screen sends back per dog: never the photo itself, so the request stays small. */
export const draftRowSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().max(60),
  sex: z.enum(['male', 'female']),
  ageYears: z.number().int().min(0).max(30).nullable(),
  size: z.enum(['small', 'medium', 'large']),
  energy: z.enum(['calm', 'medium', 'high']),
  level: z.enum(['starter', 'experienced']),
})

export type DraftRow = z.infer<typeof draftRowSchema>
export type DraftDog = DraftRow & { photo: string }
