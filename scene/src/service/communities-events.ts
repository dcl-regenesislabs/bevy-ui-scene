import { createMediator } from '../utils/function-utils'

const CHANNEL = 'communities-changed'
const mediator = createMediator()

/**
 * Emit a "something changed in my membership / pending requests" event so any
 * component currently rendering a list of communities can refresh its data
 * (catalog, my-communities sidebar, view popup, etc.).
 */
export function notifyCommunitiesChanged(): void {
  mediator.publish(CHANNEL)
}

/**
 * Subscribe to community membership/request changes. Returns an unsubscribe
 * function — call it from `useEffect` cleanup.
 */
export function listenCommunitiesChanged(fn: () => void): () => void {
  mediator.subscribe(CHANNEL, fn)
  return () => {
    mediator.unsubscribe(CHANNEL, fn)
  }
}
