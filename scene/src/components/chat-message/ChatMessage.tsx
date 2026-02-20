import { getPlayer } from '@dcl/sdk/src/players'

import { engine, UiCanvasInformation } from '@dcl/sdk/ecs'

import ReactEcs, {
  type Key,
  Label,
  UiEntity,
  type UiTransformProps
} from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { ALMOST_WHITE, ONE_ADDRESS, ZERO_ADDRESS } from '../../utils/constants'

import {
  CHAT_SIDE,
  type ChatMessageDefinition,
  type ChatMessageRepresentation
} from './ChatMessage.types'

import { COLOR } from '../color-palette'
import { compose, memoize, noop } from '../../utils/function-utils'
import { ButtonIcon } from '../button-icon'
import { AvatarCircle } from '../avatar-circle'
import { pushPopupAction } from '../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../state/hud/state'
import { store } from '../../state/store'
import {
  type Address,
  hasClaimedName,
  namedUsersData
} from '../../ui-classes/main-hud/chat-and-logs/named-users-data-service'
import emojiCompleteList from '../../ui-classes/main-hud/chat-and-logs/emojis_complete.json'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'

const LINK_TYPE = {
  USER: 'user',
  URL: 'url',
  LOCATION: 'location'
}

const EMOJI_SET = new Set(emojiCompleteList.emojis.map((e) => e.emoji))

export const isSingleEmoji = (str: string): boolean => EMOJI_SET.has(str)

const state: { hoveringMessageID: number; openMessageMenu: boolean } = {
  hoveringMessageID: 0,
  openMessageMenu: false
}

function ChatMessage(props: {
  uiTransform?: UiTransformProps
  message: ChatMessageRepresentation
  key?: Key
  onMessageMenu?: (id: number) => void
}): ReactEcs.JSX.Element | null {
  const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
  if (canvasInfo === null) return null
  if (getPlayer() === null) {
    return null
  }
  const defaultFontSize = getFontSize({})
  const messageMargin = defaultFontSize / 3
  const playerName = props.message.name

  const side = props.message.side

  const chatMessageOnMouseDownCallback: any = (
    event: any,
    message: ChatMessageRepresentation
  ) => {
    if (event?.hit?.meshName) {
      const [type, value] = event?.hit?.meshName.split('::')
      if (type === LINK_TYPE.USER) {
        const player =
          getPlayer({ userId: value }) ??
          message.mentionedPlayers[value] ??
          null

        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.PROFILE_MENU,
            data: {
              player
            }
          })
        )
      } else if (type === LINK_TYPE.URL) {
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.URL,
            data: value
          })
        )
      } else if (type === LINK_TYPE.LOCATION) {
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.TELEPORT,
            data: value
          })
        )
      }
    }
  }
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        flexDirection: side === CHAT_SIDE.RIGHT ? 'row-reverse' : 'row',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        margin: {
          bottom: messageMargin,
          top: messageMargin
        },
        borderRadius: messageMargin,
        borderColor: COLOR.BLACK_TRANSPARENT,
        borderWidth: 0,
        ...props.uiTransform
      }}
      onMouseEnter={() => {
        state.hoveringMessageID = props.message.timestamp
      }}
      onMouseLeave={() => {
        if (state.hoveringMessageID !== 0) {
          state.hoveringMessageID = 0
        }
      }}
    >
      <AvatarCircle
        userId={props.message.sender_address}
        circleColor={props.message.addressColor}
        uiTransform={{
          width: defaultFontSize * 2,
          height: defaultFontSize * 2,
          margin: {
            left: messageMargin,
            right: messageMargin,
            bottom: messageMargin
          }
        }}
        isGuest={props.message.isGuest}
        onMouseDown={() => {
          store.dispatch(
            pushPopupAction({
              type: HUD_POPUP_TYPE.PROFILE_MENU,
              data: {
                player: props.message.player
              }
            })
          )
        }}
      />
      <UiEntity
        uiTransform={{
          width: '70%',
          maxWidth: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: messageMargin,
          flexDirection: 'column',
          borderRadius: 10, // TODO responsive
          ...(props.message.hasMentionToMe
            ? {
                borderWidth: messageMargin / 2,
                borderColor: COLOR.MESSAGE_MENTION
              }
            : {
                borderWidth: messageMargin / 2,
                borderColor: COLOR.BLACK_TRANSPARENT
              })
        }}
        uiBackground={{
          color: props.message.hasMentionToMe
            ? COLOR.MESSAGE_MENTION_BACKGROUND
            : {
                ...Color4.Black(),
                a: isSystemMessage(props.message) ? 0.2 : 0.8
              }
        }}
      >
        {!isSystemMessage(props.message) && (
          <Label
            uiTransform={{
              width: '100%',
              height: defaultFontSize
            }}
            value={`<b>${playerName}</b>`}
            fontSize={defaultFontSize}
            color={
              isSystemMessage(props.message)
                ? Color4.Gray()
                : props.message.addressColor
            }
            textAlign={`middle-left`}
            onMouseDown={() => {
              store.dispatch(
                pushPopupAction({
                  type: HUD_POPUP_TYPE.PROFILE_MENU,
                  data: {
                    player: props.message.player
                  }
                })
              )
            }}
          />
        )}
        {/* TEXT */}
        <Label
          uiTransform={{
            width: '100%'
          }}
          value={
            isSystemMessage(props.message)
              ? `<i>${props.message.message}</i>`
              : props.message.message
          }
          fontSize={
            isSingleEmoji(props.message.message ?? '')
              ? defaultFontSize * 2
              : defaultFontSize
          }
          color={ALMOST_WHITE}
          textWrap="wrap"
          textAlign={`middle-left`}
          onMouseDown={(event) =>
            chatMessageOnMouseDownCallback(event, props.message)
          }
        />
        <Label
          uiTransform={{
            width: '100%',
            height: defaultFontSize
          }}
          value={formatTimestamp(props.message.timestamp)}
          fontSize={getFontSize({ token: TYPOGRAPHY_TOKENS.BODY_S })}
          color={COLOR.INACTIVE}
          textWrap="wrap"
          textAlign={`middle-left`}
        />
        <ButtonIcon
          onMouseDown={() => {
            ;(props.onMessageMenu || noop)(props.message.timestamp)
          }}
          uiTransform={{
            positionType: 'absolute',
            position: { right: '-5%', top: '8%' },
            width: defaultFontSize,
            height: defaultFontSize,
            margin: { right: defaultFontSize },
            display:
              state.hoveringMessageID === props.message.timestamp
                ? 'flex'
                : 'none',
            pointerFilter: 'block'
          }}
          icon={{ atlasName: 'icons', spriteName: 'Menu' }}
          iconSize={defaultFontSize}
        />
      </UiEntity>
    </UiEntity>
  )
}

