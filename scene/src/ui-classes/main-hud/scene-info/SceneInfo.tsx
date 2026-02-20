import { engine, UiCanvasInformation } from '@dcl/sdk/ecs'
import { Vector2, type Color4, type Vector3 } from '@dcl/sdk/math'
import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'
import { store } from 'src/state/store'
import type { PlaceFromApi } from 'src/ui-classes/scene-info-card/SceneInfoCard.types'
import { ButtonIcon } from '../../../components/button-icon'

import type { UIController } from '../../../controllers/ui.controller'
import {
  ALMOST_WHITE,
  ALPHA_BLACK_PANEL,
  ROUNDED_TEXTURE_BACKGROUND,
  SELECTED_BUTTON_COLOR,
  UNSELECTED_TEXT_WHITE
} from '../../../utils/constants'
import type { AtlasIcon } from '../../../utils/definitions'
import {
  getBackgroundFromAtlas,
  truncateWithoutBreakingWords
} from '../../../utils/ui-utils'
import type { HomeScene, LiveSceneInfo } from 'src/bevy-api/interface'
import { BevyApi } from 'src/bevy-api'
import { setHome } from 'src/state/sceneInfo/actions'
import { getViewportHeight } from '../../../service/canvas-ratio'
import { MiniMapContent } from '../../../components/map/mini-map-content'
import { type ReactElement } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { updateHudStateAction } from '../../../state/hud/actions'
import Icon from '../../../components/icon/Icon'
import { currentRealmProviderIsWorld } from '../../../service/realm-change'
import { getFontSize } from '../../../service/fontsize-system'

export default class SceneInfo {
  private readonly uiController: UIController
  private liveSceneInfo: LiveSceneInfo | undefined
  private home: HomeScene | undefined
  private realm: string | undefined
  private sceneCoords: Vector3 | undefined
  private place: PlaceFromApi | undefined
  public fontSize: number = getFontSize({})
  private isExpanded: boolean = false
  private isMenuOpen: boolean = false
  private isHome: boolean = false
  private hideSceneUi: boolean = false
  // private expandBackgroundColor: Color4 | undefined = undefined
  private menuBackgroundColor: Color4 | undefined = undefined
  private setHomeLabelColor: Color4 = UNSELECTED_TEXT_WHITE
  private reloadLabelColor: Color4 = UNSELECTED_TEXT_WHITE
  private openInfoLabelColor: Color4 = UNSELECTED_TEXT_WHITE
  private sceneUiLabelColor: Color4 = UNSELECTED_TEXT_WHITE
  private flagIcon: string | undefined
  private flagHint: string = 'This scene was rated as an adult scene.'
  private isFlagHintVisible: boolean = false
  private isBrokenHintVisible: boolean = false

  private readonly expandIcon: AtlasIcon = {
    atlasName: 'icons',
    spriteName: 'DownArrow'
  }

  private readonly setAtHomeIcon: AtlasIcon = {
    atlasName: 'icons',
    spriteName: 'HomeOutline'
  }

  private readonly reloadIcon: AtlasIcon = {
    atlasName: 'icons',
    spriteName: 'Reset'
  }

  private readonly infoIcon: AtlasIcon = {
    atlasName: 'icons',
    spriteName: 'InfoButton'
  }

  private readonly sceneUiToggle: AtlasIcon = {
    atlasName: 'toggles',
    spriteName: 'SwitchOff'
  }

  // DEBUG Values
  public fpsValue: number = 0
  public uniqueGltfMeshesValue: number = 0
  public visibleMeshCountValue: number = 0
  public visibleTriangleCountValue: number = 0
  public uniqueGltfMaterialsValue: number = 0
  public visibleMaterialCountValue: number = 0
  public totalTextureCountValue: number = 0
  public totalTextureMemoryValue: number = 0
  public totalEntitiesValue: number = 0

  constructor(uiController: UIController) {
    this.uiController = uiController
  }

