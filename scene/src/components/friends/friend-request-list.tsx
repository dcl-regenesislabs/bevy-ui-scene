import ReactEcs from '@dcl/react-ecs'
import { getChatMaxHeight } from '../chat/chat-area'
import { Column } from '../layout'
import { PanelSectionHeader } from './panel-section-header'
import Icon from '../icon/Icon'
import { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { getFontSize } from '../../service/fontsize-system'
import { getFriendRequests } from './mock-friends-data'
import { Friend, FRIENDSHIP_STATUS } from '../../service/social-service-type'
import useState = ReactEcs.useState
import {
  FriendRequestItem,
  FriendRequestItemReceived,
  FriendRequestItemSent,
  PanelListButton
} from './friend-request-item'

export function FriendRequestList() {
  const [isReceivedExpanded, setIsReceivedExpanded] = useState<boolean>(true)
  const [isSentExpanded, setIsSentExpanded] = useState<boolean>(true)
  const [friendRequests, setFriendRequests] = useState<Friend[]>(
    getFriendRequests()
  )
  const [hoveredRequest, setHoveredRequest] = useState<Friend | null>(null)
  const fontSize = getFontSize({})

  const friendRequestsSent = friendRequests.filter(
    (f) => f.friendshipStatus === FRIENDSHIP_STATUS.REQUEST_SENT
  )
  const friendRequestsReceived = friendRequests.filter(
    (f) => f.friendshipStatus === FRIENDSHIP_STATUS.REQUEST_RECEIVED
  )

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
          setIsReceivedExpanded(!isReceivedExpanded)
        }}
      >
        <Icon
          icon={{
            spriteName: isReceivedExpanded ? 'UpArrow' : 'DownArrow',
            atlasName: 'icons'
          }}
          iconSize={fontSize}
        />
        <UiEntity
          uiText={{
            value: `RECEIVED (${friendRequestsReceived.length})`,
            fontSize
          }}
        />
      </PanelSectionHeader>
      {isReceivedExpanded ? (
        <Column uiTransform={{ width: '100%' }}>
          {friendRequestsReceived.map((friendRequest) => (
            <FriendRequestItemReceived
              friendRequest={friendRequest}
              hovered={hoveredRequest === friendRequest}
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
      <PanelSectionHeader
        onMouseDown={() => {
          setIsSentExpanded(!isReceivedExpanded)
        }}
      >
        <Icon
          icon={{
            spriteName: isSentExpanded ? 'UpArrow' : 'DownArrow',
            atlasName: 'icons'
          }}
          iconSize={fontSize}
        />
        <UiEntity
          uiText={{ value: `SENT (${friendRequestsSent.length})`, fontSize }}
        />
      </PanelSectionHeader>
      {isSentExpanded ? (
        <Column uiTransform={{ width: '100%' }}>
          {friendRequestsSent.map((friendRequest) => (
            <FriendRequestItemSent
              friendRequest={friendRequest}
              hovered={hoveredRequest === friendRequest}
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
