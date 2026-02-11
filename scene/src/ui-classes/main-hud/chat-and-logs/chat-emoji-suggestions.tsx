import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { Column, Row } from '../../../components/layout'
import useEffect = ReactEcs.useEffect
import { store } from '../../../state/store'
import { updateHudStateAction } from '../../../state/hud/actions'

import { SUGGESTION_EMOJI_REGEXP } from '../../../components/chat-message/ChatMessage'
import { COLOR } from '../../../components/color-palette'
import { getViewportHeight } from '../../../service/canvas-ratio'
import { getHudFontSize } from '../scene-info/SceneInfo'
import emojiCompleteList from './emojis_complete.json'
import { memoize } from '../../../utils/function-utils'
import { getFontSize } from '../../../service/fontsize-system'
const EMOJI_EXPRESSIONS = emojiCompleteList.emojis.reduce<string[]>(
  (acc, current) => [...acc, current.expression] as string[],
  []
)
const MAX_LIST = 10

export const getEmojiFromExpression = memoize(_getEmojiFromExpression)
export const ChatEmojiSuggestions = (): ReactElement => {
  const [suggestedEmojis, setSuggestedEmojis] = ReactEcs.useState<string[]>([])
  useEffect(() => {
    setSuggestedEmojis(store.getState().hud.chatInputEmojiSuggestions)
  }, [store.getState().hud.chatInputEmojiSuggestions])

  useEffect(() => {
    const [lastMatch] =
      store.getState().hud.chatInput?.match(SUGGESTION_EMOJI_REGEXP) ?? []

    if (lastMatch && !suggestedEmojis.includes(lastMatch)) {
      store.dispatch(
        updateHudStateAction({
          chatInputEmojiSuggestions: getSuggestedEmojis(lastMatch)
            //    .filter((s) => !otherMatches.includes(s))
            .map((i) => `${getEmojiFromExpression(i)} ${i}`)
            .slice(0, MAX_LIST)
        })
      )
    } else if (suggestedEmojis?.length) {
      store.dispatch(
        updateHudStateAction({
          chatInputEmojiSuggestions: []
        })
      )
    }
  }, [store.getState().hud.chatInput])

  return (
    <Column
      uiTransform={{
        width: '100%',
        flexGrow: 1,
        flexDirection: 'column-reverse',
        positionType: 'absolute',
        position: {
          bottom: getViewportHeight() * 0.04
        }
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_2 }}
    >
      {suggestedEmojis.map((suggestedName, index) => {
        return (
          <Row
            uiTransform={{
              width: '100%',
              borderColor: index === 0 ? COLOR.WHITE : COLOR.BLACK_TRANSPARENT,
              borderRadius: getFontSize({}),
              borderWidth: 1
            }}
            key={suggestedName}
            uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
          >
            <UiEntity
              uiText={{
                value: index === 0 ? `<b>${suggestedName}</b>` : suggestedName
              }}
            />
          </Row>
        )
      })}
    </Column>
  )
}
const getSuggestedEmojis = memoize(_getSuggestedEmojis)
function _getSuggestedEmojis(matchText: string): string[] {
  return Array.from(
    new Set(EMOJI_EXPRESSIONS.sort((a, b) => a.localeCompare(b)))
  )
    .filter((expression) =>
      expression
        .toLowerCase()
        .includes(
          `${matchText.replace(':', '').replace(':', '')}`.toLowerCase()
        )
    )
    .sort((aExpression: string, bExpression: string) => {
      if (
        aExpression.startsWith(matchText) &&
        !bExpression.startsWith(matchText)
      ) {
        return -1
      } else if (
        bExpression.startsWith(matchText) &&
        !aExpression.startsWith(matchText)
      ) {
        return +1
      }
      return 0
    })
}

function _getEmojiFromExpression(expression: string): string {
  return (
    emojiCompleteList.emojis.find((emoji) => emoji.expression === expression)
      ?.emoji ?? ''
  )
}
