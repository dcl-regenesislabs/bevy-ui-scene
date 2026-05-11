import { executeTask } from '@dcl/sdk/ecs'
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
import { resolvePlayerData } from '../utils/passport-promise-utils'
import { type FriendshipResultVariant } from '../components/friends/friendship-result-popup'
import { createMediator } from '../utils/function-utils'
import { sleep } from '../utils/dcl-utils'
import { pushNotificationToast } from '../ui-classes/main-hud/notification-toast-stack'
import type { Notification } from '../ui-classes/main-hud/notification-types'
import { getPlayer } from '@dcl/sdk/src/players'

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
  HUD_POPUP_TYPE.FRIENDSHIP_RESULT
])

/**
 * True for popups that "belong" to a friendship flow with a specific
 * counterpart — used to auto-close when an unrelated friendship event
 * arrives. Covers the legacy dedicated popups above as well as the new
 * generic CONFIRM popup tagged `category: 'friendship'`.
 */
function isFriendshipPopupForAddress(
  popup: { type: HUD_POPUP_TYPE; data?: unknown } | undefined,
  address: string
): boolean {
  if (popup == null) return false
  const target = address.toLowerCase()
  const popupAddress = (popup.data as { address?: string } | undefined)?.address
  if (popupAddress == null) return false
  if (popupAddress.toLowerCase() !== target) return false
  if (FRIENDSHIP_POPUP_TYPES.has(popup.type)) return true
  if (popup.type === HUD_POPUP_TYPE.CONFIRM) {
    return (
      (popup.data as { category?: string } | undefined)?.category ===
      'friendship'
    )
  }
  return false
}

const EVENT_TO_VARIANT: Record<string, FriendshipResultVariant> = {
  accept: 'accepted',
  reject: 'rejected',
  cancel: 'canceled'
}

/**
 * Tracks friendship actions WE initiated locally (e.g. clicking "Accept"),
 * so when the matching stream event echoes back we know it was our own
 * action and show the result popup. Events not in this set arrived from
 * the other party — those surface as a toast notification instead, to
 * avoid interrupting the user with a modal popup for someone else's action.
 */
const selfInitiatedFriendshipActions = new Set<string>()

function selfInitiatedKey(type: string, address: string): string {
  return `${type}:${address.toLowerCase()}`
}

export function markSelfInitiatedFriendshipAction(
  type: 'accept' | 'reject' | 'cancel' | 'delete' | 'block',
  address: string
): void {
  selfInitiatedFriendshipActions.add(selfInitiatedKey(type, address))
}

function consumeSelfInitiatedFriendshipAction(
  type: string,
  address: string
): boolean {
  const key = selfInitiatedKey(type, address)
  if (selfInitiatedFriendshipActions.has(key)) {
    selfInitiatedFriendshipActions.delete(key)
    return true
  }
  return false
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

/**
 * Wait for the bevy-side social client to finish its initial sync. Without
 * this, an early `getOnlineFriends()` call returns an empty list and the
 * scene never re-fetches — offline friends in particular would be missing
 * because the connectivity stream only emits transitions, not the initial
 * offline state.
 */
async function waitForSocialReady(timeoutMs = 10_000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      if (await BevyApi.social.getSocialInitialized()) return true
    } catch {
      // ignore — keep polling until timeout
    }
    await sleep(250)
  }
  return false
}

async function refreshFriends(): Promise<void> {
  const friends = await BevyApi.social.getOnlineFriends()
  store.dispatch(updateHudStateAction({ friends, friendsLoading: false }))
}

function handleFriendshipResultEvent(event: FriendshipEventUpdate): void {
  const variant = EVENT_TO_VARIANT[event.type]
  if (variant == null) return

  const popups = store.getState().hud.shownPopups
  const topPopup = popups[popups.length - 1]

  const isSelfInitiated = consumeSelfInitiatedFriendshipAction(
    event.type,
    event.address
  )

  // Optimistic UX: some callsites push a FRIENDSHIP_RESULT popup
  // immediately (without waiting for the stream echo). When that event
  // finally arrives, the popup is already on screen — don't close and
  // re-open it (would cause a flicker). Just consume the mark and bail.
  const topPopupAddress = (
    topPopup?.data as { address?: string } | undefined
  )?.address
  if (
    isSelfInitiated &&
    topPopup?.type === HUD_POPUP_TYPE.FRIENDSHIP_RESULT &&
    topPopupAddress?.toLowerCase() === event.address.toLowerCase()
  ) {
    return
  }

  // Close the top popup only if it belongs to this same user.
  // Otherwise an unrelated event (e.g. Bob cancels) would close a popup
  // the user has open about someone else (e.g. Alice's request).
  if (isFriendshipPopupForAddress(topPopup, event.address)) {
    store.dispatch(closeLastPopupAction())
  }

  executeTask(async () => {
    const { name, hasClaimedName } = await resolvePlayerData(event.address)
    if (isSelfInitiated) {
      store.dispatch(
        pushPopupAction({
          type: HUD_POPUP_TYPE.FRIENDSHIP_RESULT,
          data: { variant, address: event.address, name, hasClaimedName }
        })
      )
      return
    }
    // Event arrived from the other avatar — surface as a toast instead of
    // a modal popup, so it doesn't interrupt whatever the user is doing.
    // Only accept/reject have a renderable notification type; cancel from
    // the other side is silently dropped (popup already closed above).
    const toast = buildFriendshipResultNotification(
      event.type,
      event.address,
      name,
      hasClaimedName
    )
    if (toast == null) return
    pushNotificationToast(toast)
    // Bump the bell badge optimistically, same as for incoming requests.
    const current = store.getState().hud.unreadNotifications
    store.dispatch(updateHudStateAction({ unreadNotifications: current + 1 }))
  })
}

function buildFriendshipResultNotification(
  eventType: FriendshipEventUpdate['type'],
  address: string,
  name: string,
  hasClaimedName: boolean
): Notification | null {
  let toastType:
    | 'social_service_friendship_accepted'
    | 'social_service_friendship_rejected'
  if (eventType === 'accept') {
    toastType = 'social_service_friendship_accepted'
  } else if (eventType === 'reject') {
    toastType = 'social_service_friendship_rejected'
  } else {
    return null
  }
  const myPlayer = getPlayer()
  const myAddress = myPlayer?.userId ?? ''
  const myName = myPlayer?.name ?? ''
  const myHasClaimedName = !(myName.includes('#') || myName.length === 0)
  return {
    id: `friendship-${eventType}-${address}-${Date.now()}`,
    type: toastType,
    address: myAddress,
    metadata: {
      sender: {
        name,
        address,
        hasClaimedName,
        profileImageUrl: ''
      },
      receiver: {
        name: myName,
        address: myAddress,
        hasClaimedName: myHasClaimedName,
        profileImageUrl: ''
      },
      requestId: ''
    },
    timestamp: String(Date.now()),
    read: false
  }
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
      await waitForSocialReady()
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
