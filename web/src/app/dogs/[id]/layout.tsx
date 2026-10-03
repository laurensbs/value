import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { dogExists } from '@/server/queries'

/**
 * loading.tsx starts the response before the page is done, and a 404 can't be sent after that. So an
 * address without a dog answers 404 here first, with one quick lookup; the page does the rest.
 */
export default async function DogLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!(await dogExists(id))) notFound()
  return children
}
