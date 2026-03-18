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

export function FriendListPanel() {
  const fontSize = getFontSize({})
  const [friends, setFriends] = useState<FriendStatusData[]>([])
  const [hoveredFriend, setHoveredFriend] = useState<FriendStatusData | null>(
    null
  )
  const [isOnlineExpanded, setIsOnlineExpanded] = useState<boolean>(true)
  const [isOfflineExpanded, setIsOfflineExpanded] = useState<boolean>(true)

  useEffect(() => {
    executeTask(async () => {
      const result = await BevyApi.getOnlineFriends()
      setFriends(result)

      const stream = await BevyApi.getFriendConnectivityStream()
      for await (const event of stream) {
        console.log('[social] friend status changed', event)
        setFriends((prev) => {
          const updated = prev.filter((f) => f.address !== event.address)
          updated.push(event)
          return updated
        })
      }
    })
  }, [])

  const onlineFriends = friends
    .filter((f) => f.status === 'online' || f.status === 'away')
    .sort((a, b) => {
      if (a.status === 'online' && b.status === 'away') return -1
      if (a.status === 'away' && b.status === 'online') return 1
      return 0
    })

  const offlineFriends = friends.filter((f) => f.status === 'offline')

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
