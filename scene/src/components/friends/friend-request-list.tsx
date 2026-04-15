import ReactEcs from '@dcl/react-ecs'
import { getChatMaxHeight } from '../chat/chat-area'
import { Column } from '../layout'
import { PanelSectionHeader } from './panel-section-header'
import Icon from '../icon/Icon'
import { Input, UiEntity } from '@dcl/sdk/react-ecs'
import { getFontSize } from '../../service/fontsize-system'
import { COLOR } from '../color-palette'
import type { FriendRequestData } from '../../service/social-service-type'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect
import {
  FriendRequestItemReceived,
  FriendRequestItemSent
} from './friend-request-item'
import { executeTask } from '@dcl/sdk/ecs'
import { BevyApi } from '../../bevy-api'
import { LoadingPlaceholder } from '../loading-placeholder'
import { store } from '../../state/store'
import { updateHudStateAction } from '../../state/hud/actions'

const byDateDesc = (
  a: FriendRequestData,
  b: FriendRequestData
): number => b.createdAt - a.createdAt

export async function fetchAndStoreFriendRequests(): Promise<void> {
  const [sent, received] = await Promise.all([
    BevyApi.social.getSentFriendRequests(),
    BevyApi.social.getReceivedFriendRequests()
  ])
  store.dispatch(
    updateHudStateAction({
      sentFriendRequests: sent.sort(byDateDesc),
      receivedFriendRequests: received.sort(byDateDesc)
    })
  )
}

export function removeFriendRequest(address: string): void {
  const state = store.getState().hud
  store.dispatch(
    updateHudStateAction({
      sentFriendRequests: state.sentFriendRequests.filter(
        (r) => r.address !== address
      ),
      receivedFriendRequests: state.receivedFriendRequests.filter(
        (r) => r.address !== address
      )
    })
  )
}

export function addReceivedFriendRequest(request: FriendRequestData): void {
  const current = store.getState().hud.receivedFriendRequests
  store.dispatch(
    updateHudStateAction({
      receivedFriendRequests: [request, ...current]
    })
  )
}

export function FriendRequestList(): ReactEcs.JSX.Element {
  const [isReceivedExpanded, setIsReceivedExpanded] = useState<boolean>(true)
  const [isSentExpanded, setIsSentExpanded] = useState<boolean>(true)
  const [hoveredRequest, setHoveredRequest] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [filterText, setFilterText] = useState<string>('')
  const fontSize = getFontSize({})

  const sentRequests = store.getState().hud.sentFriendRequests ?? []
  const receivedRequests = store.getState().hud.receivedFriendRequests ?? []

  useEffect(() => {
    executeTask(async () => {
      await fetchAndStoreFriendRequests()
      setLoading(false)
    })

    // Listen to friendship events for real-time updates
    executeTask(async () => {
      const stream = await BevyApi.social.getFriendshipEventStream()
      for await (const event of stream) {
        if (event.type === 'request') {
          addReceivedFriendRequest({
            address: event.address,
            name: event.name,
            hasClaimedName: event.hasClaimedName,
            profilePictureUrl: event.profilePictureUrl,
            createdAt: event.createdAt,
            message: event.message,
            id: event.id
          })
        } else if (
          event.type === 'accept' ||
          event.type === 'reject' ||
          event.type === 'cancel'
        ) {
          removeFriendRequest(event.address)
        }
      }
    })
  }, [])

  if (loading) return <LoadingPlaceholder />

  const filter = filterText.toLowerCase()
  const filteredReceived = filter
    ? receivedRequests.filter((r) => r.name.toLowerCase().includes(filter))
    : receivedRequests
  const filteredSent = filter
    ? sentRequests.filter((r) => r.name.toLowerCase().includes(filter))
    : sentRequests

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
        placeholderColor={COLOR.WHITE_OPACITY_5}
        fontSize={fontSize}
        color={COLOR.TEXT_COLOR_WHITE}
        onChange={(value) => {
          setFilterText(value)
        }}
      />
      <PanelSectionHeader
        topBorder={true}
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
            value: `RECEIVED (${filteredReceived.length})`,
            fontSize
          }}
        />
      </PanelSectionHeader>
      {isReceivedExpanded ? (
        <Column uiTransform={{ width: '100%' }}>
          {filteredReceived.length === 0 ? (
            <UiEntity
              uiTransform={{
                padding: { left: fontSize },
                height: fontSize * 2
              }}
              uiText={{
                value: 'No Requests',
                fontSize,
                color: COLOR.TEXT_COLOR_GREY,
                textAlign: 'middle-left'
              }}
            />
          ) : (
            filteredReceived.map((request) => (
              <FriendRequestItemReceived
                key={request.id}
                friendRequest={request}
                hovered={hoveredRequest === request.id}
                onMouseEnter={() => {
                  setHoveredRequest(request.id)
                }}
                onMouseLeave={() => {
                  if (request.address === hoveredRequest) {
                    setHoveredRequest(null)
                  }
                }}
                onAction={(address) => {
                  removeFriendRequest(address)
                }}
              />
            ))
          )}
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
          uiText={{ value: `SENT (${filteredSent.length})`, fontSize }}
        />
      </PanelSectionHeader>
      {isSentExpanded ? (
        <Column uiTransform={{ width: '100%' }}>
          {filteredSent.length === 0 ? (
            <UiEntity
              uiTransform={{
                padding: { left: fontSize },
                height: fontSize * 2
              }}
              uiText={{
                value: 'No Requests',
                fontSize,
                color: COLOR.TEXT_COLOR_GREY,
                textAlign: 'middle-left'
              }}
            />
          ) : (
            filteredSent.map((request) => (
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
                onAction={(address) => {
                  removeFriendRequest(address)
                }}
              />
            ))
          )}
        </Column>
      ) : null}
    </Column>
  )
}
