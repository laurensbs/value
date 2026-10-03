import { permanentRedirect } from 'next/navigation'

/** The launch hub moved into the founder's hub; its checklist and contacts live on there. */
export default function LaunchMoved() {
  permanentRedirect('/hub')
}