  async update(): Promise<void> {
    this.place = store.getState().scene.explorerPlace
    this.liveSceneInfo = store.getState().scene.explorerScene
    this.home = store.getState().scene.home
    this.sceneCoords = store.getState().scene.explorerPlayerParcelAction
    this.realm = await BevyApi.getRealmProvider()
    if (this.home !== undefined && this.sceneCoords !== undefined) {
      if (
        this.home.parcel.x === this.sceneCoords.x &&
        this.home.parcel.y === this.sceneCoords.z &&
        this.realm === this.home.realm
      ) {
        this.isHome = true
      } else {
        this.isHome = false
      }
    } else {
      this.isHome = false
    }

    if (this.place === undefined || this.liveSceneInfo === undefined) return

    this.setFlag(this.place.content_rating)
    this.updateIcons()
  }

  // setWarning(status: boolean, message: string): void {
  //   this.isWarningScene = status
  //   this.warningHint = message
  // }

  async toggleSceneUi(): Promise<void> {
    const response = await BevyApi.showUi({
      hash: this.liveSceneInfo?.hash,
      show: !this.hideSceneUi
    })
    this.hideSceneUi = !response
    this.updateIcons()
  }

  setFlag(arg: string | undefined): void {
    switch (arg) {
      case 'A':
        this.flagHint = 'This scene was rated as an adult scene.  +18'
        this.flagIcon = 'adult'
        break
      // RP is for Rating Pending  ?
      // case 'RP':
      //   this.flagHint = 'This scene was rated as a restricted scene.'
      //   this.flagIcon = 'restricted'
      //   break
      case 'R':
        this.flagHint = 'This scene was rated as a restricted scene.'
        this.flagIcon = 'restricted'
        break
      case 'T':
        this.flagHint = 'This scene was rated as a teen scene. +13'
        this.flagIcon = 'teen'
        break
      default:
        this.flagHint = ''
        this.flagIcon = undefined
    }
  }

  // setFps(arg: number): void {
  //   this.fpsValue = arg
  // }

  // setUniqueGltfMeshes(arg: number): void {
  //   this.uniqueGltfMeshesValue = arg
  // }

  // setVisibleMeshCount(arg: number): void {
  //   this.visibleMeshCountValue = arg
  // }

  // setVisibleTriangleCount(arg: number): void {
  //   this.visibleTriangleCountValue = arg
  // }

  // setUniqueGltfMaterials(arg: number): void {
  //   this.uniqueGltfMaterialsValue = arg
  // }

  // setVisibleMaterialCount(arg: number): void {
  //   this.visibleMaterialCountValue = arg
  // }

  // setTotalTextureCount(arg: number): void {
  //   this.totalTextureCountValue = arg
  // }

  // setTotalTextureMemory(arg: number): void {
  //   this.totalTextureMemoryValue = arg
  // }

  // setTotalEntities(arg: number): void {
  //   this.totalEntitiesValue = arg
  // }

  updateIcons(): void {
    if (this.isExpanded) {
      this.expandIcon.spriteName = 'UpArrow'
    } else {
      this.expandIcon.spriteName = 'DownArrow'
    }
    if (this.isHome) {
      this.setAtHomeIcon.spriteName = 'Home'
    } else {
      this.setAtHomeIcon.spriteName = 'HomeOutline'
    }
    if (this.hideSceneUi) {
      this.sceneUiToggle.spriteName = 'SwitchOn'
    } else {
      this.sceneUiToggle.spriteName = 'SwitchOff'
    }
  }

  setMenuOpen(arg: boolean): void {
    this.isMenuOpen = arg
  }

  async setExpanded(arg: boolean): Promise<void> {
    this.isExpanded = arg
    this.updateIcons()
  }

  async setHome(realm?: string, position?: Vector3 | undefined): Promise<void> {
    const newRealm = realm ?? 'http://realm-provider-ea.decentraland.org/main'
    const newParcel =
      Vector2.create(position?.x, position?.z) ?? Vector2.create(0, 0)
    this.home = { realm: newRealm, parcel: newParcel }
    store.dispatch(setHome(this.home))
    BevyApi.setHomeScene(this.home)
    this.update().catch(console.error)
  }

