/**
 * Pure, dependency-free relationship-status selector.
 *
 * The single source of truth for "what is my relationship with address X" is
 * derived from a snapshot of address sets (friends / pending requests / blocks)
 * owned by `friend-connectivity-service`. This module only computes the derived
 * status from that snapshot, so it can be unit-tested without importing the SDK.
 */

export type RelationshipStatus =
  | 'friend'
  | 'incoming'
  | 'outgoing'
  | 'blockedByMe'
  | 'blockedMe'
  | 'none'

export type RelationshipSnapshot = {
  /** Addresses I'm friends with (accepted). */
  friends: Set<string>
  /** Addresses that have a pending friend request TO me. */
  incoming: Set<string>
  /** Addresses I have a pending friend request to. */
  outgoing: Set<string>
  /** Addresses I have blocked. */
  blockedByMe: Set<string>
  /** Addresses that have blocked me. */
  blockedMe: Set<string>
}

function normalize(address: string): string {
  return address.toLowerCase()
}

/**
 * Resolve the relationship status for `address` from `snapshot`.
 *
 * Precedence matches `FriendButton`'s render branch order: a block in either
 * direction wins (the backend rejects every friendship action while a block
 * exists), with my own block first (it's the actionable "unblock" case); then
 * friend → incoming request → outgoing request → none.
 */
export function selectRelationshipStatus(
  address: string,
  snapshot: RelationshipSnapshot
): RelationshipStatus {
  const a = normalize(address)
  if (snapshot.blockedByMe.has(a)) return 'blockedByMe'
  if (snapshot.blockedMe.has(a)) return 'blockedMe'
  if (snapshot.friends.has(a)) return 'friend'
  if (snapshot.incoming.has(a)) return 'incoming'
  if (snapshot.outgoing.has(a)) return 'outgoing'
  return 'none'
}
