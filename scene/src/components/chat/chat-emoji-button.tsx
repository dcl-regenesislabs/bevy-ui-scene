import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { type Callback, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { ButtonIcon } from '../button-icon'
import { Column, Row } from '../layout'
import { getChatWidth } from '../../ui-classes/main-hud/MainHud'
import { COLOR } from '../color-palette'
import emojisCollection from '../../ui-classes/main-hud/chat-and-logs/emojis_complete.json'
import {
  type EmojiCategory,
  type EmojiCategoryName
} from '../../ui-classes/main-hud/chat-and-logs/emoji-types'
import { store } from '../../state/store'
import { updateHudStateAction } from '../../state/hud/actions'

const EMOJI_CATEGORIES: EmojiCategory[] =
  emojisCollection.categories as EmojiCategory[]

export function ChatEmojiButton({
  uiTransform,
  fontSize,
  onEmoji
}: {
  uiTransform: UiTransformProps
  fontSize: number
  onEmoji: Callback
}): ReactElement {
  const [open, setOpen] = ReactEcs.useState(false)
  const [category, setCategory] = ReactEcs.useState<EmojiCategoryName>(
    EMOJI_CATEGORIES[0].name
  )
  // TODO ReVIEW for emojis menu, if instead of UiElement here, use POPUP system
  return (
    <UiEntity uiTransform={{ ...uiTransform }}>
      {open && (
        <Column
          uiTransform={{
            position: { bottom: '100%', right: -getChatWidth() * 0.2 },
            positionType: 'absolute',
            width: getChatWidth() * 1.025,
            height: getChatWidth(),
            borderRadius: fontSize,
            borderWidth: 0,
            borderColor: COLOR.WHITE
          }}
          uiBackground={{
            color: COLOR.BLACK_POPUP_BACKGROUND
          }}
        >
          <Row
            uiTransform={{
              width: '100%',
              alignItems: 'space-around',
              alignContent: 'center',
              flexGrow: 0,
              flexShrink: 0
            }}
          >
            {EMOJI_CATEGORIES.map((emojiCategory) => (
              <ButtonIcon
                key={emojiCategory.name}
                uiTransform={{
                  margin: {
                    left: '2%',
                    right: '2%',
                    top: '1%',
                    bottom: '1%'
                  },
                  opacity: category === emojiCategory.name ? 1 : 0.5
                }}
                iconSize={fontSize * 2}
                icon={{
                  atlasName: 'emojis',
                  spriteName: emojiCategory.spriteName
                }}
                onMouseDown={() => {
                  setCategory(emojiCategory.name)
                }}
              />
            ))}
          </Row>
          <Row
            uiTransform={{
              width: '100%',
              flexWrap: 'wrap',
              overflow: 'scroll',
              height: getChatWidth() * 0.8,
              padding: {
                right: '10%'
              }
            }}
          >
            {emojisCollection.emojis
              .filter((emojiDef) => emojiDef.category === category)
              .map((emojiDef) => {
                return (
                  <UiEntity
                    uiTransform={{
                      width: fontSize * 2,
                      height: fontSize * 2,
                      margin: fontSize / 2
                    }}
                    uiText={{
                      value: `${emojiDef.emoji}`,
                      fontSize: fontSize * 2
                    }}
                    onMouseDown={() => {
                      const newValue =
                        store.getState().hud.chatInput + emojiDef.emoji
                      store.dispatch(
                        updateHudStateAction({
                          chatInput: newValue,
                          chatInputMentionSuggestions: []
                        })
                      )
                      setOpen(false)
                    }}
                  />
                )
              })}
          </Row>
        </Column>
      )}
      <ButtonIcon
        iconSize={fontSize * 2}
        icon={{ atlasName: 'emojis', spriteName: 'Face' }}
        onMouseDown={() => {
          setOpen(!open)
        }}
      />
    </UiEntity>
  )
}