  async reloadScene(hash?: string): Promise<void> {
    await BevyApi.reload(hash ?? undefined)
  }

  async openSceneInfo(): Promise<void> {
    if (currentRealmProviderIsWorld()) {
      // TODO
    } else {
      await this.uiController.sceneCard.showByState()
    }
  }

  mainUi(): ReactEcs.JSX.Element | null {
    const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
    if (canvasInfo === null) return null

    const sceneCoords = store.getState().scene.explorerPlayerParcelAction
    if (sceneCoords === undefined) return null

    this.fontSize = getFontSize({})

    return (
      <UiEntity
        uiTransform={{
          width: '70%'
        }}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            flexDirection: 'column',
            height: '100%',
            padding: {
              left: getViewportHeight() * 0.01,
              bottom: getViewportHeight() * 0.01
            },
            margin: {
              top: getViewportHeight() * 0.005,
              left: getViewportHeight() * 0.01
            }
          }}
          uiBackground={{
            ...ROUNDED_TEXTURE_BACKGROUND,
            color: ALPHA_BLACK_PANEL
          }}
        >
          {this.SceneInfoHeader()}
          {store.getState().hud.minimapOpen && <MiniMapContent />}
          <UiEntity
            uiTransform={{
              display: this.isMenuOpen ? 'flex' : 'none',
              minWidth: getViewportHeight() * 0.25,
              width: getViewportHeight() * 0.25,
              height: 'auto',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              position: {
                left: '105%',
                top: 0
              },
              positionType: 'absolute'
            }}
            uiBackground={{
              ...ROUNDED_TEXTURE_BACKGROUND,
              color: ALPHA_BLACK_PANEL
            }}
          >
            <UiEntity
              uiTransform={{
                width: '100%',
                height: 'auto',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexDirection: 'row'
              }}
              onMouseDown={() => {
                this.toggleSceneUi().catch(console.error)
              }}
              onMouseEnter={() => {
                this.sceneUiLabelColor = ALMOST_WHITE
              }}
              onMouseLeave={() => {
                this.sceneUiLabelColor = UNSELECTED_TEXT_WHITE
              }}
            >
              <Label
                value={'Hide Scene UI'}
                fontSize={this.fontSize}
                color={this.sceneUiLabelColor}
                uiTransform={{ margin: { left: this.fontSize / 3 } }}
              />
              <UiEntity
                uiTransform={{
                  width: this.fontSize * 2,
                  height: this.fontSize,
                  margin: this.fontSize * 0.5
                }}
                uiBackground={{
                  ...getBackgroundFromAtlas(this.sceneUiToggle),
                  color: this.sceneUiLabelColor
                }}
              />
            </UiEntity>
            <UiEntity
              uiTransform={{ width: '100%', height: 1 }}
              uiBackground={{ color: { ...ALMOST_WHITE, a: 0.01 } }}
            />
            <UiEntity
              uiTransform={{
                width: '100%',
                height: 'auto',
                justifyContent: 'flex-start',
                alignItems: 'center',
                flexDirection: 'row'
              }}
              onMouseDown={() => {
                if (this.isHome) {
                  this.setHome().catch(console.error)
                } else {
                  this.setHome(this.realm, this.sceneCoords).catch(
                    console.error
                  )
                }
              }}
              onMouseEnter={() => {
                this.setHomeLabelColor = ALMOST_WHITE
              }}
              onMouseLeave={() => {
                this.setHomeLabelColor = UNSELECTED_TEXT_WHITE
              }}
            >
              <UiEntity
                uiTransform={{
                  width: this.fontSize,
                  height: this.fontSize,
                  margin: this.fontSize * 0.5
                }}
                uiBackground={{
                  ...getBackgroundFromAtlas(this.setAtHomeIcon),
                  color: this.setHomeLabelColor
                }}
              />
              <Label
                value={this.isHome ? 'Unset as Home' : 'Set as Home'}
                fontSize={this.fontSize}
                color={this.setHomeLabelColor}
              />
            </UiEntity>
            <UiEntity
              uiTransform={{ width: '100%', height: 1 }}
              uiBackground={{ color: { ...ALMOST_WHITE, a: 0.01 } }}
            />

