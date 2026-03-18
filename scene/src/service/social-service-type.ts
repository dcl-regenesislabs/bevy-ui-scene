/**
 * Types aligned with bevy-explorer SystemApi / Deno ops.
 *
 * Rust sources:
 *  - FriendData        → crates/system_bridge/src/lib.rs
 *  - FriendRequestData → crates/system_bridge/src/lib.rs
 *  - FriendshipEventUpdate → crates/system_bridge/src/lib.rs
 */

export type NameColor = {
  r: number
  g: number
  b: number
}

/** Returned by getFriends(). Mirrors Rust `FriendData` (serde camelCase). */
export type FriendData = {
  address: string
  name: string
  hasClaimedName: boolean
  profilePictureUrl: string
  nameColor?: NameColor
}

/**
 * Returned by getSentFriendRequests() and getReceivedFriendRequests().
 * Mirrors Rust `FriendRequestData` (serde camelCase).
 */
export type FriendRequestData = {
  address: string
  name: string
  hasClaimedName: boolean
  profilePictureUrl: string
  createdAt: number
  message?: string
  id: string
}

/**
 * Real-time friendship event from the event stream.
 * Discriminated union on `type`. The "request" variant includes full profile data.
 */
export type FriendshipEventUpdate =
  | {
      type: 'request'
      address: string
      name: string
      hasClaimedName: boolean
      profilePictureUrl: string
      nameColor?: NameColor
      createdAt: number
      message?: string
      id: string
    }
  | { type: 'accept'; address: string }
  | { type: 'reject'; address: string }
  | { type: 'cancel'; address: string }
  | { type: 'delete'; address: string }
  | { type: 'block'; address: string }
