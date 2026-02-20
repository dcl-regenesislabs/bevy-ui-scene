import { engine, executeTask, UiCanvasInformation } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { type Callback, UiEntity } from '@dcl/sdk/react-ecs'
import { openExternalUrl } from '~system/RestrictedActions'
import { BevyApi } from '../../bevy-api'
import { ArrowToast } from '../../components/arrow-toast'
import { ButtonText } from '../../components/button-text'
import { ButtonTextIcon } from '../../components/button-text-icon'
import { type UIController } from '../../controllers/ui.controller'
import {
  ALMOST_BLACK,
  ALMOST_WHITE,
  CLICKED_PRIMARY_COLOR,
  RUBY
} from '../../utils/constants'
import { getBackgroundFromAtlas } from '../../utils/ui-utils'
import { noop } from '../../utils/function-utils'
import { store } from '../../state/store'
import { showErrorPopup } from '../../service/error-popup-service'
import { createTween } from '../../service/tween'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'

type StatusType =
  | 'loading'
  | 'sign-in-or-guest'
  | 'reuse-login-or-new'
  | 'secure-step'
const state = {
  loading: false
}
export default class LoadingAndLogin {
  private status: StatusType = 'loading'

  private isLogoVisible: boolean = true
  private isBackButtonVisible: boolean = false
  private isFirstButtonVisible: boolean = false
  private isSecondButtonVisible: boolean = false
  private isSpinnerVisible: boolean = false

  private firstButtonBackground: Color4 = RUBY
  private secondButtonBackground: Color4 = ALMOST_BLACK

  readonly firstButtonLoading: boolean = false
  readonly secondButtonLoading: boolean = false

  private titleText: string = ''
  private subtitleText: string = ''
  private parragraphText: string = ''
  private codeText: string = ''
  private firstButtonText: string = ''
  private secondButtonText: string = ''
  private opacity: number = 0

  private firstButtonAction: () => void = () => {}
  private secondButtonAction: () => void = () => {}
  private backButtonAction: () => void = () => {}

  private backgroundGradientSrc: string =
    'assets/images/login/horizontal-violet-gradient.png'

  private isVisible: boolean = false
  private toastOpen: boolean = false
  readonly countDown: string = '5:00'
  public timer: number = 2
  private readonly uiController: UIController

  onFinishCallback: Callback = noop

  public onFinish(callback: Callback): void {
    this.onFinishCallback = callback
  }

  constructor(uiController: UIController) {
    this.uiController = uiController
  }

  startLoading(): void {
    this.status = 'loading'
    this.updateLayout()
    this.isVisible = true

    const startTween = createTween({ startValue: 0, endValue: 1, time: 1 })
    startTween.onUpdate((value) => {
      this.opacity = value
    })
    startTween.onComplete(() => {
      this.opacity = 1
      startTween.cancel()
    })
  }

  finishLoading(): void {
    this.isVisible = false
    this.onFinishCallback()
  }

  visible(): boolean {
    return this.isVisible
  }

