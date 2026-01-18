import { engine, executeTask, UiCanvasInformation } from '@dcl/sdk/ecs'
import { type Color4 } from '@dcl/sdk/math'
import ReactEcs, { type Position, UiEntity } from '@dcl/sdk/react-ecs'
import ButtonIcon from '../../components/button-icon/ButtonIcon'
import { type UIController } from '../../controllers/ui.controller'
import { openExternalUrl } from '~system/RestrictedActions'
import { type AtlasIcon } from '../../utils/definitions'
import { ALPHA_BLACK_PANEL, SELECTED_BUTTON_COLOR } from '../../utils/constants'
import { ChatsAndLogs } from './chat-and-logs'
import { SceneInfo } from './scene-info'
import { switchEmotesWheelVisibility } from '../../emotes-wheel/emotes-wheel'
import { type ReactElement } from '@dcl/react-ecs'
import { store } from '../../state/store'
import { pushPopupAction, updateHudStateAction } from '../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../state/hud/state'
import { getPlayer } from '@dcl/sdk/players'
import { getViewportHeight } from '../../service/canvas-ratio'
import { type PBUiCanvasInformation } from '@dcl/ecs/dist/components/generated/pb/decentraland/sdk/components/ui_canvas_information.gen'
import { BevyApi } from '../../bevy-api'
import { sleep } from '../../utils/dcl-utils'
import { listenSystemAction } from '../../service/system-actions-emitter'

const ZERO_SIZE = {
  width: 0,
  height: 0
}

enum MENU_ELEMENT {
  NONE,
  CHAT
}

const state: { hover: MENU_ELEMENT } = {
  hover: MENU_ELEMENT.NONE
}

const ChatIconActive: AtlasIcon = { spriteName: 'Chat on', atlasName: 'navbar' }
const ChatIconInactive: AtlasIcon = {
  spriteName: 'Chat off',
  atlasName: 'navbar'
}

export default class MainHud {
  public readonly isSideBarVisible: boolean = true
  private readonly uiController: UIController

  // TODO refactor to use redux store/hud (only done in chat)
  readonly bellIcon: AtlasIcon = {
    atlasName: 'navbar',
    spriteName: 'Notifications off'
  }

  readonly backpackIcon: AtlasIcon = {
    atlasName: 'navbar',
    spriteName: 'Backpack off'
  }

  readonly walletIcon: AtlasIcon = {
    atlasName: 'navbar',
    spriteName: 'Wallet'
  }

  readonly mapIcon: AtlasIcon = {
    atlasName: 'navbar',
    spriteName: 'Map off'
  }

  readonly settingsIcon: AtlasIcon = {
    atlasName: 'navbar',
    spriteName: 'Settings off'
  }

  private readonly helpIcon: AtlasIcon = {
    atlasName: 'navbar',
    spriteName: 'HelpIcon Off'
  }

  private readonly exploreIcon: AtlasIcon = {
    atlasName: 'navbar',
    spriteName: 'Explore off'
  }

  private readonly chatIcon: AtlasIcon = {
    atlasName: 'navbar',
    spriteName: 'Chat off'
  }

  private readonly voiceChatIcon: AtlasIcon = {
    atlasName: 'voice-chat',
    spriteName: 'Mic off'
  }

  // private cameraIcon: {atlasName:string, spriteName:string} = {atlasName:'navbar',  spriteName:'Camera Off'}
  // private experiencesIcon: {atlasName:string, spriteName:string} = {atlasName:'navbar',  spriteName:'ExperienceIconOff'}
  private readonly emotesIcon: AtlasIcon = {
    atlasName: 'navbar',
    spriteName: 'Emote off'
  }

  private backpackHint: boolean = false
  private bellHint: boolean = false
  private emotesHint: boolean = false
  private exploreHint: boolean = false
  private helpHint: boolean = false
  private mapHint: boolean = false
  private settingsHint: boolean = false
  private walletHint: boolean = false

  private voiceChatHint: boolean = false
  // private cameraHint: boolean = false
  // private experiencesHint: boolean = false

  private bellBackground: Color4 | undefined = undefined
  private backpackBackground: Color4 | undefined = undefined
  private emotesBackground: Color4 | undefined = undefined
  private exploreBackground: Color4 | undefined = undefined
  private helpBackground: Color4 | undefined = undefined
  private mapBackground: Color4 | undefined = undefined
  private settingsBackground: Color4 | undefined = undefined
  private walletBackground: Color4 | undefined = undefined
  private chatBackground: Color4 | undefined = undefined
  private voiceChatBackground: Color4 | undefined = undefined
  // private cameraBackground: Color4 | undefined = undefined
  // private experiencesBackground: Color4 | undefined = undefined

