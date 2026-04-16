import { executeTask } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/src/players'
import { BevyApi } from '../bevy-api'
import { store } from '../state/store'
import {
  closeLastPopupAction,
  pushPopupAction,
  updateHudStateAction
} from '../state/hud/actions'
import { HUD_POPUP_TYPE } from '../state/hud/state'
import type {
  FriendConnectivityEvent,
  FriendStatusData,
  FriendshipEventUpdate
} from './social-service-type'
import { showErrorPopup } from './error-popup-service'
import { fetchProfileData } from '../utils/passport-promise-utils'
import { type FriendshipResultVariant } from '../components/friends/friendship-result-popup'
import { createMediator } from '../utils/function-utils'

const CHANNEL_CONNECTIVITY = 'friend-connectivity'
const CHANNEL_FRIENDSHIP = 'friendship-event'

const mediator = createMediator()

/** Subscribe to live connectivity changes. Returns an unsubscribe function. */
export function listenFriendConnectivity(
  fn: (event: FriendConnectivityEvent) => void
): () => void {
  mediator.subscribe(CHANNEL_CONNECTIVITY, fn)
  return () => {
    mediator.unsubscribe(CHANNEL_CONNECTIVITY, fn)
  }
}

/** Subscribe to friendship events (request / accept / reject / cancel / delete / block). */
export function listenFriendshipEvent(
  fn: (event: FriendshipEventUpdate) => void
): () => void {
  mediator.subscribe(CHANNEL_FRIENDSHIP, fn)
  return () => {
    mediator.unsubscribe(CHANNEL_FRIENDSHIP, fn)
  }
}

const FRIENDSHIP_POPUP_TYPES = new Set<HUD_POPUP_TYPE>([
  HUD_POPUP_TYPE.FRIEND_REQUEST_RECEIVED,
  HUD_POPUP_TYPE.FRIEND_REQUEST_SENT,
  HUD_POPUP_TYPE.SEND_FRIEND_REQUEST,
  HUD_POPUP_TYPE.CONFIRM_UNFRIEND,
  HUD_POPUP_TYPE.CANCEL_FRIEND_REQUEST,
  HUD_POPUP_TYPE.FRIENDSHIP_RESULT
])

const EVENT_TO_VARIANT: Record<string, FriendshipResultVariant> = {
  accept: 'accepted',
  reject: 'rejected',
  cancel: 'canceled'
}

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

function upsertFriend(entry: FriendStatusData): void {
  const target = normalizeAddress(entry.address)
  const prev = store.getState().hud.friends
  const updated = prev.filter((f) => normalizeAddress(f.address) !== target)
  updated.push(entry)
  store.dispatch(updateHudStateAction({ friends: updated }))
}

function removeFriend(address: string): void {
  const target = normalizeAddress(address)
  const prev = store.getState().hud.friends
  store.dispatch(
    updateHudStateAction({
      friends: prev.filter((f) => normalizeAddress(f.address) !== target)
    })
  )
}

async function refreshFriends(): Promise<void> {
  const friends = await BevyApi.social.getOnlineFriends()
  store.dispatch(updateHudStateAction({ friends, friendsLoading: false }))
}

function handleFriendshipResultEvent(event: FriendshipEventUpdate): void {
  const variant = EVENT_TO_VARIANT[event.type]
  if (variant == null) return

  // Close the top popup only if it belongs to this same user.
  // Otherwise an unrelated event (e.g. Bob cancels) would close a popup
  // the user has open about someone else (e.g. Alice's request).
  const popups = store.getState().hud.shownPopups
  const topPopup = popups[popups.length - 1]
  const topPopupAddress = (topPopup?.data as { address?: string } | undefined)
    ?.address
  if (
    topPopup != null &&
    FRIENDSHIP_POPUP_TYPES.has(topPopup.type) &&
    topPopupAddress != null &&
    topPopupAddress.toLowerCase() === event.address.toLowerCase()
  ) {
    store.dispatch(closeLastPopupAction())
  }

  executeTask(async () => {
    let name = event.address
    let hasClaimedName = false

    const player = getPlayer({ userId: event.address })
    if (player?.name != null) {
      name = player.name
      hasClaimedName = !!(name.length > 0 && !name.includes('#'))
    } else {
      const profile = await fetchProfileData({
        userId: event.address,
        useCache: true
      })
      if (profile?.avatars?.[0] != null) {
        name = profile.avatars[0].name ?? name
        hasClaimedName = profile.avatars[0].hasClaimedName ?? false
      }
    }

    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.FRIENDSHIP_RESULT,
        data: { variant, address: event.address, name, hasClaimedName }
      })
    )
  })
}

let initialized = false

/**
 * Subscribes once, for the lifetime of the app, to the Rust streams and
 * fans events out through the internal mediator. Also keeps `hud.friends`
 * in sync so components can render reactively without owning the stream.
 *
 * Components wanting to react to individual events should use
 * `listenFriendConnectivity()` / `listenFriendshipEvent()` and unsubscribe
 * on unmount.
 */
export function initFriendConnectivityService(): void {
  if (initialized) return
  initialized = true

  // Keep the friends list in sync with connectivity changes.
  listenFriendConnectivity(upsertFriend)

  // Keep the friends list in sync with friendship events + show result popups.
  listenFriendshipEvent((event) => {
    if (event.type === 'accept') {
      refreshFriends().catch((error) => {
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          'friend-connectivity:refreshOnAccept'
        )
      })
    } else if (event.type === 'delete' || event.type === 'block') {
      removeFriend(event.address)
    }
    handleFriendshipResultEvent(event)
  })

  executeTask(async () => {
    try {
      await refreshFriends()
    } catch (error) {
      showErrorPopup(
        error instanceof Error ? error : new Error(String(error)),
        'friend-connectivity:initialFetch'
      )
    }
  })

  executeTask(async () => {
    try {
      const stream = await BevyApi.social.getFriendConnectivityStream()
      for await (const event of stream) {
        console.log('[social] connectivity event', event)
        mediator.publish(CHANNEL_CONNECTIVITY, event)
      }
    } catch (error) {
      showErrorPopup(
        error instanceof Error ? error : new Error(String(error)),
        'friend-connectivity:connectivityStream'
      )
    }
  })

  executeTask(async () => {
    try {
      const stream = await BevyApi.social.getFriendshipEventStream()
      for await (const event of stream) {
        console.log('[social] friendship event', event)
        mediator.publish(CHANNEL_FRIENDSHIP, event)
      }
    } catch (error) {
      showErrorPopup(
        error instanceof Error ? error : new Error(String(error)),
        'friend-connectivity:friendshipStream'
      )
    }
  })
}
