import {
  engine,
  executeTask,
  PointerLock,
  PrimaryPointerInfo,
  UiCanvasInformation,
  UiScrollResult,
  UiTransform
} from '@dcl/sdk/ecs'
import { type Vector2 } from '@dcl/sdk/math'
import ReactEcs, {
  Label,
  UiEntity,
  type UiTransformProps
} from '@dcl/sdk/react-ecs'
import { getPlayer } from '@dcl/sdk/src/players'
import { ONE_ADDRESS, ZERO_ADDRESS } from '../../../utils/constants'
import { BevyApi } from '../../../bevy-api'
import {
  CHAT_SIDE,
  type ChatMessageDefinition,
  type ChatMessageRepresentation,
  MESSAGE_TYPE
} from '../../../components/chat/chat-message/ChatMessage.types'
import { listenSystemAction } from '../../../service/system-actions-emitter'
import {
  changeRealm,
  getUiFocus,
  setUiFocus,
  teleportTo
} from '~system/RestrictedActions'
import {
  decorateMessageWithLinks,
  isSystemMessage
} from '../../../components/chat/chat-message/ChatMessage'
import { COLOR } from '../../../components/color-palette'
import { type ReactElement } from '@dcl/react-ecs'
import Icon from '../../../components/icon/Icon'
import {
  initChatMembersCount,
  requestPlayer
} from '../../../service/chat-members'
import { store } from '../../../state/store'
import { filterEntitiesWith, sleep } from '../../../utils/dcl-utils'
import { type PBUiCanvasInformation } from '@dcl/ecs/dist/components/generated/pb/decentraland/sdk/components/ui_canvas_information.gen'
import {
  HUD_ACTION,
  type UpdateHudAction,
  updateHudStateAction
} from '../../../state/hud/actions'
import { type AppState } from '../../../state/types'
import { type PermissionUsed } from '../../../bevy-api/permission-definitions'
import { VIEWPORT_ACTION } from '../../../state/viewport/actions'
import { ChatInput } from '../../../components/chat/chat-input'
import { cleanMapPlaces } from '../../../service/map-places'
import { getHudBarWidth, getUnsafeAreaWidth } from '../MainHud'
import { ChatMentionSuggestions } from '../../../components/chat/chat-mention-suggestions'
import { composedUsersData } from './named-users-data-service'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect
import { ChatEmojiButton } from '../../../components/chat/chat-emoji-button'
import { ChatEmojiSuggestions } from '../../../components/chat/chat-emoji-suggestions'
import { getFontSize } from '../../../service/fontsize-system'
import { MessageSubMenu } from '../../../components/chat/chat-message/chat-message-submenu'
import { ChatArea } from 'src/components/chat/chat-area'
import { ChatHeaderArea } from '../../../components/chat/chat-header-area'
import {
  extendMessageMentionedUsers,
  getNameWithHashPostfix
} from '../../../service/chat/chat-utils'

type Box = {
  position: { x: number; y: number }
  size: { x: number; y: number }
}

const BUFFER_SIZE = 40
const CHAT_WORLD_REGEXP = /^\/changerealm\s[\w.]+\.eth\s*$/
const state: {
  mouseX: number
  mouseY: number
  messageMenuPositionTop: number
  messageMenuTimestamp: number
  unreadMessages: number
  autoScrollSwitch: number
  newMessages: ChatMessageRepresentation[]
  shownMessages: ChatMessageRepresentation[]
  addingNewMessages: boolean
  cameraPointerLocked: boolean
  hoveringChat: boolean
  chatBox: Box
  inputFontSizeWorkaround: boolean
  headerMenuOpen: boolean
  filterMessages: {
    [MESSAGE_TYPE.USER]: boolean
    [MESSAGE_TYPE.SYSTEM]: boolean
    [MESSAGE_TYPE.SYSTEM_FEEDBACK]: boolean
  }
} = {
  mouseX: 0,
  mouseY: 0,
  messageMenuPositionTop: 0,
  messageMenuTimestamp: 0,
  unreadMessages: 0,
  autoScrollSwitch: 0,
  newMessages: [],
  shownMessages: [],
  addingNewMessages: false,
  cameraPointerLocked: false,
  hoveringChat: false,
  chatBox: { position: { x: 0, y: 0 }, size: { x: 0, y: 0 } },
  inputFontSizeWorkaround: false,
  headerMenuOpen: false,
  filterMessages: {
    [MESSAGE_TYPE.USER]: false,
    [MESSAGE_TYPE.SYSTEM]: true,
    [MESSAGE_TYPE.SYSTEM_FEEDBACK]: false
  }
}

