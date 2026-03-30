import { UiCanvasInformation, engine } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { type Callback, Label, UiEntity } from '@dcl/sdk/react-ecs'
import { ButtonText } from '../../../components/button-text'
import { type UIController } from '../../../controllers/ui.controller'
import {
  LEFT_PANEL_WIDTH_FACTOR,
  LEFT_PANEL_MIN_WIDTH,
  ALMOST_WHITE,
  ALMOST_BLACK,
  ROUNDED_TEXTURE_BACKGROUND
} from '../../../utils/constants'
import { FLEX_BASIS_AUTO, getBackgroundFromAtlas } from '../../../utils/ui-utils'

export default class WarningPopUp {
  private readonly uiController: UIController
  public fontSize: number = 14
  public icon: 'WarningColor' | 'DdlIconColor' = 'DdlIconColor'
  public tittle: string | undefined
  public message: string | undefined
  public action: Callback | undefined

  acceptBackground: Color4 = Color4.Black()

  constructor(uiController: UIController) {
    this.uiController = uiController
  }

  acceptEnter(): void {
    this.acceptBackground = { ...Color4.Black(), a: 0.8 }
  }

  acceptAction(): void {
    if (this.action !== undefined) {
      this.action()
      this.action = undefined
    }
    this.hide()
    this.updateButtons()
    this.tittle = undefined
    this.message = undefined
  }

  updateButtons(): void {
    this.acceptBackground = Color4.Black()
  }

  show(): void {
    this.uiController.warningPopUpVisible = true
  }

  hide(): void {
    this.uiController.warningPopUpVisible = false
  }

  mainUi(): ReactEcs.JSX.Element | null {
    const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
    if (canvasInfo === null) return null
    if (this.message === undefined) return null

    let panelWidth: number

    if (canvasInfo.width * LEFT_PANEL_WIDTH_FACTOR < LEFT_PANEL_MIN_WIDTH) {
      panelWidth = LEFT_PANEL_MIN_WIDTH
    } else {
      panelWidth = canvasInfo.width * LEFT_PANEL_WIDTH_FACTOR
    }

    let panelHeight: number

    if (canvasInfo.height * 0.2 < 250) {
      panelHeight = 250
    } else {
      panelHeight = canvasInfo.height * 0.2
    }

    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          positionType: 'absolute'
        }}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            height: '100%',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          uiBackground={{
            color: { ...Color4.Black(), a: 0.9 }
          }}
        >
          <UiEntity
            uiTransform={{
              padding: {
                top: panelHeight * 0.05,
                bottom: panelHeight * 0.1
              },

              width: panelWidth,
              height: 'auto',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
            uiBackground={{
              ...ROUNDED_TEXTURE_BACKGROUND,
              color: { ...ALMOST_WHITE, a: 0.9 }
            }}
          >
            {/* ERROR AREA */}
            <UiEntity
              uiTransform={{
                flexDirection: 'column',

                width: panelWidth * 0.8,
                height: panelHeight * 0.4,
                flexGrow: 1,
                ...FLEX_BASIS_AUTO
              }}
            >
              <UiEntity
                uiTransform={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  width: panelWidth * 0.8,
                  margin: { bottom: this.fontSize * 0.5 }
                }}
              >
                {/* ICON */}
                <UiEntity
                  uiTransform={{
                    width: this.fontSize * 3,
                    height: this.fontSize * 3
                  }}
                >
                  <UiEntity
                    uiBackground={{
                      ...getBackgroundFromAtlas({
                        atlasName: 'icons',
                        spriteName: this.icon
                      })
                    }}
                    uiTransform={{
                      width: '100%',
                      height: '100%'
                    }}
                  />
                </UiEntity>

                {/* TITTLE */}
                <Label
                  uiTransform={{
                    width: '50%',
                    flexGrow: 1,
                    ...FLEX_BASIS_AUTO
                  }}
                  value={this.tittle ?? ''}
                  color={Color4.Black()}
                  fontSize={this.fontSize * 1.2}
                  textAlign="middle-left"
                />
              </UiEntity>
              {/* SCROLLEABLE AREA */}
              <UiEntity
                uiTransform={{
                  flexDirection: 'column',
                  width: '100%',
                  height: 'auto',
                  maxHeight: panelHeight * 0.4,
                  flexGrow: 1,
                  ...FLEX_BASIS_AUTO,
                  overflow: 'scroll'
                }}
              >
                {/* MESSAGE */}
                <Label
                  uiTransform={{
                    padding: {
                      right: this.fontSize,
                      left: this.fontSize * 0.5
                    },
                    flexGrow: 1,
                    ...FLEX_BASIS_AUTO,
                    minHeight: this.fontSize * 4
                  }}
                  value={this.message}
                  color={ALMOST_BLACK}
                  fontSize={this.fontSize}
                  textAlign="middle-left"
                />
              </UiEntity>
            </UiEntity>

            {/* BUTTON */}
            <ButtonText
              uiTransform={{
                padding: {
                  bottom: this.fontSize * 0.5,
                  top: this.fontSize * 0.5,
                  left: this.fontSize,
                  right: this.fontSize
                }
              }}
              onMouseDown={() => {
                this.acceptAction()
              }}
              onMouseEnter={() => {
                this.acceptEnter()
              }}
              onMouseLeave={() => {
                this.updateButtons()
              }}
              backgroundColor={this.acceptBackground}
              value={'ACCEPT'}
              fontSize={this.fontSize * 0.8}
            />
          </UiEntity>
        </UiEntity>
      </UiEntity>
    )
  }
}