  public readonly sceneName: string = 'Scene Name'
  public readonly isSdk6: boolean = true
  public readonly isFav: boolean = true

  public sceneInfo: SceneInfo
  private readonly chatAndLogs: ChatsAndLogs
  public chatOpen: boolean = false
  public voiceChatOn: boolean = false

  constructor(uiController: UIController) {
    BevyApi.showUi({ hash: undefined, show: true }).catch(console.error)

    this.uiController = uiController
    this.sceneInfo = new SceneInfo(uiController)
    this.chatAndLogs = new ChatsAndLogs()

    listenSystemAction('Map', () => {
      if (uiController?.isMainMenuVisible) return
      this.uiController.menu?.show('map')
      this.updateButtons()
    })

    executeTask(async () => {
      while (true) {
        const micState = await BevyApi.getMicState()
        this.voiceChatIcon.spriteName = micState.enabled ? 'Mic on' : 'Mic off'
        store.dispatch(
          updateHudStateAction({
            micEnabled: micState.enabled
          })
        )
        await sleep(300)
      }
    })
  }

  voiceChatDown(): void {
    executeTask(async () => {
      const micState = await BevyApi.getMicState()
      const nextState = !micState.enabled
      BevyApi.setMicEnabled(nextState)
    })
  }

  walletEnter(): void {
    this.walletIcon.spriteName = 'Wallet on'
    this.walletBackground = SELECTED_BUTTON_COLOR
    this.walletHint = true
  }

  exploreEnter(): void {
    this.exploreIcon.spriteName = 'Explore on'
    this.exploreBackground = SELECTED_BUTTON_COLOR
    this.exploreHint = true
  }

  notificationsEnter(): void {
    this.bellIcon.spriteName = 'Notifications on'
    this.bellBackground = SELECTED_BUTTON_COLOR
    this.bellHint = true
  }

  mapEnter(): void {
    this.mapIcon.spriteName = 'Map on'
    this.mapBackground = SELECTED_BUTTON_COLOR
    this.mapHint = true
  }

  backpackEnter(): void {
    this.backpackIcon.spriteName = 'Backpack on'
    this.backpackBackground = SELECTED_BUTTON_COLOR
    this.backpackHint = true
  }

  settingsEnter(): void {
    this.settingsIcon.spriteName = 'Settings on'
    this.settingsBackground = SELECTED_BUTTON_COLOR
    this.settingsHint = true
  }

  helpEnter(): void {
    this.helpIcon.spriteName = 'HelpIcon On'
    this.helpBackground = SELECTED_BUTTON_COLOR
    this.helpHint = true
  }

  emotesEnter(): void {
    this.emotesIcon.spriteName = 'Emote on'
    this.emotesBackground = SELECTED_BUTTON_COLOR
    this.emotesHint = true
  }

  voiceChatEnter(): void {
    this.voiceChatBackground = SELECTED_BUTTON_COLOR
    this.voiceChatHint = true
  }

  updateButtons(): void {
    this.walletIcon.spriteName = 'Wallet'
    this.walletBackground = undefined
    this.walletHint = false
    this.bellIcon.spriteName = 'Notifications off'
    this.bellBackground = undefined
    this.bellHint = false
    this.mapIcon.spriteName = 'Map off'
    this.mapBackground = undefined
    this.mapHint = false
    this.backpackIcon.spriteName = 'Backpack off'
    this.backpackBackground = undefined
    this.backpackHint = false
    this.settingsIcon.spriteName = 'Settings off'
    this.settingsBackground = undefined
    this.settingsHint = false
    this.helpIcon.spriteName = 'HelpIcon Off'
    this.helpBackground = undefined
    this.helpHint = false
    this.emotesIcon.spriteName = 'Emote off'
    this.emotesBackground = undefined
    this.emotesHint = false
    this.exploreIcon.spriteName = 'Explore off'
    this.exploreBackground = undefined
    this.exploreHint = false

    if (!this.chatAndLogs.isOpen()) {
      // TODO review for a more reactive pattern,to have sync between menu and chat, e.g. when chat is open button icon should be "Chat On"
      this.chatIcon.spriteName = 'Chat off'
      this.chatBackground = undefined
    }
    if (!this.voiceChatOn) {
      this.voiceChatIcon.spriteName = 'Mic off'
      this.voiceChatBackground = undefined
    }
    this.voiceChatHint = false
  }

  openCloseChat(): void {
    store.dispatch(
      updateHudStateAction({ chatOpen: !store.getState().hud.chatOpen })
    )
  }

