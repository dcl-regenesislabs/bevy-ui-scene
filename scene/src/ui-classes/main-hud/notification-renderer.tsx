import {
  type FriendshipNotification,
  isEventNotification,
  isFriendshipNotification,
  isItemNotification,
  isRewardNotification,
  type Notification,
  type UserProfile
} from './notification-types'
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
import { fetchPlaceFromApi } from '../../utils/promise-utils'
import { getUiController } from '../../controllers/ui.controller'
import useState = ReactEcs.useState
import { closeLastPopupAction, pushPopupAction } from '../../state/hud/actions'
import { store } from '../../state/store'
import { HUD_POPUP_TYPE } from '../../state/hud/state'
import { getFontSize } from '../../service/fontsize-system'

export function NotificationItem({
  notification,
  uiTransform
}: {
  notification: Notification
  key?: any
  uiTransform?: UiTransformProps
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
            const eventId =
              notification.metadata.eventId ??
              notification.metadata.link.replace(
                'https://decentraland.org/jump/events?id=',
                ''
              )
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
              const { data } = JSON.parse(responseEvent.body)
              const placeId = data.place_id

              if (placeId) {
                const place = await fetchPlaceFromApi(placeId)

                getUiController()
                  .sceneCard.showByData(place)
                  .catch(console.error)
              }
            }
          })
        } else if (notification.metadata.link) {
          store.dispatch(closeLastPopupAction())
          store.dispatch(
            pushPopupAction({
              type: HUD_POPUP_TYPE.URL,
              data: notification.metadata.link
            })
          )
        }
        setLoading(false)
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
    }
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
        width: fontSize * 6,
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
  return <GenericNotificationThumbnail notification={notification} />
}

function GenericNotificationThumbnail({
  notification
}: {
  notification: Notification
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        width: '100%',
        height: '100%'
      }}
      uiBackground={
        notification.metadata.image
          ? {
              textureMode: 'stretch',
              texture: {
                src: notification.metadata.image
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
