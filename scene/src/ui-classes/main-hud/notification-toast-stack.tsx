import { type Notification } from './notification-types'
import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { Column } from '../../components/layout'
import { NotificationItem } from './notification-renderer'
import { executeTask } from '@dcl/sdk/ecs'
import { getContentScaleRatio } from '../../service/canvas-ratio'
import { sleep } from '../../utils/dcl-utils'
import { fetchNotifications } from '../../utils/notifications-promise-utils'
import { BevyApi } from '../../bevy-api'
import { getPlayer } from '@dcl/sdk/src/players'
import { fetchProfileData } from '../../utils/passport-promise-utils'
import type { FriendshipEventUpdate } from '../../service/social-service-type'

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
  executeTask(async () => {
    const stream = await BevyApi.social.getFriendshipEventStream()
    for await (const event of stream) {
      if (
        event.type === 'request' ||
        event.type === 'accept' ||
        event.type === 'reject'
      ) {
        const notification = await buildFriendshipNotification(event)
        if (notification != null) {
          pushNotificationToast(notification)
        }
      }
    }
  })
}

async function buildFriendshipNotification(
  event: FriendshipEventUpdate
): Promise<Notification | null> {
  const myPlayer = getPlayer()
  const myAddress = myPlayer?.userId ?? ''
  const myName = myPlayer?.name ?? ''
  const myHasClaimedName = !(myName.includes('#') || myName.length === 0)

  if (event.type === 'request') {
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

  // accept or reject — resolve profile
  let name = event.address
  let hasClaimedName = false
  const profileImageUrl = ''

  const player = getPlayer({ userId: event.address })
  if (player?.name != null) {
    name = player.name
    hasClaimedName = name.length > 0 && !name.includes('#')
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

  const type =
    event.type === 'accept'
      ? 'social_service_friendship_accepted'
      : 'social_service_friendship_rejected'

  return {
    id: `friendship-${event.type}-${event.address}-${Date.now()}`,
    type,
    address: myAddress,
    metadata: {
      sender: {
        name,
        address: event.address,
        hasClaimedName,
        profileImageUrl
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