  mainUi(): ReactEcs.JSX.Element | null {
    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          positionType: 'absolute',
          flexDirection: 'row'
        }}
      >
        <UiEntity
          uiTransform={{
            width: getHudBarWidth(),
            height: '100%',
            zIndex: 1
          }}
          // onMouseEnter={() => (this.isSideBarVisible = true)}
          // onMouseLeave={() => (this.isSideBarVisible = false)}
        >
          {this.MainSideBar()}
        </UiEntity>

        <UiEntity
          uiTransform={{
            width: getChatWidth(),
            height: '100%',
            flexDirection: 'column'
          }}
        >
          {this.sceneInfo.mainUi()}

          <UiEntity
            uiTransform={{
              width: '100%',
              alignSelf: 'flex-end',
              positionType: 'absolute',
              position: { bottom: 0 },
              padding: {
                left: '2%'
              }
            }}
          >
            {this.chatAndLogs.isOpen() && this.chatAndLogs.mainUi()}
          </UiEntity>
        </UiEntity>
      </UiEntity>
    )
  }

  MainSideBar(): ReactElement | null {
    const canvasInfo =
      UiCanvasInformation.getOrNull(engine.RootEntity) ?? ZERO_SIZE
    const buttonMinSize: number = 38
    const buttonSize = Math.max(buttonMinSize, (canvasInfo.height * 5) / 100)
    const buttonMargin: Partial<Position> = { top: 5, bottom: 5 } // TODO review responsiveness
    const buttonTransform = {
      height: buttonSize,
      width: buttonSize,
      margin: buttonMargin,
      flexShrink: 0,
      flexGrow: 0
    }
    const buttonIconSize = buttonSize * 0.7

    if (canvasInfo === null) return null
    return (
      <UiEntity
        uiTransform={{
          display: this.isSideBarVisible ? 'flex' : 'none',
          width: '100%',
          height: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexDirection: 'column'
        }}
        uiBackground={{
          color: ALPHA_BLACK_PANEL
        }}
      >
        <UiEntity
          uiTransform={{
            display: this.isSideBarVisible ? 'flex' : 'none',
            width: '100%',
            height: 'auto',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column'
          }}
        >
          <ButtonIcon
            uiTransform={buttonTransform}
            onMouseEnter={() => {
              this.walletEnter()
            }}
            onMouseLeave={() => {
              this.updateButtons()
            }}
            onMouseDown={() => {
              store.dispatch(
                pushPopupAction({
                  type: HUD_POPUP_TYPE.PASSPORT,
                  data: getPlayer()?.userId
                })
              )
              this.updateButtons()
              // this.uiController.profile.showCard()
            }}
            backgroundColor={this.walletBackground}
            icon={this.walletIcon}
            hintText={'Profile'}
            showHint={this.walletHint}
            iconSize={buttonIconSize}
          />

          <ButtonIcon
            uiTransform={buttonTransform}
            onMouseEnter={() => {
              this.notificationsEnter()
            }}
            onMouseLeave={() => {
              this.updateButtons()
            }}
            onMouseDown={() => {
              store.dispatch(
                pushPopupAction({
                  type: HUD_POPUP_TYPE.NOTIFICATIONS_MENU
                })
              )
              console.log('clicked')
              this.updateButtons()
            }}
            backgroundColor={this.bellBackground}
            icon={this.bellIcon}
            hintText={'Notifications'}
            showHint={this.bellHint}
            iconSize={buttonIconSize}
            notifications={store.getState().hud.unreadNotifications}
          />

          <UiEntity
            uiTransform={{ height: 1, width: '80%' }}
            uiBackground={{ color: SELECTED_BUTTON_COLOR }}
          />

          <ButtonIcon
            uiTransform={buttonTransform}
            onMouseEnter={() => {
              this.mapEnter()
            }}
            onMouseLeave={() => {
              this.updateButtons()
            }}
            onMouseDown={() => {
              this.uiController.menu?.show('map')
              this.updateButtons()
            }}
            backgroundColor={this.mapBackground}
            icon={this.mapIcon}
            hintText={'Map'}
            showHint={this.mapHint}
            iconSize={buttonIconSize}
          />
          {/*          <ButtonIcon
            uiTransform={buttonTransform}
            onMouseEnter={() => {
              this.exploreEnter()
            }}
            onMouseLeave={() => {
              this.updateButtons()
            }}
            onMouseDown={() => {
              getUiController().menu?.show('map')
              this.updateButtons()
            }}
            backgroundColor={this.exploreBackground}
            icon={this.exploreIcon}
            hintText={'Explore'}
            showHint={this.exploreHint}
            iconSize={buttonIconSize}
          /> */}

          <ButtonIcon
            uiTransform={buttonTransform}
            onMouseEnter={() => {
              this.backpackEnter()
            }}
            onMouseLeave={() => {
              this.updateButtons()
            }}
            onMouseDown={() => {
              this.uiController.menu?.show('backpack')
              this.updateButtons()
            }}
            backgroundColor={this.backpackBackground}
            icon={this.backpackIcon}
            hintText={'Backpack'}
            showHint={this.backpackHint}
            iconSize={buttonIconSize}
          />

          <ButtonIcon
            uiTransform={buttonTransform}
            onMouseEnter={() => {
              this.settingsEnter()
            }}
            onMouseLeave={() => {
              this.updateButtons()
            }}
            onMouseDown={() => {
              this.uiController.menu?.show('settings')
              this.updateButtons()
            }}
            backgroundColor={this.settingsBackground}
            icon={this.settingsIcon}
            hintText={'Settings'}
            showHint={this.settingsHint}
            iconSize={buttonIconSize}
          />

          <UiEntity
            uiTransform={{ height: 1, width: '80%' }}
            uiBackground={{ color: SELECTED_BUTTON_COLOR }}
          />

          <ButtonIcon
            uiTransform={buttonTransform}
            onMouseEnter={() => {
              this.helpEnter()
            }}
            onMouseLeave={() => {
              this.updateButtons()
            }}
            onMouseDown={() => {
              openExternalUrl({
                url: 'https://decentraland.org/help/'
              }).catch(console.error)
              this.updateButtons()
            }}
            backgroundColor={this.helpBackground}
            icon={this.helpIcon}
            hintText={'Help'}
            showHint={this.helpHint}
            iconSize={buttonIconSize}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{
            display: this.isSideBarVisible ? 'flex' : 'none',
            width: '100%',
            height: 'auto',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column'
          }}
        >
          <ButtonIcon
            uiTransform={buttonTransform}
            onMouseEnter={() => {
              this.voiceChatEnter()
            }}
            onMouseLeave={() => {
              this.updateButtons()
            }}
            onMouseDown={() => {
              this.voiceChatDown()
            }}
            backgroundColor={this.voiceChatBackground}
            icon={this.voiceChatIcon}
            hintText={'Voice Chat (Click to toggle or hold <b>V</b> to talk)'}
            showHint={this.voiceChatHint}
            iconSize={buttonIconSize}
          />
          <ButtonIcon
            uiTransform={buttonTransform}
            onMouseEnter={() => {
              state.hover = MENU_ELEMENT.CHAT
            }}
            onMouseLeave={() => {
              if (!(state.hover > 0 && state.hover !== MENU_ELEMENT.CHAT)) {
                state.hover = MENU_ELEMENT.NONE
              }
            }}
            onMouseDown={() => {
              this.openCloseChat()
              this.updateButtons()
            }}
            backgroundColor={
              state.hover === MENU_ELEMENT.CHAT
                ? SELECTED_BUTTON_COLOR
                : undefined
            }
            icon={
              store.getState().hud.chatOpen ? ChatIconActive : ChatIconInactive
            }
            hintText={'Chat'}
            showHint={state.hover === MENU_ELEMENT.CHAT}
            notifications={this.chatAndLogs.getUnreadMessages()}
            iconSize={buttonIconSize}
          />

          <ButtonIcon
            uiTransform={buttonTransform}
            onMouseEnter={() => {
              this.emotesEnter()
            }}
            onMouseLeave={() => {
              this.updateButtons()
            }}
            onMouseDown={() => {
              switchEmotesWheelVisibility()
              this.updateButtons()
            }}
            backgroundColor={this.emotesBackground}
            icon={this.emotesIcon}
            hintText={'Emotes (Alt or ⌥)'}
            showHint={this.emotesHint}
            iconSize={buttonIconSize}
          />
        </UiEntity>
      </UiEntity>
    )
  }
}

export function getChatWidth(canvasInfo?: PBUiCanvasInformation): number {
  return (canvasInfo?.height ?? getViewportHeight()) * 0.4
}
export function getHudBarWidth(canvasInfo?: PBUiCanvasInformation): number {
  return (canvasInfo?.height ?? getViewportHeight()) * 0.05
}
export function getUnsafeAreaWidth(canvasInfo?: PBUiCanvasInformation): number {
  return getChatWidth(canvasInfo) + getHudBarWidth(canvasInfo)
}
