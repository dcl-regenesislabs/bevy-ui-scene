import { createMediator } from '../utils/function-utils'
import { type CommunityListItem } from './communities-types'

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

// --- Optimistic "just joined" overlay ----------------------------------------
//
// Joining a community (accepting an invite / request) is committed server-side
// before `GET /communities?onlyMemberOf` reflects it (read-replica lag), so a
// plain refetch can briefly omit it and "My Communities" looks unrefreshed.
// We keep the just-joined community in a short-lived overlay that the sidebar
// merges into its fetched list, dropping each entry as soon as an authoritative
// fetch returns it (reconciled) — or after a TTL safety, so a later leave can't
// resurrect it.

const OPTIMISTIC_JOIN_TTL_MS = 60_000
const optimisticJoined = new Map<
  string,
  { community: CommunityListItem; addedAt: number }
>()

/** Show `community` in "My Communities" immediately after joining. */
export function addOptimisticJoinedCommunity(
  community: CommunityListItem
): void {
  optimisticJoined.set(community.id, { community, addedAt: Date.now() })
  notifyCommunitiesChanged()
}

/** Drop a just-joined optimistic entry (e.g. on leave) so it can't reappear. */
export function removeOptimisticJoinedCommunity(communityId: string): void {
  if (optimisticJoined.delete(communityId)) {
    notifyCommunitiesChanged()
  }
}

/**
 * Merge optimistic just-joined communities into an authoritative fetch result.
 * Entries the fetch already includes (reconciled) or older than the TTL are
 * dropped; the rest are prepended so they show until the backend catches up.
 */
export function mergeOptimisticJoinedCommunities(
  fetched: CommunityListItem[]
): CommunityListItem[] {
  const fetchedIds = new Set(fetched.map((c) => c.id))
  const now = Date.now()
  for (const [id, entry] of optimisticJoined) {
    if (fetchedIds.has(id) || now - entry.addedAt > OPTIMISTIC_JOIN_TTL_MS) {
      optimisticJoined.delete(id)
    }
  }
  const extras = Array.from(optimisticJoined.values())
    .map((entry) => entry.community)
    .filter((community) => !fetchedIds.has(community.id))
  return [...extras, ...fetched]
}
