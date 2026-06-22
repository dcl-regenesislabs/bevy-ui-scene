import { executeTask } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { store } from '../state/store'
import { updateHudStateAction } from '../state/hud/actions'
import {
  fetchReceivedJoinRequests,
  fetchUserInviteRequests,
  invalidateUserInviteRequestsCache
} from '../utils/communities-promise-utils'
import { listenCommunitiesChanged } from './communities-events'
import { waitFor } from '../utils/dcl-utils'

/**
 * Recompute the pending community-requests count (invites received + requests
 * I sent + requests received to communities I manage) and store it so the HUD
 * communities icon can render a badge. Single source for both the HUD badge and
 * the communities-page sidebar badge.
 */
export async function refreshCommunityRequestsCount(): Promise<void> {
  invalidateUserInviteRequestsCache()
  const [invites, sent, received] = await Promise.all([
    fetchUserInviteRequests('invite'),
    fetchUserInviteRequests('request_to_join'),
    fetchReceivedJoinRequests()
  ])
  store.dispatch(
    updateHudStateAction({
      pendingCommunityRequests: invites.length + sent.length + received.length
    })
  )
}

let initialized = false

/**
 * Keep the HUD communities badge fresh: refresh once the player is ready, then
 * on every community change. (No realtime stream for incoming join-requests, so
 * the count also refreshes whenever the user acts on communities.)
 */
export function initCommunityRequestsCount(): void {
  if (initialized) return
  initialized = true

  const run = (): void => {
    refreshCommunityRequestsCount().catch((error) => {
      console.error('[communities] failed to refresh requests count', error)
    })
  }

  executeTask(async () => {
    await waitFor(() => !!getPlayer()?.userId)
    run()
  })
  listenCommunitiesChanged(run)
}
