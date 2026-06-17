import {
  type FriendshipNotification,
  isEventNotification,
  isFriendshipNotification,
  isItemNotification,
  isRewardNotification,
  type Notification,
  type UserProfile
} from './notification-types'
import type { FriendRequestData } from '../../service/social-service-type'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import {
  COLOR,
  RARITY_COLORS,
  RARITY_HEX_COLORS
} from '../../components/color-palette'
import Icon from '../../components/icon/Icon'
import { type Color4 } from '@dcl/sdk/math'
import { type AtlasIcon } from '../../utils/definitions'
import { AvatarCircle } from '../../components/avatar-circle'
import { getAddressColor } from './chat-and-logs/ColorByAddress'
import { rgbToHex } from '../../utils/ui-utils'
import { type RarityName } from '../../utils/item-definitions'
import { ImageCircle } from '../../components/image-circle'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { executeTask } from '@dcl/sdk/ecs'
import { BevyApi } from '../../bevy-api'
import { showErrorPopup } from '../../service/error-popup-service'
import useState = ReactEcs.useState
import { closeLastPopupAction, pushPopupAction } from '../../state/hud/actions'
import { store } from '../../state/store'
import { HUD_POPUP_TYPE } from '../../state/hud/state'
import { getFontSize } from '../../service/fontsize-system'

export function NotificationItem({
  notification,
  uiTransform,
  onDismiss
}: {
  notification: Notification
  key?: any
  uiTransform?: UiTransformProps
  onDismiss?: () => void
}): ReactElement | null {
  const [loading, setLoading] = useState(false)
  const fontSize = getFontSize({})
  return (
    <UiEntity
      uiTransform={{
        height: fontSize * 6,
        width: fontSize * 21,
        borderWidth: 0,
        borderColor: COLOR.WHITE,
        borderRadius: fontSize / 2,
        flexShrink: 0,
        margin: { bottom: '2%', left: '2%' },
        flexDirection: 'row',
        alignItems: 'center',
        padding: { left: '2%' },
        ...uiTransform
      }}
      uiBackground={{ color: COLOR.NOTIFICATION_ITEM }}
      onMouseDown={() => {
        if (loading) return
        setLoading(true)
        if (notification.type.indexOf('events') === 0) {
          executeTask(async () => {
            try {
              // Parse eventId properly: the metadata link can carry extra
              // query params (e.g. `?id=<uuid>&position=-150,95`), so a
              // naive prefix strip leaves them glued to the id and the
              // events API rejects the malformed URL with 400.
              const link = notification.metadata.link as string | undefined
              let eventId: string | undefined = notification.metadata.eventId
              if (eventId == null && link != null) {
                const queryIdx = link.indexOf('?')
                if (queryIdx !== -1) {
                  const idParam = link
                    .slice(queryIdx + 1)
                    .split('&')
                    .find((p) => p.startsWith('id='))
                  if (idParam != null) {
                    eventId = decodeURIComponent(idParam.slice(3))
                  }
                }
              }
              if (eventId == null) return
              store.dispatch(closeLastPopupAction())
              const responseEvent = await BevyApi.kernelFetch({
                url: `https://events.decentraland.org/api/events/${eventId}`
              })

              if (!responseEvent.ok) {
                showErrorPopup(
                  new Error(
                    `httpError ${responseEvent.status} ${
                      responseEvent.statusText || responseEvent.body
                    }`
                  ),
                  `BevyApi.kernelFetch notification event ${eventId}`
                )
              } else {
                const { data: event } = JSON.parse(responseEvent.body)
                // Open the event detail popup (with REMIND ME / JUMP IN
                // actions) instead of the place sceneCard side panel — the
                // notification is about an EVENT, not the underlying place.
                store.dispatch(
                  pushPopupAction({
                    type: HUD_POPUP_TYPE.COMMUNITY_EVENT_INFO,
                    data: event
                  })
                )
              }
            } finally {
              setLoading(false)
            }
          })
        } else if (isFriendshipNotification(notification)) {
          handleFriendshipNotificationClick(
            notification as FriendshipNotification
          )
          setLoading(false)
        } else if (notification.type === 'community_invite_received') {
          const communityId = notification.metadata.communityId
          if (communityId != null) {
            // Close the menu / dismiss the toast AND open the community popup
            // immediately. The popup itself fetches the full community and
            // shows a loading placeholder meanwhile (needsFetch), so the
            // click feels instant.
            store.dispatch(closeLastPopupAction())
            store.dispatch(
              pushPopupAction({
                type: HUD_POPUP_TYPE.COMMUNITY_VIEW,
                data: {
                  id: communityId,
                  name: notification.metadata.communityName ?? '',
                  thumbnailUrl: notification.metadata.thumbnailUrl ?? '',
                  needsFetch: true
                }
              })
            )
          }
          setLoading(false)
        } else if (notification.metadata.link) {
          store.dispatch(closeLastPopupAction())
          store.dispatch(
            pushPopupAction({
              type: HUD_POPUP_TYPE.URL,
              data: notification.metadata.link
            })
          )
          setLoading(false)
        }
        onDismiss?.()
        // TODO handle events to offer EventInfoCard or Teleport
        console.log('notification', notification)
      }}
    >
      <NotificationThumbnail notification={notification} />
      <UiEntity
        uiTransform={{
          flexDirection: 'column',
          width: '80%',
          height: '100%',
          alignItems: 'flex-start',
          justifyContent: 'center',
          alignSelf: 'flex-start',
          margin: { left: '3%' }
        }}
      >
        <UiEntity
          uiTransform={{
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            width: '100%',
            margin: 0,
            padding: 0
          }}
          uiText={{
            value: `<b>${getTitleFromNotification(notification)}</b>`,
            textAlign: 'top-left',
            fontSize
          }}
        />
        <UiEntity
          uiTransform={{
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            width: '100%',
            margin: { top: -fontSize }
          }}
          uiText={{
            value: getDescriptionFromNotification(notification),
            textAlign: 'top-left',
            fontSize
          }}
        />
        <UiEntity
          uiTransform={{
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            width: '100%',
            margin: { top: -fontSize }
          }}
          uiText={{
            value: formatTimeAgoFromTimestamp(notification.timestamp),
            textAlign: 'top-left',
            fontSize,
            color: COLOR.TEXT_COLOR_LIGHT_GREY
          }}
        />
      </UiEntity>
      {!notification.read && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { right: '2%' },
            width: fontSize * 0.6,
            height: fontSize * 0.6,
            borderColor: COLOR.BLACK_TRANSPARENT,
            borderWidth: 0,
            borderRadius: 9999
          }}
          uiBackground={{
            color: COLOR.RED
          }}
        />
      )}
    </UiEntity>
  )
}

