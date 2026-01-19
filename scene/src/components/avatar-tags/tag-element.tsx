import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../color-palette'
import useEffect = ReactEcs.useEffect
import { getAddressColor } from '../../ui-classes/main-hud/chat-and-logs/ColorByAddress'
import { getViewportHeight } from '../../service/canvas-ratio'
import useState = ReactEcs.useState
import { CameraMode, CameraType, engine, executeTask } from '@dcl/sdk/ecs'
import { type RGBAColor } from '../../bevy-api/interface'
import { onNewMessage } from '../../ui-classes/main-hud/chat-and-logs/ChatsAndLogs'
import { type ChatMessageRepresentation } from '../chat-message/ChatMessage.types'
import { sleep } from '../../utils/dcl-utils'
import { Column, Row } from '../layout'
import { truncateWithoutBreakingWords } from '../../utils/ui-utils'
import Icon from '../icon/Icon'
import { getHudFontSize } from '../../ui-classes/main-hud/scene-info/SceneInfo'
import { store } from '../../state/store'
import { getPlayer } from '@dcl/sdk/players'
import { isSingleEmoji } from '../chat-message/ChatMessage'
import {
  type Address,
  asyncHasClaimedName
} from '../../ui-classes/main-hud/chat-and-logs/named-users-data-service'

const TIME_TO_HIDE_MESSAGE = 5000
export function getTagElement({
  userId
}: {
  userId: Address
}): () => ReactElement {
  return function TagElement(): ReactElement {
    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          justifyContent: 'center',
          alignSelf: 'center'
        }}
      >
        <TagContent userId={userId} />
      </UiEntity>
    )
  }
}

function TagContent({ userId }: { userId: Address }): ReactElement | null {
  const [playerName, setPlayerName] = useState<string>(
    getPlayer({ userId })?.name
      ? `<b>${getPlayer({ userId })?.name}</b>#${getPlayer({
          userId
        })?.userId.substring(userId.length - 4, userId.length)}`
      : '???'
  )
  const [nameColor, setNameColor] = useState<RGBAColor>(
    COLOR.TEXT_COLOR_LIGHT_GREY
  )
  const [voiceIconFrame, setVoiceIconFrame] = useState<number>(1)
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false)
  const [hasClaimedName, setHasClaimedName] = useState<boolean>(false)
  const [chatMessage, setChatMessage] =
    useState<ChatMessageRepresentation | null>(null)
  const [messageToHide, setMessageToHide] =
    useState<ChatMessageRepresentation | null>(null)
  const [isVisible, setIsVisible] = useState<boolean>(true)
  const defaultFontSize = getHudFontSize(getViewportHeight()).NORMAL
  const messageMargin = defaultFontSize / 3
  const fontSize = getHudFontSize(getViewportHeight()).NORMAL

  useEffect(() => {
    onNewMessage((message: ChatMessageRepresentation) => {
      if (message.player?.userId === userId) {
        executeTask(async () => {
          setChatMessage(message)
          await sleep(TIME_TO_HIDE_MESSAGE)
          setMessageToHide(message)
        })
      }
    })
  }, [])
  useEffect(() => {
    executeTask(async () => {
      const _hasClaimedName = await asyncHasClaimedName(userId)
      setHasClaimedName(_hasClaimedName)

      if (_hasClaimedName) {
        setPlayerName(`<b>${getPlayer({ userId })?.name}</b>`)
        setNameColor(getAddressColor(userId))
      } else {
        setPlayerName(
          `<b>${getPlayer({ userId })?.name}</b>#${getPlayer({
            userId
          })?.userId.substring(userId.length - 4, userId.length)}`
        )
        setNameColor(COLOR.TEXT_COLOR_LIGHT_GREY)
      }
    })
  }, [getPlayer({ userId })?.name])

  useEffect(() => {
    setIsSpeaking(!!store.getState().hud.playerVoiceStateMap[userId])
  }, [store.getState().hud.playerVoiceStateMap])

  useEffect(() => {
    if (userId === getPlayer()?.userId) {
      setIsSpeaking(store.getState().hud.micEnabled)
    }
  }, [store.getState().hud.micEnabled])

  useEffect(() => {
    executeTask(async () => {
      await sleep(100)
      if (isSpeaking) {
        if (voiceIconFrame < 3) {
          setVoiceIconFrame(voiceIconFrame + 1)
        } else {
          setVoiceIconFrame(1)
        }
      }
    })
  }, [isSpeaking, voiceIconFrame])

  useEffect(() => {
    if (messageToHide) {
      if (messageToHide === chatMessage) {
        setChatMessage(null)
      }
    }
  }, [messageToHide])

  useEffect(() => {
    if (
      CameraMode.get(engine.CameraEntity).mode === CameraType.CT_FIRST_PERSON &&
      userId === getPlayer()?.userId
    ) {
      setIsVisible(false)
    } else {
      setIsVisible(true)
    }
  }, [CameraMode.get(engine.CameraEntity)])

  if (!isVisible) return null

  return (
    <Column
      uiTransform={{
        borderRadius: getViewportHeight() * 0.025,
        borderWidth: messageMargin / 2,
        alignSelf: 'flex-start',
        padding: {
          top: 5,
          bottom: 5,
          left: 10,
          right: 10
        },
        ...(chatMessage?.hasMentionToMe
          ? {
              borderColor: COLOR.MESSAGE_MENTION
            }
          : {
              borderColor: COLOR.BLACK_TRANSPARENT
            })
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_8
      }}
    >
      <Row>
        {isSpeaking && (
          <Icon
            icon={{
              atlasName: 'icons',
              spriteName: `voice-${voiceIconFrame}`
            }}
            uiTransform={{
              flexGrow: 0,
              flexShrink: 0,
              width: fontSize,
              height: fontSize,
              margin: { left: fontSize }
            }}
          />
        )}
        <UiEntity
          uiTransform={{
            alignSelf: 'flex-start'
          }}
          uiText={{
            outlineColor: COLOR.WHITE,
            outlineWidth: 1,
            value: playerName,
            fontSize,
            color: nameColor,
            textAlign: 'top-left'
          }}
        />
        {hasClaimedName && (
          <Icon
            iconSize={getViewportHeight() * 0.025}
            icon={{ spriteName: 'Verified', atlasName: 'icons' }}
          />
        )}
      </Row>
      {chatMessage && (
        <UiEntity
          uiTransform={{
            maxWidth: getViewportHeight() * 0.3,
            margin: { top: -getViewportHeight() * 0.01 }
          }}
          uiText={{
            textAlign: 'top-left',
            textWrap: 'wrap',
            value: truncateWithoutBreakingWords(chatMessage.message, 120),
            fontSize: isSingleEmoji(chatMessage?.message ?? '')
              ? getViewportHeight() * 0.05
              : getViewportHeight() * 0.02
          }}
        />
      )}
    </Column>
  )
}
