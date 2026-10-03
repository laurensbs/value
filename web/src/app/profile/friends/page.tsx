import { redirect } from 'next/navigation'

/** The dogs you walked with are part of /progress. */
export default function ProfileFriendsRedirect() {
  redirect('/progress#friends-title')
}
