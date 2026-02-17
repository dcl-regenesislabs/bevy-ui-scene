import { engine, executeTask, UiCanvasInformation } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity, type UiTransformProps } from '@dcl/sdk/react-ecs'
import ButtonIcon from '../../components/button-icon/ButtonIcon'
import { ButtonTextIcon } from '../../components/button-text-icon'
import { type UIController } from '../../controllers/ui.controller'
import { ALMOST_BLACK } from '../../utils/constants'
import { type AtlasIcon } from '../../utils/definitions'
import { ProfileButton } from '../profile/profile-button/ProfileButton'
import { type MenuPage } from './MainMenu.types'
import { COLOR } from '../../components/color-palette'
import {
  getContentScaleRatio,
  getViewportHeight
} from '../../service/canvas-ratio'
import { playPreviewEmote } from '../../components/backpack/AvatarPreview'
import {
  initOutfitsCatalog,
  disposeOutfitsCatalog
} from '../../components/backpack/OutfitAvatar'
import { DeleteOutfitDialog } from './backpack-page/delete-outfit-dialog'
import { noop } from '../../utils/function-utils'
import { BevyApi } from '../../bevy-api'
import { CONTEXT, getFontSize } from '../../service/fontsize-system'

const SELECTED_BUTTON_COLOR: Color4 = { ...Color4.Gray(), a: 0.3 }
const BUTTON_TEXT_COLOR_INACTIVE = Color4.Gray()

export default class MainMenu {
  public activePage: MenuPage | undefined = 'settings'
  public isOpen = (): boolean => this.open
  private readonly uiController: UIController
  private open: boolean = false

  readonly backpackIcon: AtlasIcon = {
    atlasName: 'navbar',
    spriteName: 'Backpack off'
  }

  readonly mapIcon: AtlasIcon = {
    atlasName: 'navbar',
    spriteName: 'Map off'
  }

  readonly exploreIcon: AtlasIcon = {
    atlasName: 'navbar',
    spriteName: 'Explore off'
  }

  readonly settingsIcon: AtlasIcon = {
    atlasName: 'navbar',
    spriteName: 'Settings off'
  }

  private closeButtonColor: Color4 | undefined

  private backpackBackground: Color4 | undefined
  private mapBackground: Color4 | undefined
  private exploreBackground: Color4 | undefined
  private settingsBackground: Color4 | undefined

  constructor(uiController: UIController) {
    this.uiController = uiController

    executeTask(async () => {
      this.uiController.backpackPage.setOriginalAvatarJSON()
    })
  }

  mapEnter(): void {
    this.mapIcon.spriteName = 'Map on'
    this.mapBackground = SELECTED_BUTTON_COLOR
  }

  backpackEnter(): void {
    this.backpackIcon.spriteName = 'Backpack on'
    this.backpackBackground = SELECTED_BUTTON_COLOR
  }

  exploreEnter(): void {
    this.exploreIcon.spriteName = 'Explore on'
    this.exploreBackground = SELECTED_BUTTON_COLOR
  }

  settingsEnter(): void {
    this.settingsIcon.spriteName = 'Settings on'
    this.settingsBackground = SELECTED_BUTTON_COLOR
  }

  hide(): void {
    // TODO BUG
    void this.uiController.backpackPage.saveAvatar()

    this.uiController.isMainMenuVisible = false
    this.closeButtonColor = ALMOST_BLACK
    playPreviewEmote('')
    disposeOutfitsCatalog()
    this.open = false
    // TODO REVIEW shouldn't show:false hide the ui always instead of toggling (when hot reload, it's not reset)
    BevyApi.showUi({ hash: undefined, show: true }).catch(console.error)
  }

  show(page: MenuPage): void {
    BevyApi.showUi({ hash: undefined, show: false }).catch(console.error)

    this.open = true
    this.uiController.settingsPage.updateButtons()
    this.activePage = page
    this.uiController.isMainMenuVisible = true
    this.updateButtons()
    this.uiController.show(page)
    initOutfitsCatalog().catch(console.error) // TODO review
  }

  updateButtons(): void {
    this.settingsIcon.spriteName = 'Settings off'
    this.settingsBackground = undefined
    this.backpackIcon.spriteName = 'Backpack off'
    this.backpackBackground = undefined
    this.mapIcon.spriteName = 'Map off'
    this.mapBackground = undefined
    this.exploreIcon.spriteName = 'Explore off'
    this.exploreBackground = undefined
    switch (this.activePage) {
      case 'settings':
        this.settingsEnter()
        break
      case 'map':
        this.mapEnter()
        break
      case 'backpack':
        this.backpackEnter()
        break
      case 'explore':
        this.exploreEnter()
        break
    }
  }