export default class ChatAndLogs {
  pushMessage = pushMessage
  constructor() {
    this.listenMessages().catch(console.error)
    this.listenMouseHover()
    listenSystemAction('Chat', (pressed) => {
      if (pressed) {
        focusChatInput(true)
      }
    })

    initChatMembersCount().catch(console.error)

    store.subscribe((action, previousState: AppState) => {
      if (
        action.type === HUD_ACTION.UPDATE_HUD_STATE &&
        (action as UpdateHudAction).payload.chatOpen &&
        !previousState.hud.chatOpen
      ) {
        state.unreadMessages = 0
        scrollToBottom()
      }
    })

    // state.inputFontSizeWorkaround = true
    executeTask(async () => {
      // TODO on initialization, chat input doesn't apply the defined fontSize unless we show it with delay or we resize window
      await sleep(100)
      state.inputFontSizeWorkaround = true
    })
  }

  isOpen(): boolean {
    return store.getState().hud.chatOpen
  }

  getUnreadMessages(): number {
    return state.unreadMessages
  }

  async listenMessages(): Promise<void> {
    const awaitChatStream = async (
      stream: ChatMessageDefinition[]
    ): Promise<void> => {
      for await (const chatMessage of stream) {
        if (chatMessage.message.indexOf('␑') === 0) return
        this.pushMessage(chatMessage).catch(console.error)
        if (!this.isOpen()) {
          state.unreadMessages++
        }
      }
    }

    const awaitUsedPermissionStream = async (
      stream: PermissionUsed[]
    ): Promise<void> => {
      for await (const usedPermission of stream) {
        const sceneName =
          (await BevyApi.liveSceneInfo()).find(
            (s) => s.hash === usedPermission.scene
          )?.title || 'Unknown Scene'
        const usedPermissionMessage: ChatMessageDefinition = {
          sender_address: ZERO_ADDRESS,
          channel: 'Nearby',
          message: `"${sceneName}" scene ${
            usedPermission.wasAllowed ? 'allowed' : 'denied'
          } permission "${usedPermission.ty}" ${
            usedPermission.additional ? `(${usedPermission.additional})` : ''
          }`
        }
        this.pushMessage(usedPermissionMessage).catch(console.error)
      }
    }

    awaitChatStream(await BevyApi.getChatStream()).catch(console.error)
    awaitUsedPermissionStream(await BevyApi.getPermissionUsedStream()).catch(
      console.error
    )
  }

  listenMouseHover(): void {
    PointerLock.onChange(engine.CameraEntity, (pointerLock) => {
      if (!pointerLock) return
      state.cameraPointerLocked = pointerLock.isPointerLocked
    })

    store.subscribe((action) => {
      const SAFE_SUBMENU = 1.05
      if (action.type === VIEWPORT_ACTION.UPDATE_VIEWPORT) {
        state.chatBox.position.x = getHudBarWidth()
        state.chatBox.position.y = 0
        // TODO review to apply getChatWidth
        state.chatBox.size.x =
          (getUnsafeAreaWidth() - getHudBarWidth()) * SAFE_SUBMENU
        state.chatBox.size.y = store.getState().viewport.height
      }
    })

    engine.addSystem(() => {
      const { screenCoordinates } = PrimaryPointerInfo.get(engine.RootEntity)
      state.mouseX = screenCoordinates?.x ?? 0
      state.mouseY = screenCoordinates?.y ?? 0
      if (!screenCoordinates) return
      state.hoveringChat =
        !state.cameraPointerLocked &&
        isVectorInBox(screenCoordinates, state.chatBox)
    })
  }

  checkScrollToAppendMessages(): void {
    if (
      !state.addingNewMessages &&
      state.newMessages.length &&
      getChatScroll()?.y === 1
    ) {
      state.addingNewMessages = true
      state.shownMessages.push(
        state.newMessages.shift() as ChatMessageRepresentation
      )
      executeTask(async () => {
        await sleep(30)
        state.addingNewMessages = false
      })
    }
  }

