import { getFontSize } from '../../service/fontsize-system'
import ReactEcs from '@dcl/react-ecs'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect
import { type FriendStatusData } from '../../service/social-service-type'
import { Column } from '../layout'
import Icon from '../icon/Icon'
import { getChatMaxHeight } from '../chat/chat-area'
import { PanelSectionHeader } from './panel-section-header'
import { UiEntity } from '@dcl/sdk/react-ecs'
import { FriendListItem } from './friend-list-item'
import { executeTask } from '@dcl/sdk/ecs'
import { BevyApi } from '../../bevy-api'
import { LoadingPlaceholder } from '../loading-placeholder'
import { EmptyFriends } from './empty-friends'

export function FriendListPanel() {
  const fontSize = getFontSize({})
  const [friends, setFriends] = useState<FriendStatusData[]>([])
  const [hoveredFriend, setHoveredFriend] = useState<FriendStatusData | null>(
    null
  )
  const [isOnlineExpanded, setIsOnlineExpanded] = useState<boolean>(true)
  const [isOfflineExpanded, setIsOfflineExpanded] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(true)
  useEffect(() => {
    executeTask(async () => {
      //  const result = await (async () => [])() //await BevyApi.getOnlineFriends()
      const result = await BevyApi.getOnlineFriends()
      setFriends(result)
      setLoading(false)

      const connectivityStream = await BevyApi.getFriendConnectivityStream()
      const friendshipStream = await BevyApi.getFriendshipEventStream()

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
            const refreshed = await BevyApi.getOnlineFriends()
            setFriends(refreshed)
          } else if (event.type === 'delete') {
            // We were removed as friend
            setFriends((prev) =>
              prev.filter((f) => f.address !== event.address)
            )
          }
        }
      })
    })
  }, [])

  const byName = (a: FriendStatusData, b: FriendStatusData) =>
    a.name.localeCompare(b.name)

  const onlineFriends = friends
    .filter((f) => f.status === 'online' || f.status === 'away')
    .sort((a, b) => {
      if (a.status === 'online' && b.status === 'away') return -1
      if (a.status === 'away' && b.status === 'online') return 1
      return byName(a, b)
    })

  const offlineFriends = friends
    .filter((f) => f.status === 'offline')
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
      <PanelSectionHeader
        topBorder={false}
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