function NotificationIcon({
  notification
}: {
  notification: Notification
}): ReactElement {
  const fontSize = getFontSize({})
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { right: '-10%', bottom: '-15%' },
        borderRadius: 9999,
        borderWidth: fontSize * 0.3,
        borderColor: COLOR.TEXT_COLOR,
        width: fontSize * 2,
        height: fontSize * 2,
        alignItems: 'center',
        justifyContent: 'center'
      }}
      uiBackground={{
        color: getColorForNotificationType(notification)
      }}
    >
      <Icon
        uiTransform={{
          flexShrink: 0
        }}
        icon={getIconForNotificationType(notification)}
        iconSize={fontSize}
      />
    </UiEntity>
  )
}

function getTitleFromNotification(notification: Notification): string {
  switch (notification.type) {
    case 'credits_reminder_do_not_miss_out':
      return 'Don’t miss your credits!'
    case 'events_started':
      return notification.metadata?.title ?? 'Event started'
    case 'events_starts_soon':
      return notification.metadata?.title ?? 'Event starts soon'
    case 'social_service_friendship_accepted':
      return 'Friend request accepted'
    case 'social_service_friendship_request':
      return 'Friend request received'
    case 'social_service_friendship_rejected':
      return 'Friend request rejected'
    case 'community_invite_sent':
      return 'Invitation sent'
    case 'community_invite_received':
      return 'Community invite'
    case 'user_blocked':
      return 'User blocked'
    case 'user_unblocked':
      return 'User unblocked'
    case 'item_sold':
      return 'Item sold'
    default:
      return ''
  }
}