  onMessageMenu(timestamp: number): void {
    if (state.messageMenuTimestamp === timestamp) {
      state.messageMenuTimestamp = 0
      return
    }
    state.messageMenuTimestamp = timestamp
    state.messageMenuPositionTop =
      state.mouseY -
      (UiCanvasInformation.getOrNull(engine.RootEntity)?.height ?? 0) * 0.39
  }

  mainUi(): ReactEcs.JSX.Element | null {
    const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
    if (canvasInfo === null) return null
    this.checkScrollToAppendMessages()
    return <ChatContent state={state} onMessageMenu={this.onMessageMenu} />
  }
}

function ChatContent({
  state,
  onMessageMenu
}: {
  state: any
  onMessageMenu: (timestamp: number) => void
}): ReactElement | null {
  const [canvasInfo] = useState<PBUiCanvasInformation | null>(
    UiCanvasInformation.getOrNull(engine.RootEntity)
  )
  const [opacity, setOpacity] = useState(1)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    executeTask(async () => {
      while (true) {
        const uiFocusResult = (await getUiFocus({})) ?? { elementId: null }
        const elementId = // TODO review when result is {elementId:string|null} instead of string|null
          typeof uiFocusResult === 'object'
            ? uiFocusResult.elementId
            : uiFocusResult
        if (elementId === 'chat-input') {
          setFocused(true)
        } else if (elementId !== 'chat-input') {
          setFocused(false)
        }

        await sleep(500)
      }
    })
  }, [])

  useEffect(() => {
    if ((focused && opacity !== 1) || state.hoveringChat) {
      setOpacity(1)
    } else if (!focused) {
      const timeSinceLastMessage =
        Date.now() -
        [
          state.newMessages[state.newMessages.length - 1],
          state.shownMessages[state.shownMessages.length - 1]
        ].reduce(
          (
            acc: number,
            messageRepresentation: ChatMessageRepresentation | undefined
          ) => {
            if (!messageRepresentation) return acc
            if (messageRepresentation.timestamp > acc)
              return messageRepresentation.timestamp
            return acc
          },
          0
        )
      if (timeSinceLastMessage > 5000) {
        const fadeProgress = Math.min(1, (timeSinceLastMessage - 5000) / 45000)
        const _opacity = 1 - 0.8 * fadeProgress * 50
        setOpacity(Math.max(0.2, _opacity))
      } else {
        setOpacity(1)
      }
    }
  })

  if (!canvasInfo) return null

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        flexDirection: 'column',
        borderRadius: getFontSize({}) / 2,
        borderColor: COLOR.BLACK_TRANSPARENT,
        borderWidth: 0,
        opacity
      }}
      uiBackground={{
        color: state.hoveringChat
          ? COLOR.DARK_OPACITY_5
          : COLOR.BLACK_TRANSPARENT
      }}
    >
      {state.hoveringChat && ChatHeaderArea({ state })}
      {ChatArea({
        messages: state.shownMessages,
        onMessageMenu,
        state
      })}
      {InputArea()}
      {ShowNewMessages()}
      {MessageSubMenu({ canvasInfo, state })}
    </UiEntity>
  )
}

function ShowNewMessages(): ReactElement | null {
  if (!state.newMessages.length) return null
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { right: '-10%', bottom: '6%' },
        borderRadius: 10,
        borderColor: COLOR.BLACK_TRANSPARENT,
        borderWidth: 0,
        height: '10%',
        width: '10%',
        zIndex: 999,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column'
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_7
      }}
      onMouseDown={scrollToBottom}
    >
      <Label
        value={`+${state.newMessages.length}`}
        fontSize={getFontSize({})}
      />
      <Icon
        iconSize={20}
        icon={{ spriteName: 'DownArrow', atlasName: 'icons' }}
      />
    </UiEntity>
  )
}

function InputArea(): ReactElement {
  const inputFontSize = getFontSize({})

  return (
    <UiEntity
      uiTransform={{
        width: '96%',
        alignSelf: 'center',
        height: inputFontSize * 2,
        flexGrow: 0,
        flexShrink: 0,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        margin: {
          top: store.getState().viewport.height * 0.005,
          bottom: store.getState().viewport.height * 0.005
        },
        position: { bottom: inputFontSize * 0.1 },
        padding: inputFontSize * 0.4,
        borderRadius: inputFontSize / 2
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_5
      }}
    >
      <ChatMentionSuggestions />
      <ChatEmojiSuggestions />
      {state.inputFontSizeWorkaround && (
        <ChatInput inputFontSize={inputFontSize} onSubmit={sendChatMessage} />
      )}
      {state.inputFontSizeWorkaround && (
        <ChatEmojiButton
          uiTransform={{
            positionType: 'absolute',
            position: { right: 0 }
          }}
          fontSize={inputFontSize * 0.8}
          onEmoji={() => {}}
        />
      )}
    </UiEntity>
  )
}