  updateLayout(): void {
    this.firstButtonBackground = RUBY
    this.secondButtonBackground = ALMOST_BLACK

    this.firstButtonAction = () => {
      console.log('first button action')
    }

    this.secondButtonAction = () => {
      console.log('second button action')
    }

    this.backButtonAction = () => {
      console.log('back button action')
    }

    switch (this.status) {
      case 'loading':
        break

      case 'sign-in-or-guest':
        this.backgroundGradientSrc =
          'assets/images/login/horizontal-violet-gradient.png'
        this.isBackButtonVisible = false
        this.isFirstButtonVisible = true
        this.isSecondButtonVisible = true
        this.isLogoVisible = true
        this.isSpinnerVisible = false
        this.titleText = 'Discover a virtual social world'
        this.subtitleText = 'shaped by its community of\ncreators & explorers.'
        this.parragraphText = ''
        this.codeText = ''
        this.firstButtonText = 'START WITH ACCOUNT'
        this.firstButtonAction = () => {
          if (state.loading) return
          executeTask(async () => {
            try {
              state.loading = true
              const loginNewREsponse = BevyApi.loginNew()
              const { code: getCode, success: getSuccess } = loginNewREsponse
              getCode.catch(showErrorPopup)
              getSuccess.catch(console.error)

              const code = await getCode

              this.codeText = code.toString()
              this.setStatus('secure-step')
              await getSuccess
              this.finishLoading()
              state.loading = false
            } catch (error) {
              state.loading = false
              console.error(error)
            }
          })
        }
        this.secondButtonText = 'EXPLORE AS GUEST'
        this.secondButtonAction = () => {
          console.log('login guest')
          BevyApi.loginGuest()
          this.finishLoading()
        }
        break

      case 'secure-step':
        this.backgroundGradientSrc =
          'assets/images/login/horizontal-violet-gradient.png'
        this.isBackButtonVisible = true
        this.isFirstButtonVisible = false
        this.isSecondButtonVisible = false
        this.isLogoVisible = false
        this.isSpinnerVisible = false
        this.titleText = 'Secure sign-in step'
        this.subtitleText = ''

        this.parragraphText =
          'Remember the verification number below.\nYou’ll be prompted to confirm it in your\nweb browser to securely link your sign in.'

        this.backButtonAction = () => {
          BevyApi.loginCancel()
          this.setStatus('sign-in-or-guest')
        }
        break

      case 'reuse-login-or-new':
        // TODO: this is a temporary background, we need to change it to the avatar panel
        // this.backgroundGradientSrc =
        //   'assets/images/login/background-avatar-alpha.png'
        this.backgroundGradientSrc =
          'assets/images/login/horizontal-violet-gradient.png'
        this.isBackButtonVisible = false
        this.isFirstButtonVisible = true
        this.isSecondButtonVisible = true
        this.isLogoVisible = true
        this.isSpinnerVisible = false
        this.titleText = 'Welcome back!'
        this.subtitleText = 'Ready to explore?'
        this.parragraphText = ''
        this.codeText = ''
        this.firstButtonText = 'JUMP INTO DECENTRALAND'
        this.firstButtonAction = () => {
          if (state.loading) return
          state.loading = true
          BevyApi.loginPrevious()
            .then(() => {
              state.loading = false
              this.finishLoading()
            })
            .catch((error) => {
              state.loading = false
              console.error(error)
              // TODO consider removing commented code along with related code

              /*  this.uiController.warningPopUp.message = error.message
              this.uiController.warningPopUp.tittle =
                'Error logging in with previous account:'
              this.uiController.warningPopUp.action = () => {
                this.setStatus('sign-in-or-guest')
              }
              this.uiController.warningPopUp.icon = 'WarningColor'
              this.uiController.warningPopUp.show() */

              showErrorPopup(error, 'BevyApi.loginPrevious')
              this.setStatus('sign-in-or-guest')
            })
        }
        this.secondButtonText = 'USE DIFFERENT ACCOUNT'
        this.secondButtonAction = () => {
          this.setStatus('sign-in-or-guest')
        }
        break

      default:
        this.backgroundGradientSrc =
          'assets/images/login/horizontal-violet-gradient.png'
        this.isBackButtonVisible = false
        this.isLogoVisible = true
        break
    }
  }

  setStatus(newStatus: StatusType): void {
    this.status = newStatus
    this.updateLayout()
  }

  async openLink(url: string): Promise<void> {
    await openExternalUrl({ url })
  }

