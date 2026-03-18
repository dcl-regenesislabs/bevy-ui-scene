import { getFontSize } from '../../service/fontsize-system'
import ReactEcs from '@dcl/react-ecs'
import useState = ReactEcs.useState
import { type FriendData } from '../../service/social-service-type'
import { Column } from '../layout'
import Icon from '../icon/Icon'
import { getChatMaxHeight } from '../chat/chat-area'
import { PanelSectionHeader } from './panel-section-header'
import { UiEntity } from '@dcl/sdk/react-ecs'
import { FriendListItem } from './friend-list-item'
import useEffect = ReactEcs.useEffect
import { executeTask } from '@dcl/sdk/ecs'
import { BevyApi } from '../../bevy-api'

export function FriendListPanel() {
  const fontSize = getFontSize({})
  const [friends, setFriends] = useState<FriendData[]>([])
  const [hoveredFriend, setHoveredFriend] = useState<FriendData | null>(null)
  const [isExpanded, setIsExpanded] = useState<boolean>(true)

  useEffect(() => {
    executeTask(async () => {
      // TODO show online / offline friends
      const result = await BevyApi.getFriends()
      setFriends(result)
    })
  }, [])
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
          setIsExpanded(!isExpanded)
        }}
      >
        <Icon
          icon={{
            spriteName: isExpanded ? 'UpArrow' : 'DownArrow',
            atlasName: 'icons'
          }}
          iconSize={fontSize}
        />
        <UiEntity uiText={{ value: `OFFLINE (${friends.length})`, fontSize }} />
      </PanelSectionHeader>
      {isExpanded ? (
        <Column uiTransform={{ width: '100%' }}>
          {friends.map((friend) => {
            return (
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
            )
          })}
        </Column>
      ) : null}
    </Column>
  )
}
