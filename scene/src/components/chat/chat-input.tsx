import { ReactEcs, type ReactElement } from '@dcl/react-ecs'
import useState = ReactEcs.useState
import { ALMOST_WHITE } from '../../utils/constants'
import { Input } from '@dcl/sdk/react-ecs'
import { focusChatInput } from '../../ui-classes/main-hud/chat-and-logs/ChatsAndLogs'
import useEffect = ReactEcs.useEffect
import { store } from '../../state/store'
import { updateHudStateAction } from '../../state/hud/actions'
import { executeTask } from '@dcl/sdk/ecs'
import { sleep } from '../../utils/dcl-utils'
import {
  SUGGESTION_EMOJI_REGEXP,
  SUGGESTION_NAME_MENTION_REGEXP
} from './chat-message/ChatMessage'
import { getEmojiFromExpression } from './chat-emoji-suggestions'
const state = {
  visible: true
}

export function ChatInput({
  inputFontSize,
  onSubmit = () => {}
}: {
  inputFontSize: number
  onSubmit?: (value: string) => void
}): ReactElement | null {
  const [currentValue, setCurrentValue] = useState('')
  useEffect(() => {
    if (store.getState().hud.chatInput !== currentValue) {
      setCurrentValue(store.getState().hud.chatInput)

      executeTask(async () => {
        // TODO REVIEW workaround
        state.visible = false
        await sleep(0)
        state.visible = true
        focusChatInput(true)
      })
    }
  }, [store.getState().hud.chatInput])
  if (!state.visible) return null
  return (
    <Input
      uiTransform={{
        elementId: 'chat-input',
        padding: { left: '1%' },
        width: '100%',
        height: '100%',
        alignContent: 'center',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      value={currentValue}
      textAlign="middle-center"
      fontSize={inputFontSize}
      color={ALMOST_WHITE}
      placeholder="Press ENTER to chat"
      placeholderColor={{ ...ALMOST_WHITE, a: 0.6 }}
      onSubmit={(value) => {
        if (store.getState().hud.chatInputMentionSuggestions.length) {
          const newValue =
            value.replace(SUGGESTION_NAME_MENTION_REGEXP, '') +
            `@${store.getState().hud.chatInputMentionSuggestions[0]}`
          executeTask(async () => {
            // TODO review workaround, because onSubmit empties the chat input
            store.dispatch(
              updateHudStateAction({
                chatInput: newValue,
                chatInputMentionSuggestions: []
              })
            )
          })
        } else if (store.getState().hud.chatInputEmojiSuggestions.length) {
          const [emojiExpressionToInsert] =
            SUGGESTION_EMOJI_REGEXP[Symbol.match](
              store.getState().hud.chatInputEmojiSuggestions[0]
            ) ?? []

          const emojiToInsert = getEmojiFromExpression(
            emojiExpressionToInsert ?? ''
          )
          const newValue =
            value.replace(SUGGESTION_EMOJI_REGEXP, '') + emojiToInsert
          executeTask(async () => {
            // TODO review workaround, because onSubmit empties the chat input
            store.dispatch(
              updateHudStateAction({
                chatInput: newValue,
                chatInputEmojiSuggestions: []
              })
            )
          })
        } else {
          onSubmit(value)
          setCurrentValue('')
        }
      }}
      onChange={(value: string) => {
        setCurrentValue(value)
        store.dispatch(
          updateHudStateAction({
            chatInput: value
          })
        )
      }}
      onMouseDown={() => {
        focusChatInput()
      }}
    />
  )
}