  mainUi(): ReactEcs.JSX.Element | null {
    const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
    if (canvasInfo === null) return null
    if (store.getState().hud.loggedIn) return null
    const LOGO_SIZE: number = canvasInfo.height * 0.1

    // FONT SIZES
    const TITLE_FONT_SIZE: number = getFontSize({
      token: TYPOGRAPHY_TOKENS.TITLE_XL
    })
    const SUBTITLE_FONT_SIZE: number = getFontSize({
      token: TYPOGRAPHY_TOKENS.TITLE_L
    })
    const PARAGRAPH_FONT_SIZE: number = getFontSize({})
    const BUTTON_FONT_SIZE: number = getFontSize({})
    const CODE_FONT_SIZE: number = getFontSize({})

    // BUTTON SIZES
    const BUTTON_WIDTH: number = canvasInfo.height * 0.3

    const LEFT_PANEL_HEIGHT: number = canvasInfo.height * 0.5
    const LEFT_PANEL_WIDTH: number = canvasInfo.width * 0.3

    const HEADER_HEIGHT: number = LEFT_PANEL_HEIGHT * 0.15
    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          positionType: 'absolute',
          zIndex: 9999,
          opacity: this.opacity
        }}
        onMouseDown={noop}
      >
        {this.isVisible && (
          <UiEntity
            uiTransform={{
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: {
                src: 'assets/images/login/gradient-background.png'
              }
            }}
          >
            {this.status !== 'loading' && (
              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: '100%',
                  positionType: 'absolute'
                }}
                uiBackground={{
                  textureMode: 'stretch',
                  texture: {
                    src: 'assets/images/login/background.png'
                  }
                }}
              />
            )}

            {this.status !== 'loading' && (
              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: '100%',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  flexDirection: 'column'
                  // padding: { left: '15%' }
                }}
                uiBackground={{
                  //  color: {...Color4.Green(), a:0.5},
                  textureMode: 'stretch',
                  texture: {
                    src: this.backgroundGradientSrc
                  }
                }}
              >
                {/* FLOATING BUTTON */}
                {/* <UiEntity
                  uiTransform={{
                    display: this.status === 'secure-step' ? 'flex' : 'none',
                    width: '150',
                    height: '30',
                    positionType: 'absolute',
                    position: { top: '5%', right: '5%' }
                  }}
                  uiBackground={{ color: Color4.create(0, 0, 0, 0.1) }}
                  uiText={{ value: 'click YES in the verification window' }}
                  onMouseDown={() => {
                    this.fetchData()
                  }}
                  /> */}
                {/* AVATAR PANEL */}
                {/* TODO: this will be implemented when avatar preview is implemented for UI :) */}
                {/* {this.status === 'reuse-login-or-new' && (
                  <UiEntity
                    uiTransform={{
                      positionType: 'absolute',
                      position: { top: 0, right: '23%' },
                      width: AVATAR_PANEL_WIDTH,
                      height: AVATAR_PANEL_HEIGHT,
                      flexDirection: 'column-reverse',
                      alignItems: 'center'
                    }}
                    // uiBackground={{ color: { ...Color4.Green(), a: 0.5 } }}
                  >
                    <UiEntity
                      uiTransform={{
                        width: AVATAR_PANEL_WIDTH,
                        height: AVATAR_PANEL_WIDTH * 0.37
                      }}
                      uiBackground={{
                        //  color: {...Color4.Green(), a:0.5},
                        textureMode: 'stretch',
                        texture: {
                          src: 'assets/images/login/platform.png'
                        }
                      }}
                    />
                  </UiEntity>
                )} */}

                {/* LEFT PANEL */}
                <UiEntity
                  uiTransform={{
                    display: 'flex',
                    width: LEFT_PANEL_WIDTH,
                    minWidth: 480,
                    height: LEFT_PANEL_HEIGHT,
                    flexDirection: 'column',
                    margin: {
                      left: Math.min(
                        canvasInfo.width * 0.15,
                        (canvasInfo.width - LEFT_PANEL_WIDTH) / 2
                      )
                    }
                  }}
                  // uiBackground={{ color: { ...Color4.Red(), a: 0.5 } }}
                >
                  {/* HEADER */}
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      height: HEADER_HEIGHT,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                    // uiBackground={{ color: Color4.Red() }}
                  >
                    {/* BACK BUTTON */}
                    <ButtonTextIcon
                      uiTransform={{
                        margin: 0,
                        display: this.isBackButtonVisible ? 'flex' : 'none',
                        width: BUTTON_WIDTH / 3
                      }}
                      iconColor={RUBY}
                      icon={{ atlasName: 'icons', spriteName: 'LeftArrow' }}
                      onMouseDown={this.backButtonAction}
                      value={'BACK'}
                      fontSize={BUTTON_FONT_SIZE}
                      fontColor={ALMOST_BLACK}
                      onMouseEnter={function (): void {
                        // throw new Error('Function not implemented.')
                      }}
                      onMouseLeave={function (): void {
                        // throw new Error('Function not implemented.')
                      }}
                      backgroundColor={ALMOST_WHITE}
                    />
                    {/* LOGO DECENTRALAND */}
                    <UiEntity
                      uiTransform={{
                        display: this.isLogoVisible ? 'flex' : 'none',
                        width: HEADER_HEIGHT * 5.3 * 0.55,
                        height: HEADER_HEIGHT * 0.55
                      }}
                      uiBackground={{
                        textureMode: 'stretch',
                        texture: {
                          src: 'assets/images/login/logo-with-text.png'
                        }
                      }}
                    />
                  </UiEntity>

                  {/* CONTENT */}
                  <UiEntity
                    uiTransform={{
                      width: '100%',
                      minWidth: 479.9,
                      flexDirection: 'column'
                    }}
                    // uiBackground={{ color: {...Color4.Blue(), a:0.5} }}
                  >
                    {/* TITLE */}

                    <UiEntity
                      // uiBackground={{ color: {...Color4.Yellow(), a:0.5} }}
                      uiTransform={{
                        display: this.titleText !== '' ? 'flex' : 'none',
                        width: '100%',
                        height: 'auto'
                      }}
                      uiText={{
                        value: this.titleText,
                        fontSize: TITLE_FONT_SIZE,
                        textAlign: 'middle-left'
                      }}
                    />

                    {/* SUBTITLE */}
                    <UiEntity
                      // uiBackground={{ color: {...Color4.Purple(), a:0.5} }}
                      uiTransform={{
                        display: this.subtitleText !== '' ? 'flex' : 'none',
                        width: '100%',
                        height: 'auto'
                      }}
                      uiText={{
                        value: this.subtitleText,
                        fontSize: SUBTITLE_FONT_SIZE,
                        textAlign: 'middle-left'
                      }}
                    />
                    {/* END SUBTITLE */}

                    {/* PARRAGRAPH */}
                    <UiEntity
                      // uiBackground={{ color: {...Color4.Black(), a:0.5} }}
                      uiTransform={{
                        display: this.parragraphText !== '' ? 'flex' : 'none',
                        width: '100%',
                        height: 'auto'
                      }}
                      uiText={{
                        value: this.parragraphText,
                        fontSize: PARAGRAPH_FONT_SIZE,
                        textAlign: 'middle-left'
                      }}
                    />
                    {/* END PARRAGRAPH */}

                    {/* CODE SPACE */}
                    {this.status === 'secure-step' && (
                      <UiEntity
                        uiTransform={{
                          width: '100%',
                          justifyContent: 'flex-start',
                          alignItems: 'center',
                          flexDirection: 'column'
                        }}
                        // uiBackground={{ color:{...Color4.Gray(), a:0.5}}}
                      >
                        <UiEntity
                          uiTransform={{
                            width: '100%',
                            height: CODE_FONT_SIZE,
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            flexDirection: 'row'
                          }}
                        >
                          <UiEntity
                            uiTransform={{
                              width: 'auto',
                              // width: CODE_FONT_SIZE * 1.5,
                              height: CODE_FONT_SIZE
                              // margin: { left: PARAGRAPH_FONT_SIZE * 0.5 }
                            }}
                            uiText={{
                              value: this.codeText,
                              fontSize: CODE_FONT_SIZE,
                              textAlign: 'middle-left',
                              font: 'monospace'
                            }}
                          />
                          <UiEntity
                            uiTransform={{
                              width: PARAGRAPH_FONT_SIZE,
                              height: PARAGRAPH_FONT_SIZE,
                              margin: { left: PARAGRAPH_FONT_SIZE },
                              alignItems: 'center',
                              flexDirection: 'row'
                            }}
                            uiBackground={getBackgroundFromAtlas({
                              atlasName: 'icons',
                              spriteName: 'InfoButton'
                            })}
                            onMouseDown={() => {
                              this.toastOpen = !this.toastOpen
                            }}
                          >
                            <ArrowToast
                              uiTransform={{
                                display: this.toastOpen ? 'flex' : 'none',
                                width: CODE_FONT_SIZE * 2.2,
                                height: CODE_FONT_SIZE * 0.75,
                                positionType: 'absolute',
                                position: { left: PARAGRAPH_FONT_SIZE }
                              }}
                              text={
                                'Keep this number private. It ensures that your sign-in is secure and unique to you.'
                              }
                              fontSize={PARAGRAPH_FONT_SIZE}
                              arrowSide={'left'}
                            />
                          </UiEntity>
                        </UiEntity>
                        {/* EXPIRATION TIME */}
                        <UiEntity
                          uiTransform={{
                            width: '100%',
                            height: PARAGRAPH_FONT_SIZE
                          }}
                          uiText={{
                            value:
                              'Verification number will expire in ' +
                              this.countDown +
                              ' minutes',
                            fontSize: PARAGRAPH_FONT_SIZE,
                            textAlign: 'middle-left'
                          }}
                        />
                      </UiEntity>
                    )}
                    {/* END CODE SPACE */}
                    {/* BUTTONS & SPINNER */}
                    <UiEntity
                      uiTransform={{
                        width: BUTTON_WIDTH,
                        flexDirection: 'column',
                        alignItems: this.isSpinnerVisible
                          ? 'center'
                          : 'flex-start'
                      }}
                      // uiBackground={{ color: {...Color4.Red(), a:0.2} }}
                    >
                      {/* SPINNER */}
                      {this.isSpinnerVisible && (
                        <UiEntity
                          uiTransform={{
                            width: BUTTON_WIDTH / 4,
                            height: BUTTON_WIDTH / 4
                          }}
                          uiBackground={{
                            textureMode: 'stretch',
                            texture: { src: 'assets/images/spinner.png' }
                          }}
                        />
                      )}

                      {/* FIRST BUTTON */}
                      {this.isFirstButtonVisible && (
                        <ButtonText
                          uiTransform={{
                            width: BUTTON_WIDTH,
                            padding: BUTTON_FONT_SIZE * 0.3,
                            margin: BUTTON_FONT_SIZE * 0.3
                          }}
                          backgroundColor={this.firstButtonBackground}
                          isLoading={this.firstButtonLoading}
                          onMouseDown={this.firstButtonAction}
                          onMouseEnter={() =>
                            (this.firstButtonBackground = CLICKED_PRIMARY_COLOR)
                          }
                          onMouseLeave={() =>
                            (this.firstButtonBackground = RUBY)
                          }
                          value={this.firstButtonText}
                          fontSize={BUTTON_FONT_SIZE}
                        />
                      )}

                      {/* SECOND BUTTON */}
                      {this.isSecondButtonVisible && (
                        <ButtonText
                          uiTransform={{
                            width: BUTTON_WIDTH,
                            padding: BUTTON_FONT_SIZE * 0.3,
                            margin: BUTTON_FONT_SIZE * 0.3
                          }}
                          backgroundColor={this.secondButtonBackground}
                          isLoading={this.secondButtonLoading}
                          onMouseDown={this.secondButtonAction}
                          onMouseEnter={() =>
                            (this.secondButtonBackground = Color4.Gray())
                          }
                          onMouseLeave={() =>
                            (this.secondButtonBackground = ALMOST_BLACK)
                          }
                          value={this.secondButtonText}
                          fontSize={BUTTON_FONT_SIZE}
                        />
                      )}
                    </UiEntity>
                    {/* END BUTTONS & SPINNER */}
                  </UiEntity>
                </UiEntity>
              </UiEntity>
            )}

            {this.status === 'loading' && (
              <UiEntity
                uiTransform={{
                  width: '100%',
                  height: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'column'
                }}
              >
                <UiEntity
                  uiTransform={{
                    width: LOGO_SIZE,
                    height: LOGO_SIZE,
                    display: 'flex'
                  }}
                  uiBackground={{
                    textureMode: 'stretch',
                    texture: { src: 'assets/images/logo.png' }
                  }}
                />

                {/* <UiEntity
                  uiTransform={{
                    width: '150',
                    height: '30',
                    positionType: 'absolute',
                    position: { top: '5%', right: '5%' }
                  }}
                  uiBackground={{ color: Color4.create(0, 0, 0, 0.1) }}
                  uiText={{ value: 'skip loading screen' }}
                  onMouseDown={() => {
                    this.status = 'sign-in-or-guest'
                    this.updateLayout()
                  }}
                /> */}
              </UiEntity>
            )}
          </UiEntity>
        )}
      </UiEntity>
    )
  }
}