  mainUi(): ReactEcs.JSX.Element | null {
    const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
    if (canvasInfo === null) return null
    // const sideBarHeight: number = Math.max(canvasInfo.height * 0.024, 46)
    const canvasScaleRatio = getContentScaleRatio()
    const fontSize = getFontSize({ context: CONTEXT.DIALOG })
    const closeButtonSize: number = fontSize * 2
    const ICON_SIZE = fontSize * 2
    const BUTTON_ICON_FONT_SIZE = fontSize
    const buttonTransform: UiTransformProps = {
      // height: getMainMenuHeight() * 0.6,
      margin: {
        left: getMainMenuHeight() * 0.1,
        top: getMainMenuHeight() * 0.05,
        bottom: getMainMenuHeight() * 0.05
      },

      flexShrink: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }
    // const LOGO_WIDTH = getMainMenuHeight() * 4
    // const LOGO_HEIGHT = 24 * canvasScaleRatio * 2.1

    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          positionType: 'absolute',
          zIndex: 1
        }}
        onMouseDown={noop}
      >
        <DeleteOutfitDialog />
        <UiEntity
          uiTransform={{
            width: '100%',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center'
          }}
        >
          <UiEntity
            uiTransform={{
              width: '100%',
              height: getMainMenuHeight(),
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
              zIndex: 1
            }}
            uiBackground={{
              color: COLOR.MAIN_MENU_BACKGROUND
            }}
          >
            <UiEntity
              uiTransform={{
                height: getMainMenuHeight() * 0.4,
                width: getMainMenuHeight() * 0.4 * (165 / 24),
                flexGrow: 1,
                flexShrink: 0,
                margin: { left: 20 },
                justifyContent: 'flex-start',
                alignItems: 'flex-start'
              }}
              uiBackground={{
                texture: {
                  wrapMode: 'clamp',
                  src: 'assets/images/menu/menu-logo.png'
                },
                textureMode: 'stretch'
              }}
            ></UiEntity>
            <UiEntity
              uiTransform={{
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row'
              }}
            >
              <ButtonTextIcon
                uiTransform={buttonTransform}
                onMouseEnter={() => {
                  this.mapEnter()
                }}
                onMouseLeave={() => {
                  this.updateButtons()
                }}
                onMouseDown={() => {
                  this.show('map')
                }}
                backgroundColor={this.mapBackground}
                icon={this.mapIcon}
                value={'<b>MAP</b> [M]'}
                fontSize={BUTTON_ICON_FONT_SIZE}
                iconSize={ICON_SIZE}
                iconColor={
                  this.activePage === 'map'
                    ? undefined
                    : BUTTON_TEXT_COLOR_INACTIVE
                }
                fontColor={
                  this.activePage === 'map'
                    ? undefined
                    : BUTTON_TEXT_COLOR_INACTIVE
                }
              />

              <ButtonTextIcon
                uiTransform={buttonTransform}
                onMouseEnter={() => {
                  this.backpackEnter()
                }}
                onMouseLeave={() => {
                  this.updateButtons()
                }}
                onMouseDown={() => {
                  this.show('backpack')
                }}
                backgroundColor={this.backpackBackground}
                icon={this.backpackIcon}
                value={'<b>BACKPACK</b> [B]'}
                fontSize={BUTTON_ICON_FONT_SIZE}
                iconSize={ICON_SIZE}
                iconColor={
                  this.activePage === 'backpack'
                    ? undefined
                    : BUTTON_TEXT_COLOR_INACTIVE
                }
                fontColor={
                  this.activePage === 'backpack'
                    ? undefined
                    : BUTTON_TEXT_COLOR_INACTIVE
                }
              />

              <ButtonTextIcon
                uiTransform={buttonTransform}
                onMouseEnter={() => {
                  this.settingsEnter()
                }}
                onMouseLeave={() => {
                  this.updateButtons()
                }}
                onMouseDown={() => {
                  this.show('settings')
                }}
                backgroundColor={this.settingsBackground}
                icon={this.settingsIcon}
                value={'<b>SETTINGS</b> [P]'}
                fontSize={BUTTON_ICON_FONT_SIZE}
                iconSize={ICON_SIZE}
                iconColor={
                  this.activePage === 'settings'
                    ? undefined
                    : BUTTON_TEXT_COLOR_INACTIVE
                }
                fontColor={
                  this.activePage === 'settings'
                    ? undefined
                    : BUTTON_TEXT_COLOR_INACTIVE
                }
              />
            </UiEntity>
          </UiEntity>
          <UiEntity
            uiTransform={{
              width: '100%',
              height: 8 * canvasScaleRatio,
              zIndex: 2
            }}
            uiBackground={{
              texture: {
                src: 'assets/images/menu/hr-gradient.png'
              },
              textureMode: 'stretch'
            }}
          ></UiEntity>
          <UiEntity
            uiTransform={{
              width: '100%',
              height:
                this.activePage === 'map'
                  ? 'auto'
                  : getViewportHeight() - getMainMenuHeight(),
              flexGrow: 1
            }}
            uiBackground={{
              color: COLOR.WHITE_OPACITY_2
            }}
          >
            {this.activePage === 'map' && this.uiController.mapPage.mainUi()}
            {this.activePage === 'explore' &&
              this.uiController.explorePage.mainUi()}
            {this.activePage === 'backpack' &&
              this.uiController.backpackPage.render()}
            {this.activePage === 'settings' &&
              this.uiController.settingsPage.mainUi()}
          </UiEntity>
          <UiEntity
            uiTransform={{
              width: 'auto',
              height: getMainMenuHeight(),
              positionType: 'absolute',
              position: {
                right: getContentScaleRatio() * 50,
                top: getMainMenuHeight() * 0.1
              },
              zIndex: 1
            }}
          >
            <ProfileButton
              uiTransform={{
                margin: {
                  top: getMainMenuHeight() * 0.02,
                  right: getMainMenuHeight() * 0.2
                }
              }}
            />
            <ButtonIcon
              onMouseEnter={() => {
                this.closeButtonColor = ALMOST_BLACK
              }}
              onMouseLeave={() => {
                this.closeButtonColor = Color4.Black()
              }}
              onMouseDown={() => {
                this.hide()
              }}
              uiTransform={{
                width: closeButtonSize,
                height: closeButtonSize,
                flexShrink: 0,
                margin: {
                  top: getMainMenuHeight() / 2 - closeButtonSize * 0.6
                }
              }}
              iconSize={closeButtonSize / 2}
              backgroundColor={COLOR.BLACK}
              icon={{ atlasName: 'icons', spriteName: 'CloseIcon' }}
            />
          </UiEntity>
        </UiEntity>
      </UiEntity>
    )
  }
}
export function getMainMenuHeight(): number {
  return Math.floor(getContentScaleRatio() * 150)
}
