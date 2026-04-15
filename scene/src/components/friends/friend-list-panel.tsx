import { getFontSize } from '../../service/fontsize-system'
import ReactEcs from '@dcl/react-ecs'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect
import {
  type FriendshipEventUpdate,
  type FriendStatusData
} from '../../service/social-service-type'
import { Column } from '../layout'
import Icon from '../icon/Icon'
import { getChatMaxHeight } from '../chat/chat-area'
import { PanelSectionHeader } from './panel-section-header'
import { Input, UiEntity } from '@dcl/sdk/react-ecs'
import { COLOR } from '../color-palette'
import { FriendListItem } from './friend-list-item'
import { executeTask } from '@dcl/sdk/ecs'
import { BevyApi } from '../../bevy-api'
import { LoadingPlaceholder } from '../loading-placeholder'
import { EmptyFriends } from './empty-friends'
import { store } from '../../state/store'
import { closeLastPopupAction, pushPopupAction } from '../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../state/hud/state'
import { type FriendshipResultVariant } from './friendship-result-popup'
import { fetchProfileData } from '../../utils/passport-promise-utils'
import { getPlayer } from '@dcl/sdk/src/players'

export function FriendListPanel(): ReactEcs.JSX.Element {
  const fontSize = getFontSize({})
  const [friends, setFriends] = useState<FriendStatusData[]>([])
  const [hoveredFriend, setHoveredFriend] = useState<FriendStatusData | null>(
    null
  )
  const [isOnlineExpanded, setIsOnlineExpanded] = useState<boolean>(true)
  const [isOfflineExpanded, setIsOfflineExpanded] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(true)
  const [filterText, setFilterText] = useState<string>('')
  useEffect(() => {
    executeTask(async () => {
      //  const result = await (async () => [])() //await BevyApi.social.getOnlineFriends()
      const result = await BevyApi.social.getOnlineFriends()
      setFriends(result)
      setLoading(false)

      const connectivityStream =
        await BevyApi.social.getFriendConnectivityStream()
      const friendshipStream = await BevyApi.social.getFriendshipEventStream()

      executeTask(async () => {
        for await (const event of connectivityStream) {
          console.log('[social] friend connectivity changed', event)
          setFriends((prev) => {
            const updated = prev.filter((f) => f.address !== event.address)
            updated.push(event)
            return updated
          })
        }
      })

      executeTask(async () => {
        for await (const event of friendshipStream) {
          console.log('[social] friendship event', event)
          if (event.type === 'accept') {
            // Someone accepted our request — re-fetch to get full profile
            const refreshed = await BevyApi.social.getOnlineFriends()
            setFriends(refreshed)
          } else if (event.type === 'delete' || event.type === 'block') {
            // We were removed as friend, or blocked
            setFriends((prev) =>
              prev.filter((f) => f.address !== event.address)
            )
          }
          handleFriendshipResultEvent(event)
        }
      })
    })
  }, [])

  const byName = (a: FriendStatusData, b: FriendStatusData): number =>
    a.name.localeCompare(b.name)

  const filter = filterText.toLowerCase()
  const matchesFilter = (f: FriendStatusData): boolean =>
    !filter || f.name.toLowerCase().includes(filter)

  const onlineFriends = friends
    .filter(
      (f) => (f.status === 'online' || f.status === 'away') && matchesFilter(f)
    )
    .sort((a, b) => {
      if (a.status === 'online' && b.status === 'away') return -1
      if (a.status === 'away' && b.status === 'online') return 1
      return byName(a, b)
    })

  const offlineFriends = friends
    .filter((f) => f.status === 'offline' && matchesFilter(f))
    .sort(byName)

  if (loading) return <LoadingPlaceholder />
  if (friends.length === 0) return <EmptyFriends />

  return (
    <Column
      uiTransform={{
        scrollVisible: 'vertical',
        overflow: 'scroll',
        width: '100%',
        height: getChatMaxHeight() * 1.05
      }}
    >
      <Input
        uiTransform={{
          width: '90%',
          height: fontSize * 2,
          padding: { left: fontSize, top: fontSize / 2 }
        }}
        value={filterText}
        placeholder="type to filter by name..."
        placeholderColor={COLOR.TEXT_COLOR_GREY}
        fontSize={fontSize}
        color={COLOR.TEXT_COLOR_WHITE}
        onChange={(value) => {
          setFilterText(value)
        }}
      />
      <PanelSectionHeader
        topBorder={true}
        onMouseDown={() => {
          setIsOnlineExpanded(!isOnlineExpanded)
        }}
      >
        <Icon
          icon={{
            spriteName: isOnlineExpanded ? 'UpArrow' : 'DownArrow',
            atlasName: 'icons'
          }}
          iconSize={fontSize}
        />
        <UiEntity
          uiText={{
            value: `ONLINE (${onlineFriends.length})`,
            fontSize
          }}
        />
      </PanelSectionHeader>
      {isOnlineExpanded ? (
        <Column uiTransform={{ width: '100%' }}>
          {onlineFriends.map((friend) => (
            <FriendListItem
              key={friend.address}
              friend={friend}
              hovered={friend === hoveredFriend}
              onMouseEnter={() => {
                setHoveredFriend(friend)
              }}
              onMouseLeave={() => {
                if (friend === hoveredFriend) {
                  setHoveredFriend(null)
                }
              }}
            />
          ))}
        </Column>
      ) : null}
      <PanelSectionHeader
        onMouseDown={() => {
          setIsOfflineExpanded(!isOfflineExpanded)
        }}
      >
        <Icon
          icon={{
            spriteName: isOfflineExpanded ? 'UpArrow' : 'DownArrow',
            atlasName: 'icons'
          }}
          iconSize={fontSize}
        />
        <UiEntity
          uiText={{
            value: `OFFLINE (${offlineFriends.length})`,
            fontSize
          }}
        />
      </PanelSectionHeader>
      {isOfflineExpanded ? (
        <Column uiTransform={{ width: '100%' }}>
          {offlineFriends.map((friend) => (
            <FriendListItem
              key={friend.address}
              friend={friend}
              hovered={friend === hoveredFriend}
              onMouseEnter={() => {
                setHoveredFriend(friend)
              }}
              onMouseLeave={() => {
                if (friend === hoveredFriend) {
                  setHoveredFriend(null)
                }
              }}
            />
          ))}
        </Column>
      ) : null}
    </Column>
  )
}

const FRIENDSHIP_POPUP_TYPES = new Set([
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

function handleFriendshipResultEvent(event: FriendshipEventUpdate): void {
  const variant = EVENT_TO_VARIANT[event.type]
  if (variant == null) return

  // Close topmost friendship popup if any
  const popups = store.getState().hud.shownPopups
  const topPopup = popups[popups.length - 1]
  if (topPopup != null && FRIENDSHIP_POPUP_TYPES.has(topPopup.type)) {
    store.dispatch(closeLastPopupAction())
  }

  // Resolve name for the event address
  if (event.type === 'request') return // 'request' has its own popup flow
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
        data: {
          variant,
          address: event.address,
          name,
          hasClaimedName
        }
      })
    )
  })
}