function sendChatMessage(value: string): void {
  try {
    if (value?.trim()) {
      if (value.startsWith('/goto')) {
        executeTask(async () => {
          if (
            value.trim() === '/goto genesis' ||
            value.trim() === '/goto main'
          ) {
            await changeRealm({
              realm: 'https://realm-provider.decentraland.org/main'
            })
            await sleep(1000)
            await teleportTo({
              worldCoordinates: { x: 0, y: 0 }
            })
            return
          }
          const [, coords] = value.trim().split(' ')
          const [x, y] = coords.split(',')

          if (!isNaN(Number(x)) && !isNaN(Number(y))) {
            await teleportTo({
              worldCoordinates: { x: Number(x), y: Number(y) }
            })
          } else if (x && !y) {
            const { acceptingUsers } = await fetch(
              `https://worlds-content-server.decentraland.org/world/${x}/about`
            ).then(async (res) => await res.json())

            if (acceptingUsers) {
              await changeRealm({
                realm: x
              })
            } else {
              pushMessage({
                message: `Invalid world name <b>${x}</b>`,
                sender_address: ONE_ADDRESS,
                channel: 'Nearby'
              }).catch(console.error)
            }
          }
        })
      } else if (value.startsWith('/help')) {
        pushMessage({
          message: `
<b>/help</b> - show this help message
<b>/goto x,y</b> - teleport to world x,y
<b>/goto</b> world_name.dcl.eth - teleport to realm world_name.dcl.eth
<b>/world</b> world_name.dcl.eth - teleport to realm world_name.dcl.eth
<b>/goto</b> main - teleport to Genesis Plaza
<b>/world</b> main - teleport to Genesis Plaza
<b>/goto</b> genesis - teleport to Genesis Plaza
<b>/world</b> genesis - teleport to Genesis Plaza
<b>/reload</b> - reloads the current scene`,
          sender_address: ONE_ADDRESS,
          channel: 'Nearby'
        }).catch(console.error)
      } else if (value.startsWith('/world')) {
        executeTask(async () => {
          const [, world] = value.trim().split(' ')
          if (world === 'genesis' || world === 'main') {
            await changeRealm({
              realm: 'https://realm-provider.decentraland.org/main'
            })
            await sleep(1000)
            await teleportTo({
              worldCoordinates: { x: 0, y: 0 }
            })
            return
          }
          const { acceptingUsers } = await fetch(
            `https://worlds-content-server.decentraland.org/world/${world}/about`
          ).then(async (res) => await res.json())
          if (acceptingUsers) {
            await changeRealm({
              realm: world
            })
          } else {
            pushMessage({
              message: `Invalid world name <b>${world}</b>`,
              sender_address: ONE_ADDRESS,
              channel: 'Nearby'
            }).catch(console.error)
          }
        })
      } else {
        BevyApi.sendChat(value, 'Nearby')
      }
    }

    if (value.startsWith('/')) {
      executeTask(async () => {
        await sleep(0)
        setUiFocus({ elementId: '' }).catch(console.error)
      })
    }

    executeTask(async () => {
      await sleep(0)
      scrollToBottom()
    })
  } catch (error: any) {
    pushMessage({
      sender_address: ONE_ADDRESS,
      message: `Error: ${error}`,
      channel: 'Nearby'
    }).catch(console.error)
    console.error('sendChatMessage error', error)
  }
}

export function scrollToBottom(): void {
  state.autoScrollSwitch = state.autoScrollSwitch ? 0 : 1
}

export function focusChatInput(uiFocus: boolean = false): void {
  try {
    if (uiFocus) setUiFocus({ elementId: 'chat-input' }).catch(console.error)
    store.dispatch(updateHudStateAction({ chatOpen: true }))
    scrollToBottom()
  } catch (error) {
    console.error('focusChatInput error', error)
  }
}

