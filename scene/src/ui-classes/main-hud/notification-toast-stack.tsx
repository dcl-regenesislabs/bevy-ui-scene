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

export type NotificationToastStackState = {
  toasts: Notification[]
}

const state: NotificationToastStackState = {
  toasts: []
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
      await sleep(5000)

      if (
        state.toasts.length &&
        new Date(
          Number(state.toasts[state.toasts.length - 1].timestamp)
        ).getTime() +
          5000 <
          Date.now()
      ) {
        state.toasts.shift()
      }
      const lastNotification: Notification =
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
