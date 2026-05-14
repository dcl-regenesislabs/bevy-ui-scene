import { engine, executeTask, UiCanvasInformation } from '@dcl/sdk/ecs'
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
import {
  closeLastPopupAction,
  pushPopupAction,
  updateHudStateAction
} from '../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../state/hud/state'
import { isLastPopupSubmitting } from '../../components/popup-stack'
import { getPlayer } from '@dcl/sdk/players'
import { getViewportHeight } from '../../service/canvas-ratio'
import { type PBUiCanvasInformation } from '@dcl/ecs/dist/components/generated/pb/decentraland/sdk/components/ui_canvas_information.gen'
import { BevyApi } from '../../bevy-api'
import { sleep } from '../../utils/dcl-utils'
import { listenSystemAction } from '../../service/system-actions-emitter'
import { CONTEXT } from '../../service/fontsize-system'
import { LayoutContext } from '../../service/layout-context'
import FriendsPanel from '../../components/friends/friends-panel'
import { FEATURES, getFeatureFlag } from '../../service/feature-flags'

const ZERO_SIZE = {
  width: 0,
  height: 0
}

// --- Static icon pairs ----------------------------------------------------
//
// `<ButtonIcon>` now handles hover internally and supports a `hoverIcon`
// prop. Each menu-bar entry is a pair of (idle, hover) sprites — defined
// once as constants instead of mutated on every mouseenter/leave.

const WalletIconIdle: AtlasIcon = { atlasName: 'navbar', spriteName: 'Wallet' }
const WalletIconHover: AtlasIcon = {
  atlasName: 'navbar',
  spriteName: 'Wallet on'
}

const BellIconIdle: AtlasIcon = {
  atlasName: 'navbar',
  spriteName: 'Notifications off'
}
const BellIconHover: AtlasIcon = {
  atlasName: 'navbar',
  spriteName: 'Notifications on'
}

const MapIconIdle: AtlasIcon = { atlasName: 'navbar', spriteName: 'Map off' }
const MapIconHover: AtlasIcon = { atlasName: 'navbar', spriteName: 'Map on' }

const CommunitiesIcon: AtlasIcon = {
  atlasName: 'icons',
  spriteName: 'CommunitiesHudIcon'
}

const BackpackIconIdle: AtlasIcon = {
  atlasName: 'navbar',
  spriteName: 'Backpack off'
}
const BackpackIconHover: AtlasIcon = {
  atlasName: 'navbar',
  spriteName: 'Backpack on'
}

const SettingsIconIdle: AtlasIcon = {
  atlasName: 'navbar',
  spriteName: 'Settings off'
}
const SettingsIconHover: AtlasIcon = {
  atlasName: 'navbar',
  spriteName: 'Settings on'
}

const HelpIconIdle: AtlasIcon = {
  atlasName: 'navbar',
  spriteName: 'HelpIcon Off'
}
const HelpIconHover: AtlasIcon = {
  atlasName: 'navbar',
  spriteName: 'HelpIcon On'
}

const EmotesIconIdle: AtlasIcon = {
  atlasName: 'navbar',
  spriteName: 'Emote off'
}
const EmotesIconHover: AtlasIcon = {
  atlasName: 'navbar',
  spriteName: 'Emote on'
}

const ChatIconActive: AtlasIcon = { spriteName: 'Chat on', atlasName: 'navbar' }
const ChatIconInactive: AtlasIcon = {
  spriteName: 'Chat off',
  atlasName: 'navbar'
}
const FriendsIconActive: AtlasIcon = {
  spriteName: 'Friends on',
  atlasName: 'navbar'
}
const FriendsIconInactive: AtlasIcon = {
  spriteName: 'Friends off',
  atlasName: 'navbar'
}

export default class MainHud {
  public readonly isSideBarVisible: boolean = true
  private readonly uiController: UIController

