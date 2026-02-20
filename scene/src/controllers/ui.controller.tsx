import ReactEcs, { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
import { type GameController } from './game.controller'
import { BackpackPage } from '../ui-classes/main-menu/backpack-page'
import { MainHud } from '../ui-classes/main-hud'
import { MainMenu } from '../ui-classes/main-menu'

import { MapPage } from '../ui-classes/main-menu/map-page'
import { LoadingAndLogin } from '../ui-classes/loading-and-login'
import { PopUpWarning } from '../ui-classes/main-hud/pop-up-warning'
import { SceneInfoCard } from '../ui-classes/scene-info-card'
import Photos from 'src/ui-classes/photos/Photos'
import {
  initEmotesWheel,
  renderEmotesWheel
} from '../emotes-wheel/emotes-wheel'
import { getWaitFor } from '../utils/function-utils'
import { sleep } from '../utils/dcl-utils'
import { getPlayer } from '@dcl/sdk/src/players'
import { Canvas } from '../components/canvas'
import { store } from '../state/store'
import { PopupStack } from '../components/popup-stack'
import { setupNotifications } from '../ui-classes/main-hud/notifications-menu'
import {
  initRealTimeNotifications,
  NotificationToastStack
} from '../ui-classes/main-hud/notification-toast-stack'
import { updateHudStateAction } from '../state/hud/actions'
import { listenPermissionRequests } from '../ui-classes/main-hud/permissions-popups/permissions-popup-service'
import { getRealm } from '~system/Runtime'
import { BigMap } from '../ui-classes/main-hud/big-map/big-map-view'
import { SceneCatalogPanel } from '../components/map/scene-catalog-panel'
import SettingsPage from '../ui-classes/main-menu/settings-page/SettingsPage'
import { InteractableArea } from '../components/canvas/Canvas'
import { BevyApi } from '../bevy-api'
import { UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../components/color-palette'
import useEffect = ReactEcs.useEffect
import { engine, PointerLock, Transform } from '@dcl/sdk/ecs'
import { getViewportWidth } from '../service/canvas-ratio'
import { listenSystemAction } from '../service/system-actions-emitter'
import { HoverActionComponent } from '../components/hover-actions/hover-action-component'
import { SceneLoadingWindowComponent } from '../components/scene-loading-window'

let loadingAndLogin: any = null

export function logout(): void {
  if (!loadingAndLogin) return

  BevyApi.logout()
  loadingAndLogin.startLoading()
  loadingAndLogin.setStatus('sign-in-or-guest')
}
let uiControllerSingletonInstance: UIController
export const getUiController = (): UIController => uiControllerSingletonInstance
const state = {
  hideUi: false
}
export class UIController {
  public isPhotosVisible: boolean = false
  public isMainMenuVisible: boolean = false
  public sceneInfoCardVisible: boolean = false
  public warningPopUpVisible: boolean = false
  public settingsPage: SettingsPage
  public backpackPage: BackpackPage
  public mapPage: MapPage

  loadingAndLogin: LoadingAndLogin
  gameController: GameController
  mainHud: MainHud
  menu: MainMenu
  sceneCard: SceneInfoCard
  warningPopUp: PopUpWarning
  photosPanel: Photos

  show(page: string): void {
    if (page === 'backpack') {
      void this.backpackPage.init()
    }
  }

  constructor(gameController: GameController) {
    uiControllerSingletonInstance = this
    this.gameController = gameController
    this.loadingAndLogin = loadingAndLogin = new LoadingAndLogin(this)
    this.mainHud = new MainHud(this)
    this.menu = new MainMenu(this)
    this.settingsPage = new SettingsPage()
    this.backpackPage = new BackpackPage()
    this.mapPage = new MapPage()
    this.sceneCard = new SceneInfoCard(this)
    this.warningPopUp = new PopUpWarning(this)
    this.photosPanel = new Photos(this)

    this.loadingAndLogin.onFinish(() => {
      const waitFor = getWaitFor(sleep)

      ;(async () => {
        // TODO review with bevy-explorer dev or protocol why getPlayer().emotes is empty at first
        listenPermissionRequests().catch(console.error)

        await waitFor(() => (getPlayer()?.emotes?.length ?? 0) > 0, 3000)
        store.dispatch(
          updateHudStateAction({
            realmURL: (await getRealm({})).realmInfo?.baseUrl ?? 'main' // TODO REVIEW
          })
        )
        store.dispatch(
          updateHudStateAction({
            loggedIn: true
          })
        )
        void initEmotesWheel({
          showBackpackMenu: () => {
            if (!this.isMainMenuVisible) {
              this.menu?.show('backpack')
            }
          }
        })

        void this.backpackPage.init()

        setupNotifications().catch(console.error)
        initRealTimeNotifications()
      })().catch(console.error)
    })

    ReactEcsRenderer.setUiRenderer(this.ui.bind(this))

    listenSystemAction('HideUi', (pressed) => {
      if (!pressed) return
      state.hideUi = !state.hideUi
    })
  }

  ui(): ReactEcs.JSX.Element | null {
    if (state.hideUi) return null
    return (
      <Canvas>
        <CameraPointer />
        {InteractableArea({ active: false })}

        {!this.isMainMenuVisible &&
          store.getState().hud.loggedIn &&
          this.mainHud.mainUi()}
        {this.isMainMenuVisible && this.menu.mainUi()}

        {this.isPhotosVisible && this.photosPanel.mainUi()}
        {/* Loading & Login */}
        {this.loadingAndLogin?.mainUi()}
        {this.warningPopUpVisible && this.warningPopUp.mainUi()}
        {!this.isMainMenuVisible && renderEmotesWheel()}

        {store.getState().hud.mapModeActive && BigMap()}
        {store.getState().hud.mapModeActive && SceneCatalogPanel()}

        {this.sceneInfoCardVisible && this.sceneCard.mainUi()}
        {NotificationToastStack()}
        {PopupStack()}
        {HoverActionComponent()}
        {SceneLoadingWindowComponent()}
      </Canvas>
    )
  }
}

function CameraPointer(): ReactEcs.JSX.Element | null {
  const [visible, setVisible] = ReactEcs.useState(false)
  useEffect(() => {
    if (!Transform.has(engine.CameraEntity)) return

    if (
      !PointerLock.get(engine.CameraEntity).isPointerLocked ||
      getUiController().isMainMenuVisible
    ) {
      setVisible(false)
    } else {
      setVisible(true)
    }
  })
  if (!visible) return null
  const size = getViewportWidth() * 0.03
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: {
          top: '50%',
          left: '50%'
        },
        margin: {
          top: -size / 4,
          left: -size / 2
        },
        height: size,
        width: size,
        opacity: 0.3
      }}
      uiBackground={{
        color: COLOR.WHITE,
        textureMode: 'stretch',

        texture: {
          src: `assets/images/camera-pointer.png`
        }
      }}
    />
  )
}
