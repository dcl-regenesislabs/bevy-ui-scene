import { type Notification } from './notification-types'
import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { Column } from '../../components/layout'
import { NotificationItem } from './notification-renderer'
import { executeTask } from '@dcl/sdk/ecs'
import { getContentScaleRatio } from '../../service/canvas-ratio'
import { sleep } from '../../utils/dcl-utils'
import { fetchNotifications } from '../../utils/notifications-promise-utils'
import { getPlayer } from '@dcl/sdk/src/players'
import type { FriendshipEventUpdate } from '../../service/social-service-type'
import { listenFriendshipEvent } from '../../service/friend-connectivity-service'
import { store } from '../../state/store'
import { updateHudStateAction } from '../../state/hud/actions'

export type NotificationToastStackState = {
  toasts: Notification[]
}

const state: NotificationToastStackState = {
  toasts: []
}

const AUTO_DISMISS_MS = 10000
const FRIEND_REQUEST_DISMISS_MS = 20000
const AUTO_DISMISS_POLL_MS = 500
const FETCH_POLL_MS = 5000

function getDismissBudget(notification: Notification): number {
  if (notification.type === 'social_service_friendship_request') {
    return FRIEND_REQUEST_DISMISS_MS
  }
  return AUTO_DISMISS_MS
}

export function NotificationToastStack(): ReactElement | null {
  return (
    <Column
      uiTransform={{
        positionType: 'absolute',
        position: { left: '38%' },
        width: getContentScaleRatio() * 900
      }}
    >
      {state.toasts.map((notification) => {
        return (
          <NotificationItem
            uiTransform={{
              width: '100%',
              margin: { top: getContentScaleRatio() * 10 }
            }}
            notification={notification}
            key={notification.id}
            onDismiss={() => {
              removeToast(notification.id)
            }}
          />
        )
      })}
    </Column>
  )
}
export function initRealTimeNotifications(): void {
  executeTask(async (): Promise<never> => {
    while (true) {
      await sleep(AUTO_DISMISS_POLL_MS)
      if (state.toasts.length === 0) continue
      const now = Date.now()
      state.toasts = state.toasts.filter(
        (t) => (t.localTimestamp ?? now) + getDismissBudget(t) > now
      )
    }
  })

  executeTask(async (): Promise<never> => {
    while (true) {
      await sleep(FETCH_POLL_MS)
      const lastNotification: Notification | undefined =
        state.toasts[state.toasts.length - 1]
      const [nextNotification] = await fetchNotifications({
        limit: 1,
        from: Number(lastNotification?.timestamp ?? Date.now()) + 1
      })
      if (nextNotification !== undefined) {
        pushNotificationToast(nextNotification)
      }
    }
  })
}

function removeToast(id: string): void {
  state.toasts = state.toasts.filter((t) => t.id !== id)
}

export function pushNotificationToast(notification: Notification): void {
  state.toasts.push({
    ...notification,
    localTimestamp: Date.now()
  })
}

export function initFriendshipEventToasts(): void {
  listenFriendshipEvent((event) => {
    if (event.type === 'request') {
      pushNotificationToast(buildFriendRequestNotification(event))
      // Optimistically bump the unread-notifications badge so the bell
      // reflects the new request immediately, without waiting for the
      // next backend poll (~20s). Opening the notifications panel will
      // reset the count via the existing `markAllRead` path.
      const current = store.getState().hud.unreadNotifications
      store.dispatch(updateHudStateAction({ unreadNotifications: current + 1 }))
    }
  })
}

function buildFriendRequestNotification(
  event: FriendshipEventUpdate & { type: 'request' }
): Notification {
  const myPlayer = getPlayer()
  const myAddress = myPlayer?.userId ?? ''
  const myName = myPlayer?.name ?? ''
  const myHasClaimedName = !(myName.includes('#') || myName.length === 0)

  return {
    id: event.id,
    type: 'social_service_friendship_request',
    address: myAddress,
    metadata: {
      sender: {
        name: event.name,
        address: event.address,
        hasClaimedName: event.hasClaimedName,
        profileImageUrl: event.profilePictureUrl
      },
      receiver: {
        name: myName,
        address: myAddress,
        hasClaimedName: myHasClaimedName,
        profileImageUrl: ''
      },
      requestId: event.id
    },
    timestamp: String(event.createdAt),
    read: false
  }
}