function getDescriptionFromNotification(notification: Notification): string {
  if (isFriendshipNotification(notification as FriendshipNotification)) {
    const protagonist = getFriendshipNotificationProtagonist(
      notification as FriendshipNotification
    )
    const hexColor = rgbToHex(getAddressColor(protagonist.address))
    if (notification.type === 'social_service_friendship_accepted') {
      return `<color=${hexColor}>${protagonist.name}</color> accepted your friend request.`
    } else if (notification.type === 'social_service_friendship_request') {
      return `<color=${hexColor}>${protagonist.name}</color> wants to be your friend.`
    } else if (notification.type === 'social_service_friendship_rejected') {
      return `<color=${hexColor}>${protagonist.name}</color> rejected your friend request.`
    }
  }

  if (notification.type === 'community_invite_received') {
    const name = notification.metadata.communityName ?? 'a community'
    return `You've been invited to join <b>${name}</b>.`
  }

  if (notification.metadata?.nftName || notification.metadata?.tokenName) {
    const nftName =
      notification.metadata.nftName ?? notification.metadata.tokenName
    const rarity =
      notification.metadata.rarity ?? notification.metadata.tokenRarity
    return (
      notification.metadata.description.replace(
        nftName,
        `<color=${RARITY_HEX_COLORS[rarity as RarityName]}>${nftName}<color/>`
      ) ?? ''
    )
  }
  return notification.metadata.description ?? ''
}

function getColorForNotificationType(notification: Notification): Color4 {
  if (isFriendshipNotification(notification as FriendshipNotification)) {
    return COLOR.NOTIFICATION_FRIEND
  }

  if (
    notification.type === 'user_blocked' ||
    notification.type === 'user_unblocked'
  ) {
    return COLOR.NOTIFICATION_FRIEND
  }

  if (isEventNotification(notification)) {
    return COLOR.NOTIFICATION_EVENT
  }

  if (notification.type === 'badges_awarded') {
    return COLOR.NOTIFICATION_BADGE
  }

  return COLOR.NOTIFICATION_GIFT
}

function getIconForNotificationType(notification: Notification): AtlasIcon {
  const { type } = notification
  if (type === 'wearables_drop') {
    return {
      spriteName: 'GiftIcn',
      atlasName: 'icons'
    }
  }
  if (isFriendshipNotification(notification as FriendshipNotification)) {
    return {
      spriteName: 'Members',
      atlasName: 'icons'
    }
  }
  if (type === 'user_blocked' || type === 'user_unblocked') {
    return {
      spriteName: 'BlockUser',
      atlasName: 'icons'
    }
  }
  if (
    type === 'community_invite_sent' ||
    type === 'community_invite_received'
  ) {
    return {
      spriteName: 'Community',
      atlasName: 'icons'
    }
  }
  if (type === 'badges_awarded') {
    return {
      spriteName: 'StarSolid',
      atlasName: 'icons'
    }
  }
  if (isEventNotification(notification)) {
    return {
      spriteName: 'PublishIcon',

      atlasName: 'icons'
    }
  }
  return {
    spriteName: 'GiftIcn',
    atlasName: 'icons'
  }
}

function NotificationThumbnail({
  notification
}: {
  notification: Notification
}): ReactElement {
  const fontSize = getFontSize({})
  return (
    <UiEntity
      uiTransform={{
        height: fontSize * 5,
        width: fontSize * 5, // TODO if its friendship notification to show avatarCircle, use 5, otherwise use 6
        borderColor: COLOR.BLACK_TRANSPARENT,
        borderWidth: 0,
        borderRadius: fontSize / 2,
        flexShrink: 0,
        flexGrow: 0
      }}
    >
      <NotificationThumbnailContent notification={notification} />
    </UiEntity>
  )
}

function NotificationThumbnailContent({
  notification
}: {
  notification: Notification
}): ReactElement {
  if (isItemNotification(notification) || isRewardNotification(notification)) {
    return <ItemNotificationThumbnail notification={notification} />
  }
  if (isFriendshipNotification(notification))
    return (
      <FriendshipNotificationThumbnail
        notification={notification as FriendshipNotification}
      />
    )
  if (
    notification.type === 'user_blocked' ||
    notification.type === 'user_unblocked'
  ) {
    return (
      <UiEntity uiTransform={{ width: '100%', height: '100%' }}>
        <AvatarCircle
          userId={notification.metadata.targetAddress}
          circleColor={getAddressColor(notification.metadata.targetAddress)}
          uiTransform={{ width: '100%', height: '100%' }}
          isGuest={false}
        />
        <NotificationIcon notification={notification} />
      </UiEntity>
    )
  }
  return <GenericNotificationThumbnail notification={notification} />
}

