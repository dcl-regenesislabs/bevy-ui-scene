import ReactEcs from '@dcl/react-ecs'
import { getChatMaxHeight } from '../chat/chat-area'
import { Column } from '../layout'
import { PanelSectionHeader } from './panel-section-header'
import Icon from '../icon/Icon'
import { UiEntity } from '@dcl/sdk/react-ecs'
import { getFontSize } from '../../service/fontsize-system'
import type { FriendRequestData } from '../../service/social-service-type'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect
import {
  FriendRequestItemReceived,
  FriendRequestItemSent
} from './friend-request-item'
import { executeTask } from '@dcl/sdk/ecs'
import { BevyApi } from '../../bevy-api'

export function FriendRequestList() {
  const [isReceivedExpanded, setIsReceivedExpanded] = useState<boolean>(true)
  const [isSentExpanded, setIsSentExpanded] = useState<boolean>(true)
  const [sentRequests, setSentRequests] = useState<FriendRequestData[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequestData[]>(
    []
  )
  const [hoveredRequest, setHoveredRequest] = useState<string | null>(null)
  const fontSize = getFontSize({})

  useEffect(() => {
    executeTask(async () => {
      const [sent, received] = await Promise.all([
        BevyApi.getSentFriendRequests(),
        BevyApi.getReceivedFriendRequests()
      ])
      setSentRequests(sent)
      setReceivedRequests(received)
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
            value: `RECEIVED (${receivedRequests.length})`,
            fontSize
          }}
        />
      </PanelSectionHeader>
      {isReceivedExpanded ? (
        <Column uiTransform={{ width: '100%' }}>
          {receivedRequests.map((request) => (
            <FriendRequestItemReceived
              key={request.id}
              friendRequest={request}
              hovered={hoveredRequest === request.address}
              onMouseEnter={() => {
                setHoveredRequest(request.address)
              }}
              onMouseLeave={() => {
                if (request.address === hoveredRequest) {
                  setHoveredRequest(null)
                }
              }}
            />
          ))}
        </Column>
      ) : null}
      <PanelSectionHeader
        onMouseDown={() => {
          setIsSentExpanded(!isSentExpanded)
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
          uiText={{ value: `SENT (${sentRequests.length})`, fontSize }}
        />
      </PanelSectionHeader>
      {isSentExpanded ? (
        <Column uiTransform={{ width: '100%' }}>
          {sentRequests.map((request) => (
            <FriendRequestItemSent
              friendRequest={request}
              hovered={hoveredRequest === request.address}
              onMouseEnter={() => {
                setHoveredRequest(request.address)
              }}
              onMouseLeave={() => {
                if (request.address === hoveredRequest) {
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
