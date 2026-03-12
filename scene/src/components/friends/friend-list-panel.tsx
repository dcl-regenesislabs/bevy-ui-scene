import { getFontSize } from '../../service/fontsize-system'
import { ReactEcs } from '@dcl/react-ecs'
import useState = ReactEcs.useState
import { Friend, ONLINE_STATUS } from '../../service/social-service-type'
import { getFriends } from './mock-friends-data'
import { Column } from '../layout'
import Icon from '../icon/Icon'
import { getChatMaxHeight } from '../chat/chat-area'
import { PanelSectionHeader } from './panel-section-header'
import { UiEntity } from '@dcl/sdk/react-ecs'
import { FriendPanelItem } from './friend-panel-item'

export function FriendListPanel() {
  const fontSize = getFontSize({})
  const [friends, setFriends] = useState<Friend[]>(getFriends())
  const [hoveredFriend, setHoveredFriend] = useState<Friend | null>(null)
  const [isOnlineExpanded, setIsOnlineExpanded] = useState<boolean>(true)
  const [isOfflineExpanded, setIsOfflineExpanded] = useState<boolean>(true)

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
        <UiEntity uiText={{ value: 'ONLINE', fontSize }} />
      </PanelSectionHeader>
      {isOnlineExpanded ? (
        <Column uiTransform={{ width: '100%' }}>
          {friends
            .filter(
              (f) =>
                f.onlineStatus === ONLINE_STATUS.IDLE ||
                f.onlineStatus === ONLINE_STATUS.ONLINE
            )
            .sort((a: Friend, b: Friend) => {
              return a.onlineStatus < b.onlineStatus ? 1 : -1
            })
            .map((friend) => {
              return (
                <FriendPanelItem
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
              )
            })}
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
        <UiEntity uiText={{ value: 'OFFLINE', fontSize }} />
      </PanelSectionHeader>
      {isOfflineExpanded ? (
        <Column
          uiTransform={{
            width: '100%'
          }}
        >
          {friends
            .filter((f) => f.onlineStatus === ONLINE_STATUS.OFFLINE)
            .map((friend) => {
              return (
                <FriendPanelItem
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
              )
            })}
        </Column>
      ) : null}
    </Column>
  )
}