const formatTimestamp = memoize((timestamp: number): string => {
  const date = new Date(timestamp)

  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
})

export default ChatMessage

export function isSystemMessage(messageData: ChatMessageDefinition): boolean {
  return (
    messageData.sender_address === ZERO_ADDRESS ||
    messageData.sender_address === ONE_ADDRESS
  )
}

export const NAME_MENTION_REGEXP = /@\w+(#\w+)?/g
export const SUGGESTION_NAME_MENTION_REGEXP = /@\w*(#\w+)?$/g
export const SUGGESTION_EMOJI_REGEXP = /:\w*(#\w+)?:?$/g
export const EMOJI_MENTION_REGEXP = /:\w+(#\w+)?/g
const URL_REGEXP = /https:\/\/[^\s"',]+/g
const LOCATION_REGEXP = /-?\d+,\s?-?\d+/g

export const decorateMessageWithLinks = compose(
  replaceNameTags,
  replaceURLTags,
  replaceLocationTags
)

export function replaceLocationTags(message: string): string {
  return message.replace(LOCATION_REGEXP, function (...[match]) {
    return `<b><color=#00B1FE><link=${LINK_TYPE.LOCATION}::${match}>${match}</link></color></b>`
  })
}

export function replaceURLTags(message: string): string {
  return message.replace(URL_REGEXP, function (...[match]) {
    return `<b><color=#00B1FE><link=${LINK_TYPE.URL}::${match}>${match}</link></color></b>`
  })
}

export function replaceNameTags(message: string): string {
  return message.replace(NAME_MENTION_REGEXP, (...[match]) => {
    const nameKey = match.replace('@', '').toLowerCase()
    // TODO FIX
    const nameAddress: Address | undefined = namedUsersData.get(nameKey)
    const nameToRender =
      match.includes('#') && nameAddress && hasClaimedName(nameAddress)
        ? match.split('#')[0]
        : match

    return nameAddress
      ? `<b><color=#00B1FE><link=${LINK_TYPE.USER}::${nameAddress}>${nameToRender}</link></color></b>`
      : `<b>${match}</b>`
  })
}
