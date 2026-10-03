import { redirect } from 'next/navigation'

/** Progress lives at /progress (linked from Today, reminders and celebrations). */
export default function ProfileProgressRedirect() {
  redirect('/progress')
}
