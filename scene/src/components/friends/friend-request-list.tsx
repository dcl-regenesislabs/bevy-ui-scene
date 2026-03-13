import ReactEcs from '@dcl/react-ecs'
import { getChatMaxHeight } from '../chat/chat-area'
import { Column } from '../layout'
import { PanelSectionHeader } from './panel-section-header'
import Icon from '../icon/Icon'
import { UiEntity } from '@dcl/sdk/react-ecs'
import { getFontSize } from '../../service/fontsize-system'
import { getFriendRequests } from './mock-friends-data'
import { Friend, FRIENDSHIP_STATUS } from '../../service/social-service-type'
import useState = ReactEcs.useState
import { FriendRequestItem } from './friend-request-item'

export function FriendRequestList() {
  const [isReceivedExpanded, setIsReceivedExpanded] = useState<boolean>(true)
  const [friendRequests, setFriendRequests] = useState<Friend[]>(
    getFriendRequests()
  )
  const [hoveredRequest, setHoveredRequest] = useState<Friend | null>(null)
  const fontSize = getFontSize({})

  return (
    <Column
      uiTransform={{
        scrollVisible: 'vertical',
        overflow: 'scroll',
        width: '100%',
        height: getChatMaxHeight() * 1.05
      }}
    >
      <PanelSectionHeader topBorder={false} onMouseDown={() => {}}>
        <Icon
          icon={{
            spriteName: isReceivedExpanded ? 'UpArrow' : 'DownArrow',
            atlasName: 'icons'
          }}
          iconSize={fontSize}
        />
        <UiEntity uiText={{ value: 'RECEIVED (5)', fontSize }} />
      </PanelSectionHeader>
      {isReceivedExpanded ? (
        <Column uiTransform={{ width: '100%' }}>
          {friendRequests
            .filter(
              (f) => f.friendshipStatus === FRIENDSHIP_STATUS.REQUEST_RECEIVED
            )
            .map((friendRequest) => (
              <FriendRequestItem
                hovered={hoveredRequest === friendRequest}
                friend={friendRequest}
                onMouseEnter={() => {
                  setHoveredRequest(friendRequest)
                }}
                onMouseLeave={() => {
                  if (friendRequest === hoveredRequest) {
                    setHoveredRequest(null)
                  }
                }}
              />
            ))}
        </Column>
      ) : null}
    </Column>
  )
}
