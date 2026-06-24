import {
  fetchInvitableCommunitiesForUser,
  sendInviteOrRequestToJoin
} from '../utils/communities-promise-utils'
import {
  type CommunityListItem,
  getCommunityThumbnailUrl
} from './communities-types'
import { pushNotificationToast } from '../ui-classes/main-hud/notification-toast-stack'
import { resolvePlayerData } from '../utils/passport-promise-utils'

/** Minimal community shape needed to render and send an invite. */
export type InvitableCommunity = Pick<CommunityListItem, 'id' | 'name'>

/**
 * Returns the communities the current user can invite `targetAddress` into:
 * communities the caller owns/moderates where the target is NOT already a
 * member. Backed by `GET /members/{targetAddress}/invites`, which filters
 * server-side (so private communities the target already belongs to are
 * excluded too).
 *
 * Surfaces errors via `console.error` and returns `[]` on failure;
 * callsites render the "Invite to Community" UI conditionally on
 * `length > 0`, so a transient error simply hides the entry until the next
 * passport open.
 */
export async function fetchInvitableCommunities(
  targetAddress: string
): Promise<InvitableCommunity[]> {
  try {
    return await fetchInvitableCommunitiesForUser(targetAddress)
  } catch (error) {
    console.error('[community-invites] fetch failed', error)
    return []
  }
}

/**
 * Sends an invite to `targetAddress` for the given `community` and pushes
 * a "community_invite_sent" toast on success. Errors are logged; the
 * toast is the only user-visible confirmation either way (no error popup
 * — invites are low-stakes and the user can retry from the same UI).
 */
export async function inviteUserToCommunity(
  community: InvitableCommunity,
  targetAddress: string
): Promise<void> {
  try {
    await sendInviteOrRequestToJoin(community.id, targetAddress, 'invite')
    const playerData = await resolvePlayerData(targetAddress)
    const targetName = playerData.name

    pushNotificationToast({
      id: `community-invite-sent-${
        community.id
      }-${targetAddress}-${Date.now()}`,
      type: 'community_invite_sent',
      address: targetAddress,
      metadata: {
        communityId: community.id,
        communityName: community.name,
        targetAddress,
        targetName,
        image: getCommunityThumbnailUrl(community.id),
        description: `Invited <b>${targetName}</b> to <b>${community.name}</b>`
      },
      timestamp: String(Date.now()),
      read: false
    })
  } catch (error) {
    console.error('[community-invites] send failed', error)
  }
}