function getChatScroll(): Vector2 | null {
  const filteredEntities = filterEntitiesWith(
    ([, uiTransformResult]): boolean => {
      return (uiTransformResult as UiTransformProps).elementId === 'chat-area'
    },
    UiTransform,
    UiScrollResult
  )

  const foundEntity = filteredEntities[0]
  if (foundEntity === undefined) return null
  const [, , userScrollPosition] = foundEntity ?? []
  return (userScrollPosition as any).value as Vector2
}

function isVectorInBox(point: Vector2, box: Box): boolean {
  const { x, y } = point
  const { position, size } = box

  return (
    x >= position.x &&
    x <= position.x + size.x &&
    y >= position.y &&
    y <= position.y + size.y
  )
}

export function messageHasMentionToMe(message: string): boolean {
  return !!(
    message
      .toLowerCase()
      .includes(
        getNameWithHashPostfix(
          getPlayer()?.name ?? '___nothing___',
          getPlayer()?.userId ?? '___nothing___'
        )?.toLowerCase() ?? '___nothing___'
      ) ||
    (composedUsersData.get(getPlayer()?.userId ?? '')?.profileData?.avatars
      ?.length &&
      composedUsersData.get(getPlayer()?.userId ?? '')?.profileData?.avatars[0]
        .hasClaimedName &&
      message.toLowerCase().includes(getPlayer()?.name.toLowerCase() ?? '') &&
      message.toLowerCase()[
        message.toLowerCase().indexOf(getPlayer()?.name.toLowerCase() ?? '') +
          (getPlayer()?.name.length ?? 0)
      ] !== '#')
  )
}

async function pushMessage(message: ChatMessageDefinition): Promise<void> {
  const messageType = isSystemMessage(message)
    ? message.sender_address === ZERO_ADDRESS
      ? MESSAGE_TYPE.SYSTEM
      : MESSAGE_TYPE.SYSTEM_FEEDBACK
    : MESSAGE_TYPE.USER
  if (state.filterMessages[messageType]) {
    return
  }

  if (state.shownMessages.length >= BUFFER_SIZE) {
    state.shownMessages.shift()
  }

  // El profileData de todos los usuarios mencionados : PROBLEM ?

  let playerData = requestPlayer({ userId: message.sender_address })
  let retries = 0
  while (!playerData && retries < 10) {
    await sleep(100)
    playerData = requestPlayer({ userId: message.sender_address })
    retries++
  }
  const now = Date.now()
  const timestamp =
    state.shownMessages[state.shownMessages.length - 1]?.timestamp === now
      ? state.shownMessages[state.shownMessages.length - 1]?.timestamp + 1
      : now

  const decoratedChatMessage: ChatMessageRepresentation = {
    ...message,
    _originalMessage: message.message,
    id: Math.random(),
    timestamp,
    name: isSystemMessage(message)
      ? getSystemName(message.sender_address)
      : getNameWithHashPostfix(
          playerData?.name || `Unknown*`,
          message.sender_address
        ) ?? '',
    addressColor: COLOR.TEXT_COLOR_LIGHT_GREY,
    side:
      message.sender_address === getPlayer()?.userId
        ? CHAT_SIDE.RIGHT
        : CHAT_SIDE.LEFT,
    hasMentionToMe: messageHasMentionToMe(message.message),
    isGuest: playerData ? playerData.isGuest : true,
    messageType,
    player: getPlayer({ userId: message.sender_address }),
    message: decorateMessageWithLinks(message.message),
    mentionedPlayers: {}
  }

  extendMessageMentionedUsers(decoratedChatMessage).catch(console.error)

  if (getChatScroll() !== null && (getChatScroll()?.y ?? 0) < 1) {
    state.newMessages.push(decoratedChatMessage)
  } else {
    state.shownMessages.push(decoratedChatMessage)
    scrollToBottom()
  }

  if (CHAT_WORLD_REGEXP.test(message.message)) {
    cleanMapPlaces()
  }
  callbacks.onNewMessage.forEach((fn) => {
    fn(decoratedChatMessage)
  })
}

function getSystemName(address: string): string {
  if (address === ONE_ADDRESS) return ''
  if (address === ZERO_ADDRESS) return ''
  return ''
}

const callbacks: {
  onNewMessage: Array<(m: ChatMessageRepresentation) => void>
} = {
  onNewMessage: []
}

export function onNewMessage(
  fn: (message: ChatMessageRepresentation) => void
): () => void {
  callbacks.onNewMessage.push(fn)
  return (): void => {
    callbacks.onNewMessage = callbacks.onNewMessage.filter((f) => f !== fn)
  }
}