            <UiEntity
              uiTransform={{ width: '100%', height: 1 }}
              uiBackground={{ color: { ...ALMOST_WHITE, a: 0.01 } }}
            />
            <UiEntity
              uiTransform={{
                width: '100%',
                height: 'auto',
                justifyContent: 'flex-start',
                alignItems: 'center',
                flexDirection: 'row'
              }}
              onMouseDown={() => {
                this.reloadScene(this.liveSceneInfo?.hash).catch(console.error)
              }}
              onMouseEnter={() => {
                this.reloadLabelColor = ALMOST_WHITE
              }}
              onMouseLeave={() => {
                this.reloadLabelColor = UNSELECTED_TEXT_WHITE
              }}
            >
              <UiEntity
                uiTransform={{
                  width: this.fontSize,
                  height: this.fontSize,
                  margin: this.fontSize * 0.5
                }}
                uiBackground={{
                  ...getBackgroundFromAtlas(this.reloadIcon),
                  color: this.reloadLabelColor
                }}
              />
              <Label
                value="Reload Scene"
                fontSize={this.fontSize}
                color={this.reloadLabelColor}
              />
            </UiEntity>
            <UiEntity
              uiTransform={{ width: '100%', height: 1 }}
              uiBackground={{ color: { ...ALMOST_WHITE, a: 0.01 } }}
            />
            {!currentRealmProviderIsWorld() && (
              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: 'auto',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  flexDirection: 'row'
                }}
                onMouseDown={() => {
                  this.openSceneInfo().catch(console.error)
                }}
                onMouseEnter={() => {
                  this.openInfoLabelColor = ALMOST_WHITE
                }}
                onMouseLeave={() => {
                  this.openInfoLabelColor = UNSELECTED_TEXT_WHITE
                }}
              >
                <UiEntity
                  uiTransform={{
                    width: this.fontSize,
                    height: this.fontSize,
                    margin: this.fontSize * 0.5
                  }}
                  uiBackground={{
                    ...getBackgroundFromAtlas(this.infoIcon),
                    color: this.openInfoLabelColor
                  }}
                />
                <Label
                  value="Scene Info"
                  fontSize={this.fontSize}
                  color={this.openInfoLabelColor}
                />
              </UiEntity>
            )}
          </UiEntity>
        </UiEntity>
      </UiEntity>
    )
  }

  SceneInfoHeader(): ReactElement | null {
    const sceneCoords = store.getState().scene.explorerPlayerParcelAction
    if (sceneCoords === undefined) return null
    const fontSize = this.fontSize
    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 'auto',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexDirection: 'row'
        }}
      >
        <UiEntity
          uiTransform={{
            alignSelf: 'flex-end',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            zIndex: 2,
            width: fontSize * 2,
            height: fontSize * 2,
            position: { top: '-25%' },
            padding: '3%',
            borderRadius: 10,
            borderColor: COLOR.WHITE,
            borderWidth: 0
          }}
          uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
          onMouseDown={() => {
            store.dispatch(
              updateHudStateAction({
                minimapOpen: !store.getState().hud.minimapOpen
              })
            )
          }}
        >
          <Icon
            uiTransform={{
              positionType: 'absolute',
              zIndex: 9,
              position: { top: -0.15 * fontSize }
            }}
            iconColor={COLOR.WHITE}
            iconSize={fontSize * 1.5}
            icon={{
              spriteName: store.getState().hud.minimapOpen
                ? 'UpArrow'
                : 'DownArrow',
              atlasName: 'icons'
            }}
          />
          <Icon
            uiTransform={{
              positionType: 'absolute',
              zIndex: 10,
              position: { top: 0.15 * fontSize }
            }}
            iconColor={COLOR.WHITE}
            iconSize={fontSize * 1.5}
            icon={{
              spriteName: store.getState().hud.minimapOpen
                ? 'UpArrow'
                : 'DownArrow',
              atlasName: 'icons'
            }}
          />
        </UiEntity>
        <UiEntity
          uiTransform={{
            width: 'auto',
            height: 'auto',
            justifyContent: 'flex-start',
            padding: this.fontSize * 0.5,
            alignItems: 'flex-start',
            flexDirection: 'column',
            flexGrow: 1
          }}
        >
          <Label
            value={truncateWithoutBreakingWords(
              this.liveSceneInfo?.title ?? `<i>empty scene</i>`,
              20
            )}
            fontSize={this.fontSize}
            uiTransform={{
              height: this.fontSize * 1.1
            }}
            textAlign="middle-left"
          />
          <UiEntity
            uiTransform={{
              width: '100%',
              height: this.fontSize,
              justifyContent: 'flex-start',
              alignItems: 'center',
              flexDirection: 'row',
              margin: {
                left: this.fontSize * 0.25,
                top: this.fontSize * 0.25
              }
            }}
          >
            <UiEntity
              uiTransform={{
                width: this.fontSize,
                height: this.fontSize
              }}
              uiBackground={{
                ...getBackgroundFromAtlas({
                  atlasName: 'icons',
                  spriteName: 'PinIcn'
                }),
                color: UNSELECTED_TEXT_WHITE
              }}
            />
            <Label
              value={sceneCoords.x.toString() + ',' + sceneCoords.z.toString()}
              fontSize={this.fontSize}
              uiTransform={{}}
            />

            <UiEntity
              uiTransform={{
                display:
                  this.liveSceneInfo?.sdkVersion === 'sdk6' ? 'flex' : 'none',
                width: this.fontSize / 0.41,
                height: this.fontSize,
                margin: { left: this.fontSize * 0.5 }
              }}
              uiBackground={{
                ...getBackgroundFromAtlas({
                  atlasName: 'icons',
                  spriteName: 'Tag'
                })
              }}
            />

            <ButtonIcon
              uiTransform={{
                display: this.flagIcon !== undefined ? 'flex' : 'none',
                width: this.fontSize * 1.2,
                height: this.fontSize * 1.2,
                margin: { left: this.fontSize * 0.5 }
              }}
              icon={{
                atlasName: 'toggles',
                spriteName: this.flagIcon ?? ''
              }}
              iconSize={this.fontSize}
              onMouseEnter={() => {
                this.isFlagHintVisible = true
              }}
              onMouseLeave={() => {
                this.isFlagHintVisible = false
              }}
              hintText={this.flagHint}
              showHint={this.isFlagHintVisible}
              hintFontSize={this.fontSize}
            />
            <ButtonIcon
              uiTransform={{
                display: this.liveSceneInfo?.isBroken ? 'flex' : 'none',
                width: this.fontSize * 1.2,
                height: this.fontSize * 1.2,
                margin: { left: this.fontSize * 0.5 }
              }}
              icon={{ atlasName: 'icons', spriteName: 'WarningError' }}
              iconSize={this.fontSize}
              onMouseEnter={() => {
                this.isBrokenHintVisible = true
              }}
              onMouseLeave={() => {
                this.isBrokenHintVisible = false
              }}
              hintText={'Scene is broken'}
              showHint={this.isBrokenHintVisible}
              hintFontSize={this.fontSize}
            />
          </UiEntity>
        </UiEntity>

        <ButtonIcon
          onMouseDown={() => {
            this.setMenuOpen(!this.isMenuOpen)
          }}
          onMouseEnter={() => {
            this.menuBackgroundColor = SELECTED_BUTTON_COLOR
          }}
          onMouseLeave={() => {
            this.menuBackgroundColor = undefined
          }}
          uiTransform={{
            width: this.fontSize * 2,
            height: this.fontSize * 2,
            margin: { right: this.fontSize * 0.5 }
          }}
          backgroundColor={this.menuBackgroundColor}
          icon={{ atlasName: 'icons', spriteName: 'Menu' }}
          iconSize={this.fontSize * 1.5}
        />
      </UiEntity>
    )
  }

  debugPanel(): ReactEcs.JSX.Element | null {
    return (
      <UiEntity
        uiTransform={{
          display: this.isExpanded ? 'flex' : 'none',
          width: '95%',
          height: 'auto',
          flexDirection: 'column'
        }}
      >
        {/* FPS */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: 'row'
          }}
        >
          <Label value="FPS" fontSize={this.fontSize * 0.7} />
          <Label
            value={this.fpsValue.toString()}
            fontSize={this.fontSize * 0.7}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{ width: '100%', height: 1 }}
          uiBackground={{ color: { ...ALMOST_WHITE, a: 0.01 } }}
        />

        {/* UNIQUE GLTF MESHES */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: 'row'
          }}
        >
          <Label value="Unique GLTF Meshes" fontSize={this.fontSize * 0.7} />
          <Label
            value={this.uniqueGltfMeshesValue.toString()}
            fontSize={this.fontSize * 0.7}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{ width: '100%', height: 1 }}
          uiBackground={{ color: { ...ALMOST_WHITE, a: 0.01 } }}
        />

        {/* VISIBLE MESH COUNT */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: 'row'
          }}
        >
          <Label value="Visible Mesh Count" fontSize={this.fontSize * 0.7} />
          <Label
            value={this.visibleMeshCountValue.toString()}
            fontSize={this.fontSize * 0.7}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{ width: '100%', height: 1 }}
          uiBackground={{ color: { ...ALMOST_WHITE, a: 0.01 } }}
        />

        {/* VISIBLE TRIANGLE COUNT */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: 'row'
          }}
        >
          <Label
            value="Visible Triangle Count"
            fontSize={this.fontSize * 0.7}
          />
          <Label
            value={this.visibleTriangleCountValue.toString()}
            fontSize={this.fontSize * 0.7}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{ width: '100%', height: 1 }}
          uiBackground={{ color: { ...ALMOST_WHITE, a: 0.01 } }}
        />

        {/* UNIQUE GLTF MATERIALS */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: 'row'
          }}
        >
          <Label value="Unique GLTF Materials" fontSize={this.fontSize * 0.7} />
          <Label
            value={this.uniqueGltfMaterialsValue.toString()}
            fontSize={this.fontSize * 0.7}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{ width: '100%', height: 1 }}
          uiBackground={{ color: { ...ALMOST_WHITE, a: 0.01 } }}
        />

        {/* VISIBLE MATERIAL COUNT */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: 'row'
          }}
        >
          <Label
            value="Visible Material Count"
            fontSize={this.fontSize * 0.7}
          />
          <Label
            value={this.visibleMaterialCountValue.toString()}
            fontSize={this.fontSize * 0.7}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{ width: '100%', height: 1 }}
          uiBackground={{ color: { ...ALMOST_WHITE, a: 0.01 } }}
        />

        {/* TOTAL TEXTURE COUNT */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: 'row'
          }}
        >
          <Label value="Total Texture Count" fontSize={this.fontSize * 0.7} />
          <Label
            value={this.totalTextureCountValue.toString()}
            fontSize={this.fontSize * 0.7}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{ width: '100%', height: 1 }}
          uiBackground={{ color: { ...ALMOST_WHITE, a: 0.01 } }}
        />

        {/* TOTAL TEXTURE MEMORY */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: 'row'
          }}
        >
          <Label value="Total Texture Memory" fontSize={this.fontSize * 0.7} />
          <Label
            value={this.totalTextureMemoryValue.toString() + 'mb'}
            fontSize={this.fontSize * 0.7}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{ width: '100%', height: 1 }}
          uiBackground={{ color: { ...ALMOST_WHITE, a: 0.01 } }}
        />

        {/* TOTAL ENTITIES */}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: 'row'
          }}
        >
          <Label value="Total Entities" fontSize={this.fontSize * 0.7} />
          <Label
            value={this.totalEntitiesValue.toString()}
            fontSize={this.fontSize * 0.7}
          />
        </UiEntity>
      </UiEntity>
    )
  }
}