function GenericNotificationThumbnail({
  notification
}: {
  notification: Notification
}): ReactElement {
  // `community_invite_received` carries the community art in `thumbnailUrl`
  // (per @dcl/schemas), not `image` like other feed notifications.
  const imageSrc =
    notification.metadata.image ?? notification.metadata.thumbnailUrl
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        width: '100%',
        height: '83%'
      }}
      uiBackground={
        imageSrc
          ? {
              textureMode: 'stretch',
              texture: {
                src: imageSrc
              }
            }
          : {
              color: COLOR.WHITE_OPACITY_1
            }
      }
    >
      <NotificationIcon notification={notification} />
    </UiEntity>
  )
}

function ItemNotificationThumbnail({
  notification
}: {
  notification: Notification
}): ReactElement {
  const rarity: RarityName =
    notification.metadata.rarity ?? notification.metadata.tokenRarity
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%'
      }}
    >
      <ImageCircle
        image={notification.metadata.image ?? notification.metadata.tokenImage}
        circleColor={RARITY_COLORS[rarity] ?? COLOR.BLACK_TRANSPARENT}
        uiTransform={{ width: '100%', height: '100%' }}
      />
    </UiEntity>
  )
}
function FriendshipNotificationThumbnail({
  notification
}: {
  notification: FriendshipNotification
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%'
      }}
    >
      <AvatarCircle
        userId={getFriendshipNotificationProtagonist(notification).address}
        circleColor={getAddressColor(
          getFriendshipNotificationProtagonist(notification).address
        )}
        uiTransform={{
          width: '100%',
          height: '100%'
        }}
        isGuest={false}
      />
      <NotificationIcon notification={notification} />
    </UiEntity>
  )
}

export function getFriendshipNotificationProtagonist(
  notification: FriendshipNotification
): UserProfile {
  const sender = notification.metadata.sender
  const receiver = notification.metadata.receiver
  const me = notification.address.toLowerCase()

  return sender.address.toLowerCase() === me ? receiver : sender
}

function handleFriendshipNotificationClick(
  notification: FriendshipNotification
): void {
  const protagonist = getFriendshipNotificationProtagonist(notification)

  if (notification.type === 'social_service_friendship_request') {
    executeTask(async () => {
      // The request may already be resolved (accepted/rejected from the
      // friends panel, a profile, or another session). Accepting twice
      // fails, so only open the accept popup while the request is still
      // pending — otherwise the click just dismisses the notification.
      const pending = await BevyApi.social.getReceivedFriendRequests()
      const stillPending = pending.some(
        (r) => r.address.toLowerCase() === protagonist.address.toLowerCase()
      )
      if (!stillPending) return

      const requestData: FriendRequestData = {
        address: protagonist.address,
        name: protagonist.name,
        hasClaimedName: protagonist.hasClaimedName,
        profilePictureUrl: protagonist.profileImageUrl,
        createdAt: Number(notification.timestamp),
        id: notification.metadata.requestId,
        message: notification.metadata.message
      }
      store.dispatch(
        pushPopupAction({
          type: HUD_POPUP_TYPE.FRIEND_REQUEST_RECEIVED,
          data: requestData
        })
      )
    })
  } else {
    const variant =
      notification.type === 'social_service_friendship_accepted'
        ? 'accepted'
        : 'rejected'
    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.FRIENDSHIP_RESULT,
        data: {
          variant,
          address: protagonist.address,
          name: protagonist.name,
          hasClaimedName: protagonist.hasClaimedName
        }
      })
    )
  }
}

export function formatTimeAgoFromTimestamp(timestamp: string): string {
  const now = new Date()

  const past = new Date(Number(timestamp))

  const diffMs = now.getTime() - past.getTime()

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) {
    return 'just now'
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  } else if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''} ago`
  } else if (weeks < 5) {
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`
  } else if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''} ago`
  } else {
    return `${years} year${years !== 1 ? 's' : ''} ago`
  }
}