  // The voice-chat icon sprite is driven by the actual mic state polled
  // from BevyApi (not by hover), so it stays mutable.
  private readonly voiceChatIcon: AtlasIcon = {
    atlasName: 'voice-chat',
    spriteName: 'Mic off'
  }

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
    })

    // ESC priority: 1) close the top popup, peeling off one per press
    // (same semantics as a backdrop click; skipped while any popup is
    // mid-submit), 2) otherwise close the main menu if open.
    listenSystemAction('Cancel', (pressed: boolean) => {
      if (!pressed) return
      const popups = store.getState().hud.shownPopups
      if (popups.length > 0) {
        if (isLastPopupSubmitting()) return
        store.dispatch(closeLastPopupAction())
        return
      }
      if (this.uiController.isMainMenuVisible) {
        this.uiController.menu?.hide()
      }
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

  mainUi(): ReactEcs.JSX.Element | null {
    return (
      <LayoutContext.Provider value={CONTEXT.SIDE}>
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
              {getFeatureFlag(FEATURES.CHAT) &&
                this.chatAndLogs.isOpen() &&
                this.chatAndLogs.mainUi()}
              {getFeatureFlag(FEATURES.FRIENDS) &&
                store.getState().hud.friendsOpen && <FriendsPanel />}
            </UiEntity>
          </UiEntity>
        </UiEntity>
      </LayoutContext.Provider>
    )
  }

  MainSideBar(): ReactElement | null {
    const canvasInfo =
      UiCanvasInformation.getOrNull(engine.RootEntity) ?? ZERO_SIZE
    const buttonMargin: Partial<Position> = { top: 5, bottom: 5 } // TODO review responsiveness
    const buttonTransform = {
      margin: buttonMargin,
      flexShrink: 0,
      flexGrow: 0
    }

    if (canvasInfo === null) return null
    const friendsOpen = store.getState().hud.friendsOpen
    const chatOpen = store.getState().hud.chatOpen
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
            variant="transparent"
            icon={WalletIconIdle}
            hoverIcon={WalletIconHover}
            hintText="Profile"
            onMouseDown={() => {
              store.dispatch(
                pushPopupAction({
                  type: HUD_POPUP_TYPE.PASSPORT,
                  data: getPlayer()?.userId
                })
              )
            }}
          />

          {getFeatureFlag(FEATURES.NOTIFICATIONS) && (
            <ButtonIcon
              uiTransform={buttonTransform}
              variant="transparent"
              icon={BellIconIdle}
              hoverIcon={BellIconHover}
              hintText="Notifications"
              notifications={store.getState().hud.unreadNotifications}
              onMouseDown={() => {
                store.dispatch(
                  pushPopupAction({
                    type: HUD_POPUP_TYPE.NOTIFICATIONS_MENU
                  })
                )
              }}
            />
          )}

          <UiEntity
            uiTransform={{ height: 1, width: '80%' }}
            uiBackground={{ color: SELECTED_BUTTON_COLOR }}
          />

          {getFeatureFlag(FEATURES.DISCOVER_MAP) && (
            <ButtonIcon
              uiTransform={buttonTransform}
              variant="transparent"
              icon={MapIconIdle}
              hoverIcon={MapIconHover}
              hintText="Map"
              onMouseDown={() => {
                this.uiController.menu?.show('map')
              }}
            />
          )}

          {getFeatureFlag(FEATURES.COMMUNITIES) && (
            <ButtonIcon
              uiTransform={buttonTransform}
              variant="transparent"
              icon={CommunitiesIcon}
              hintText="Communities"
              onMouseDown={() => {
                this.uiController.menu?.show('communities')
              }}
            />
          )}

          <ButtonIcon
            uiTransform={buttonTransform}
            variant="transparent"
            icon={BackpackIconIdle}
            hoverIcon={BackpackIconHover}
            hintText="Backpack"
            onMouseDown={() => {
              this.uiController.menu?.show('backpack')
            }}
          />

          <ButtonIcon
            uiTransform={buttonTransform}
            variant="transparent"
            icon={SettingsIconIdle}
            hoverIcon={SettingsIconHover}
            hintText="Settings"
            onMouseDown={() => {
              this.uiController.menu?.show('settings')
            }}
          />

          <UiEntity
            uiTransform={{ height: 1, width: '80%' }}
            uiBackground={{ color: SELECTED_BUTTON_COLOR }}
          />

          <ButtonIcon
            uiTransform={buttonTransform}
            variant="transparent"
            icon={HelpIconIdle}
            hoverIcon={HelpIconHover}
            hintText="Help"
            onMouseDown={() => {
              openExternalUrl({
                url: 'https://decentraland.org/help/'
              }).catch(console.error)
            }}
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
            variant="transparent"
            icon={this.voiceChatIcon}
            hintText="Voice Chat (Click to toggle or hold <b>V</b> to talk)"
            onMouseDown={() => {
              this.voiceChatDown()
            }}
          />

          {getFeatureFlag(FEATURES.FRIENDS) && (
            <ButtonIcon
              uiTransform={buttonTransform}
              variant="transparent"
              icon={friendsOpen ? FriendsIconActive : FriendsIconInactive}
              hoverIcon={FriendsIconActive}
              hintText="Friends"
              onMouseDown={() => {
                store.dispatch(
                  updateHudStateAction({
                    friendsOpen: !friendsOpen,
                    chatOpen: !!friendsOpen
                  })
                )
              }}
            />
          )}
          {getFeatureFlag(FEATURES.CHAT) && (
            <ButtonIcon
              uiTransform={buttonTransform}
              variant="transparent"
              icon={chatOpen ? ChatIconActive : ChatIconInactive}
              hoverIcon={ChatIconActive}
              hintText="Chat"
              notifications={this.chatAndLogs.getUnreadMessages()}
              onMouseDown={() => {
                store.dispatch(
                  updateHudStateAction({
                    chatOpen: !chatOpen,
                    friendsOpen: false
                  })
                )
              }}
            />
          )}

          <ButtonIcon
            uiTransform={buttonTransform}
            variant="transparent"
            icon={EmotesIconIdle}
            hoverIcon={EmotesIconHover}
            hintText="Emotes (Alt or ⌥)"
            onMouseDown={() => {
              switchEmotesWheelVisibility()
            }}
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
