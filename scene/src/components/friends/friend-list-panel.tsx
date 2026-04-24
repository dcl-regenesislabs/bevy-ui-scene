import { getFontSize } from '../../service/fontsize-system'
import ReactEcs from '@dcl/react-ecs'
import useState = ReactEcs.useState
import { type FriendStatusData } from '../../service/social-service-type'
import { Column } from '../layout'
import Icon from '../icon/Icon'
import { getChatMaxHeight } from '../chat/chat-area'
import { PanelSectionHeader } from './panel-section-header'
import { Input, UiEntity } from '@dcl/sdk/react-ecs'
import { COLOR } from '../color-palette'
import { FriendListItem } from './friend-list-item'
import { LoadingPlaceholder } from '../loading-placeholder'
import { EmptyFriends } from './empty-friends'
import { store } from '../../state/store'

export function FriendListPanel(): ReactEcs.JSX.Element {
  const fontSize = getFontSize({})
  const [hoveredFriend, setHoveredFriend] = useState<FriendStatusData | null>(
    null
  )
  const [isOnlineExpanded, setIsOnlineExpanded] = useState<boolean>(true)
  const [isOfflineExpanded, setIsOfflineExpanded] = useState<boolean>(true)
  const [filterText, setFilterText] = useState<string>('')

  const { friends, friendsLoading } = store.getState().hud

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

  if (friendsLoading) return <LoadingPlaceholder />
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
