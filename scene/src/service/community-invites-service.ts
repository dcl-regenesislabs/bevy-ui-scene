import {
  fetchMyCommunities,
  sendInviteOrRequestToJoin
} from '../utils/communities-promise-utils'
import { type CommunityListItem } from './communities-types'
import { pushNotificationToast } from '../ui-classes/main-hud/notification-toast-stack'

/**
 * Returns the communities the current user can invite OTHER users into —
 * those where their role is `owner` or `moderator`. Backed by the same
 * `fetchMyCommunities` REST call used by the My Communities tab.
 *
 * Surfaces errors via `console.error` and returns `[]` on failure;
 * callsites typically render the "Invite to Community" UI conditionally on
 * `length > 0` so a transient error simply hides the entry until next
 * passport open.
 */
export async function fetchInvitableCommunities(): Promise<
  CommunityListItem[]
> {
  try {
    const { results } = await fetchMyCommunities(0, 50)
    return (results ?? []).filter(
      (c) => c.role === 'owner' || c.role === 'moderator'
    )
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
  community: CommunityListItem,
  targetAddress: string
): Promise<void> {
  try {
    await sendInviteOrRequestToJoin(community.id, targetAddress, 'invite')
    pushNotificationToast({
      id: `community-invite-sent-${community.id}-${targetAddress}-${Date.now()}`,
      type: 'community_invite_sent',
      address: targetAddress,
      metadata: {
        communityId: community.id,
        communityName: community.name,
        targetAddress,
        description: `to ${community.name}`
      },
      timestamp: String(Date.now()),
      read: false
    })
  } catch (error) {
    console.error('[community-invites] send failed', error)
  }
}
