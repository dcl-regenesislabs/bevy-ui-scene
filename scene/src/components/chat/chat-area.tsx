import { Vector2 } from '@dcl/sdk/math'
import { type ChatMessageRepresentation } from './chat-message/ChatMessage.types'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { store } from 'src/state/store'
import { getViewportHeight } from '../../service/canvas-ratio'
import { ChatMessage } from './chat-message'
import { memoize } from '../../utils/function-utils'

const getScrollVector = memoize(_getScrollVector)

export function ChatArea({
  messages,
  onMessageMenu,
  state
}: {
  messages: ChatMessageRepresentation[]
  onMessageMenu: (timestampKey: number) => void
  state: any
}): ReactElement {
  const scrollPosition = getScrollVector(
    store.getState().viewport.height * 0.7 - state.autoScrollSwitch
  )

  return (
    <UiEntity
      uiTransform={{
        elementId: 'chat-area',
        width: '100%',
        display: store.getState().hud.chatOpen ? 'flex' : 'none',
        flexDirection: 'column',
        alignSelf: 'flex-end',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        height: getChatMaxHeight(), // the rest of the sibling in parent container
        overflow: 'scroll',
        scrollVisible: state.hoveringChat ? 'vertical' : 'hidden',
        scrollPosition,
        padding: { left: '3%', right: '8%' }
      }}
    >
      {messages.map((message) => (
        <ChatMessage
          message={message}
          key={message.id ?? message.timestamp}
          onMessageMenu={onMessageMenu}
        />
      ))}
    </UiEntity>
  )
}

function getChatMaxHeight(): number {
  if (store.getState().hud.minimapOpen) {
    return getViewportHeight() * 0.58
  } else {
    return getViewportHeight() * 0.83
  }
}
function _getScrollVector(positionY: number): Vector2 {
  return Vector2.create(0, positionY)
}
