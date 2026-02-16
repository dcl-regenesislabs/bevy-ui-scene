import { engine, executeTask, UiCanvasInformation } from '@dcl/sdk/ecs'
import { Color4, Vector2, type Vector3 } from '@dcl/sdk/math'
import ReactEcs, {
  type Callback,
  Label,
  UiEntity,
  type UiTransformProps
} from '@dcl/sdk/react-ecs'
import {
  loadEventsFromApi,
  loadEventsToAttendFromApi,
  loadPhotosFromApi,
  loadSceneInfoPlaceFromApi
} from 'src/state/sceneInfo/actions'
import { store } from 'src/state/store'
import {
  createAttendee,
  fetchEvents,
  fetchPhotos,
  fetchPhotosQuantity,
  fetchPlaceFromApi,
  fetchPlaceFromCoords,
  removeAttendee,
  updateFavoriteStatus,
  updateLikeStatus
} from 'src/utils/promise-utils'
import {
  changeRealm,
  copyToClipboard,
  openExternalUrl,
  teleportTo
} from '~system/RestrictedActions'
import { ButtonIcon } from '../../components/button-icon'
import { ButtonTextIcon } from '../../components/button-text-icon'
import {
  getUiController,
  type UIController
} from '../../controllers/ui.controller'
import {
  ALMOST_BLACK,
  BLACK_TEXT,
  DCL_SNOW,
  EVENT_BACKGROUND_COLOR,
  GRAY_TEXT,
  LOADING_PLACE,
  PANEL_BACKGROUND_COLOR,
  ROUNDED_TEXTURE_BACKGROUND,
  RUBY,
  SELECTED_BUTTON_COLOR
} from '../../utils/constants'
import type { AtlasIcon } from '../../utils/definitions'
import {
  formatEventTime,
  getBackgroundFromAtlas,
  getTimestamp,
  parseCoordinates,
  truncateWithoutBreakingWords
} from '../../utils/ui-utils'
import type {
  CategoryFromApi,
  EventFromApi,
  PlaceFromApi
} from './SceneInfoCard.types'
import { getRightPanelWidth } from '../../service/canvas-ratio'
import { closeBigMapIfActive } from '../../service/map/map-camera'
import { MAP_FILTER_DEFINITIONS } from '../../components/map/map-definitions'
import { type PlaceRepresentation } from '../main-hud/big-map/big-map-view'
import { currentRealmProviderIsWorld } from '../../service/realm-change'
import { Row } from '../../components/layout'
import { COLOR } from '../../components/color-palette'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../service/fontsize-system'

export default class SceneInfoCard {
  public place: PlaceFromApi | undefined =
    store.getState().scene.sceneInfoCardPlace

  public interestedEvents: EventFromApi[] =
    store.getState().scene.explorerEventsToAttend

  private updating: boolean = false
  private alpha: number = 1
  private photosQuantityInPlace: number = 0
  private readonly uiController: UIController
  private scrollPos: Vector2 = Vector2.create(0, 0)
  public fontSize: number = 10
  public isFav: boolean = false
  public isLiked: boolean = false
  public isDisliked: boolean = false
  public favIcon: AtlasIcon = {
    atlasName: 'toggles',
    spriteName: 'HeartOffOutlined'
  }

  public shareIcon: AtlasIcon = {
    atlasName: 'context',
    spriteName: 'Share'
  }

  public likeIcon: AtlasIcon = { atlasName: 'icons', spriteName: 'Like' }
  public dislikeIcon: AtlasIcon = {
    atlasName: 'icons',
    spriteName: 'Dislike'
  }

  public closeBackground: Color4 | undefined
  public setFavBackgroundColor: Color4 = DCL_SNOW
  public likeBackgroundColor: Color4 = DCL_SNOW
  public dislikeBackgroundColor: Color4 = DCL_SNOW
  public shareBackgroundColor: Color4 = DCL_SNOW

  public selectedTab: 'overview' | 'photos' | 'events' = 'overview'
  public areInterestedButtonsLocked: boolean = false
  public isShareMenuOpen: boolean = false
  public eventShareMenuOpenIndex: number | undefined = undefined
  public eventShareEnter: number | undefined = undefined
  public eventInterestedEnter: number | undefined = undefined

  constructor(uiController: UIController) {
    this.uiController = uiController
  }

  async update(): Promise<void> {
    this.place = store.getState().scene.sceneInfoCardPlace
    if (this.place === undefined) return

    this.photosQuantityInPlace = 0
    fetchPhotosQuantity(this.place.id)
      .then((result) => {
        this.photosQuantityInPlace = result
      })
      .catch(console.error)

    let eventsArray: EventFromApi[]
    try {
      eventsArray = await fetchEvents(this.place.positions)
    } catch (error) {
      console.error('Error fetching events:', error)
      eventsArray = []
    }

    const interestedEvents = eventsArray.filter((event) => event.attending)

    store.dispatch(loadEventsFromApi(eventsArray))
    store.dispatch(loadEventsToAttendFromApi(interestedEvents))

    this.isFav = this.place.user_favorite ?? false
    this.isLiked = this.place.user_like ?? false
    this.isDisliked = this.place.user_dislike ?? false
    this.interestedEvents = store.getState().scene.explorerEventsToAttend
    this.updateIcons()
  }

  async interestedOnMouseDown(event: EventFromApi): Promise<void> {
    if (
      this.interestedEvents.some(
        (interestedEvent) => interestedEvent.id === event.id
      )
    ) {
      this.interestedEvents = this.interestedEvents.filter(
        (interestedEvents) => interestedEvents.id !== event.id
      )
      await removeAttendee(event.id)
    } else {
      this.interestedEvents.push(event)
      await createAttendee(event.id)
    }
    await this.update()
  }

  toggleFav(): void {
    if (this.updating) return
    if (this.place?.id === undefined) return
    this.setUpdating(true)
    updateFavoriteStatus(this.place.id, !this.isFav)
      .then(async () => {
        try {
          await this.refreshPlaceFromApi()
        } catch (error) {
          console.error(error)
        }
        this.updateIcons()
        this.setUpdating(false)
        this.resetBackgrounds()
      })
      .catch((reason) => {
        this.setUpdating(false)
        this.resetBackgrounds()
      })
  }

  setLikeStatus(arg: 'like' | 'dislike' | 'null'): void {
    if (this.updating) return
    if (this.place?.id === undefined) return
    this.setUpdating(true)
    let updateArg: boolean | null
    switch (arg) {
      case 'like':
        updateArg = true
        break
      case 'dislike':
        updateArg = false
        break
      case 'null':
        updateArg = null
        break
    }
    updateLikeStatus(this.place.id, updateArg)
      .then(async () => {
        try {
          await this.refreshPlaceFromApi()
        } catch (error) {
          console.error(error)
        }
        this.updateIcons()
        this.setUpdating(false)
        this.resetBackgrounds()
      })
      .catch((reason) => {
        this.setUpdating(false)
        this.resetBackgrounds()
      })
  }

  callbacks: { onHide: Callback[]; onShow: Callback[] } = {
    onHide: [],
    onShow: []
  }

  onHide(fn: Callback): () => Callback[] {
    this.callbacks.onHide.push(fn)
    return () =>
      (this.callbacks.onHide = this.callbacks.onHide.filter((i) => i !== fn))
  }

  onShow(fn: Callback): () => Callback[] {
    this.callbacks.onShow.push(fn)
    return () =>
      (this.callbacks.onShow = this.callbacks.onShow.filter((i) => i !== fn))
  }

  async showByCoords(coords: Vector3): Promise<boolean> {
    try {
      this.uiController.sceneInfoCardVisible = true
      this.place = LOADING_PLACE

      const auxPlace = await fetchPlaceFromCoords(coords)

      await this.setPlace(auxPlace)
      this.callbacks.onShow.forEach((f) => {
        f()
      })
    } catch (error) {
      console.error(error)
      return false
    }

    return true
  }

  async showByData(
    auxPlace: PlaceFromApi | PlaceRepresentation
  ): Promise<boolean> {
    this.uiController.sceneInfoCardVisible = true

    await this.setPlace(auxPlace as PlaceFromApi)
    // store.dispatch(loadSceneInfoPlaceFromApi(auxPlace as PlaceFromApi))
    this.callbacks.onShow.forEach((f) => {
      f()
    })

    return true
  }

  async showByState(): Promise<void> {
    const place = store.getState().scene.explorerPlace
    if (place) {
      await this.setPlace(place)
      this.uiController.sceneInfoCardVisible = true
    } else {
      // TODO: Handle empty parcel
      console.error('Place is undefined')
    }
  }

  async refreshPlaceFromApi(): Promise<void> {
    const place = store.getState().scene.explorerPlace
    if (place === undefined) return
    const auxPlace = await fetchPlaceFromApi(place.id)
    await this.setPlace(auxPlace)
  }

  async setPlace(place: PlaceFromApi): Promise<void> {
    store.dispatch(loadSceneInfoPlaceFromApi(place))
    await this.update()
  }

  hide(): void {
    this.uiController.sceneInfoCardVisible = false
    this.resetBackgrounds()
    this.callbacks.onHide.forEach((f) => {
      f()
    })
  }

  resetBackgrounds(): void {
    this.closeBackground = undefined
    if (!this.updating) {
      this.likeBackgroundColor = DCL_SNOW
      this.dislikeBackgroundColor = DCL_SNOW
      this.setFavBackgroundColor = DCL_SNOW
    }
    if (!this.isShareMenuOpen) this.shareBackgroundColor = DCL_SNOW
  }

  setUpdating(arg: boolean): void {
    this.updating = arg
    if (this.updating) {
      this.alpha = 0.2
    } else {
      this.alpha = 1
    }
  }

  updateIcons(): void {
    if (this.isFav) {
      this.favIcon.spriteName = 'HeartOnOutlined'
    } else {
      this.favIcon.spriteName = 'HeartOffOutlined'
    }
    if (this.isLiked) {
      this.likeIcon.spriteName = 'Like solid'
    } else {
      this.likeIcon.spriteName = 'Like'
    }
    if (this.isDisliked) {
      this.dislikeIcon.spriteName = 'Dislike solid'
    } else {
      this.dislikeIcon.spriteName = 'Dislike'
    }
  }

  setTab(tab: 'overview' | 'photos' | 'events'): void {
    if (this.place === undefined) return
    if (tab === 'photos') {
      // TODO: add Pagination
      fetchPhotos(
        this.place.id,
        20 //
      )
        .then((photosArray) => {
          store.dispatch(loadPhotosFromApi(photosArray))
        })
        .catch(console.error)
    }
    this.scrollPos = Vector2.create(0, 0)
    this.selectedTab = tab
  }

  onLikeEnter(): void {
    this.likeBackgroundColor = SELECTED_BUTTON_COLOR
  }

  onDislikeEnter(): void {
    this.dislikeBackgroundColor = SELECTED_BUTTON_COLOR
  }

  onFavEnter(): void {
    this.setFavBackgroundColor = SELECTED_BUTTON_COLOR
  }

  onShareEnter(): void {
    this.shareBackgroundColor = SELECTED_BUTTON_COLOR
  }

  isVisible(): boolean {
    return !!this.place
  }

  mainUi(): ReactEcs.JSX.Element | null {
    const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
    if (canvasInfo === null) return null
    if (this.place === undefined) return null
    this.fontSize = getFontSize({})
    const panelWidth = getRightPanelWidth()

    return (
      <UiEntity
        uiTransform={{
          width: panelWidth,
          height: getUiController().menu.isOpen() ? '93.6%' : '100%',
          justifyContent: 'flex-start',
          alignItems: 'center',
          flexDirection: 'column',
          position: {
            right: 0,
            top: getUiController().menu.isOpen() ? '6.4%' : 0
          },
          positionType: 'absolute',
          pointerFilter: 'block',
          zIndex: 1
        }}
        uiBackground={{
          color: PANEL_BACKGROUND_COLOR
        }}
      >
        {this.topBar()}
        <UiEntity
          uiTransform={{
            width: panelWidth,
            minHeight: panelWidth * 0.75
          }}
          uiBackground={{
            textureMode: 'stretch',
            texture: {
              src: (this.place.image ?? '').replace(
                'https://camera-reel-service.decentraland.org/api/images/',
                'https://camera-reel-s3-bucket.decentraland.org/'
              )
            }
          }}
        />

        {/* CONTENT */}
        <UiEntity
          uiTransform={{
            width: '100%',
            overflow: 'scroll',
            scrollPosition: this.scrollPos,
            maxHeight: canvasInfo.height - panelWidth * 0.75,
            flexDirection: 'column'
          }}
          // uiBackground={{color:Color4.Red()}}
        >
          <UiEntity
            uiTransform={{
              width: '88%',
              height: 'auto',
              flexDirection: 'column',
              margin: { left: '3%' }
            }}
          >
            {this.sceneInfo()}
            {!this.place?.isFakePlace && this.tabsBar()}
            {!this.place?.isFakePlace &&
              this.selectedTab === 'overview' &&
              this.overviewContent()}
            {!this.place?.isFakePlace &&
              this.selectedTab === 'photos' &&
              this.photosContent(panelWidth)}
            {!this.place?.isFakePlace &&
              this.selectedTab === 'events' &&
              this.eventsContent()}
          </UiEntity>
        </UiEntity>
      </UiEntity>
    )
  }

  topBar(): ReactEcs.JSX.Element | null {
    if (!this.place) return null
    return (
      <UiEntity
        uiTransform={{
          height: 'auto',
          width: '100%',
          positionType: 'absolute',
          padding: this.fontSize / 4,
          position: { top: 0, left: 0 },
          justifyContent: 'flex-end',
          alignItems: 'center',
          zIndex: 1
        }}
        uiBackground={{ color: COLOR.BLACK }}
      >
        <ButtonIcon
          uiTransform={{
            height: this.fontSize * 1.5,
            width: this.fontSize * 1.5,
            positionType: 'absolute',
            position: { right: this.fontSize / 4 }
          }}
          onMouseEnter={() => {
            this.closeBackground = { ...ALMOST_BLACK, a: 0.8 }
          }}
          onMouseLeave={() => {
            this.resetBackgrounds()
          }}
          onMouseDown={() => {
            this.hide()
            /* executeTask(async () => {
              await sleep(10)
              store.dispatch(
                updateHudStateAction({
                  placeListActiveItem: null
                })
              )
            }) */
          }}
          backgroundColor={this.closeBackground}
          icon={{ atlasName: 'icons', spriteName: 'CloseIcon' }}
          iconSize={this.fontSize}
        />
        <Label
          value={this.place?.title ?? ''}
          fontSize={this.fontSize}
          textAlign="middle-center"
          uiTransform={{ width: '100%' }}
        />
      </UiEntity>
    )
  }

  tabsBar(): ReactEcs.JSX.Element {
    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          minHeight: 4 * this.fontSize,
          maxHeight: 4 * this.fontSize,
          flexDirection: 'column'
        }}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            minHeight: 1,
            margin: { top: this.fontSize }
          }}
          uiBackground={{ color: SELECTED_BUTTON_COLOR }}
        />

        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            justifyContent: 'space-around'
          }}
        >
          <UiEntity
            uiTransform={{
              width: '33%',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseDown={() => {
              this.setTab('overview')
            }}
          >
            <Label
              value={'OVERVIEW'}
              color={BLACK_TEXT}
              fontSize={this.fontSize}
            />
            <UiEntity
              uiTransform={{ width: '100%', height: 4 }}
              uiBackground={{
                color:
                  this.selectedTab === 'overview'
                    ? RUBY
                    : PANEL_BACKGROUND_COLOR
              }}
            />
          </UiEntity>

          <UiEntity
            uiTransform={{
              width: '33%',
              margin: 0,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseDown={() => {
              this.setTab('photos')
            }}
          >
            <Label
              value={'PHOTOS (' + this.photosQuantityInPlace + ')'}
              color={BLACK_TEXT}
              fontSize={this.fontSize}
            />
            <UiEntity
              uiTransform={{ width: '100%', height: 4 }}
              uiBackground={{
                color:
                  this.selectedTab === 'photos' ? RUBY : PANEL_BACKGROUND_COLOR
              }}
            />
          </UiEntity>

          <UiEntity
            uiTransform={{
              width: '33%',
              margin: 0,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseDown={() => {
              this.setTab('events')
            }}
          >
            <Label
              value={
                'EVENTS (' +
                Object.values(store.getState().scene?.explorerEvents ?? {})
                  .length +
                ')'
              }
              color={BLACK_TEXT}
              fontSize={this.fontSize}
            />
            <UiEntity
              uiTransform={{ width: '100%', height: 4 }}
              uiBackground={{
                color:
                  this.selectedTab === 'events' ? RUBY : PANEL_BACKGROUND_COLOR
              }}
            />
          </UiEntity>
        </UiEntity>
        <UiEntity
          uiTransform={{
            width: '100%',
            minHeight: 1,
            margin: { bottom: this.fontSize }
          }}
          uiBackground={{ color: SELECTED_BUTTON_COLOR }}
        />
      </UiEntity>
    )
  }

  sceneInfo(): ReactEcs.JSX.Element | null {
    if (this.place === undefined) return null
    const likeRate: number = this.place.like_rate ?? 0
    const TITLE_L_FONT_SIZE = getFontSize({ token: TYPOGRAPHY_TOKENS.TITLE_L })

    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          justifyContent: 'flex-start',
          flexDirection: 'column'
        }}
        // uiBackground={{color:Color4.Blue()}}
      >
        <UiEntity
          uiText={{
            value: `<b>${this.place?.title ?? ''}</b>`,
            fontSize: TITLE_L_FONT_SIZE,
            textAlign: 'middle-left',
            color: COLOR.TEXT_COLOR
          }}
          uiTransform={{
            width: '100%'
          }}
        />
        {this.place.contact_name && (
          <Label
            value={'Created by ' + this.place.contact_name}
            fontSize={this.fontSize}
            textAlign="middle-left"
            uiTransform={{
              width: '100%',
              height: 'auto'
            }}
            color={BLACK_TEXT}
          />
        )}
        {!this.place.isFakePlace && (
          <UiEntity
            uiTransform={{
              width: '100%',
              minHeight: this.fontSize * 2
            }}
          >
            {likeRate > 0 &&
              this.infoDetail(
                Math.round(likeRate * 100).toString() + '%',
                { atlasName: 'icons', spriteName: 'Like solid' },
                {
                  width: 'auto',
                  height: this.fontSize,
                  margin: { right: this.fontSize }
                },
                BLACK_TEXT
              )}
            {/* Need to implement last visitors portrait */}
            {this.infoDetail(
              (this.place.user_count ?? 0).toString(),
              { atlasName: 'icons', spriteName: 'Members' },
              {
                width: 'auto',
                height: this.fontSize,
                margin: { right: this.fontSize }
              },
              BLACK_TEXT
            )}

            {/* Need to implement number formating
          {this.infoDetail(
            this.place.user_visits.toString() + 'k',
            { atlasName: 'icons', spriteName: 'PreviewIcon' },
            {
              width: 'auto',
              height: this.fontSize,
              margin: { right: this.fontSize }
            },
            BLACK_TEXT
          )} */}
          </UiEntity>
        )}

        <ButtonTextIcon
          uiTransform={{
            width: '100%',
            height: 2 * this.fontSize,
            flexDirection: 'row-reverse'
          }}
          onMouseDown={() => {
            if (this.place === LOADING_PLACE) return
            if (this.place === undefined) return
            const coord = parseCoordinates(this.place.base_position)
            if (coord !== null) {
              executeTask(async () => {
                getUiController().menu.hide()
                // TODO take care of toggling scene ui ( BevyApi.showUI() )
                closeBigMapIfActive()

                if (this.place?.world && this.place?.world_name) {
                  await changeRealm({
                    realm: this.place.world_name
                  })
                } else if (currentRealmProviderIsWorld()) {
                  // TODO REVIEW if that URL is ok
                  await changeRealm({
                    realm: 'https://realm-provider.decentraland.org/main'
                  })
                }
                await teleportTo({
                  worldCoordinates: { x: coord.x, y: coord.y }
                })
              })
            }
          }}
          value={'JUMP IN'}
          backgroundColor={RUBY}
          fontSize={this.fontSize}
          iconSize={1.5 * this.fontSize}
          icon={{
            atlasName: 'icons',
            spriteName: 'JumpIn'
          }}
        />
        {!this.place.isFakePlace && (
          <UiEntity
            uiTransform={{
              width: '100%',
              height: 'auto',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: { top: this.fontSize * 0.5 }
            }}
          >
            <ButtonIcon
              uiTransform={{
                width: '23%'
              }}
              icon={this.likeIcon}
              backgroundColor={
                this.updating
                  ? { ...SELECTED_BUTTON_COLOR, a: this.alpha }
                  : this.likeBackgroundColor
              }
              iconColor={
                this.isLiked
                  ? { ...RUBY, a: this.alpha }
                  : { ...BLACK_TEXT, a: this.alpha }
              }
              onMouseEnter={() => {
                this.onLikeEnter()
              }}
              onMouseLeave={() => {
                this.resetBackgrounds()
              }}
              onMouseDown={() => {
                if (this.place === LOADING_PLACE) return
                if (this.isLiked) {
                  this.setLikeStatus('null')
                } else {
                  this.setLikeStatus('like')
                }
              }}
            />
            <ButtonIcon
              uiTransform={{
                width: '23%'
              }}
              icon={this.dislikeIcon}
              backgroundColor={
                this.updating
                  ? { ...SELECTED_BUTTON_COLOR, a: this.alpha }
                  : this.dislikeBackgroundColor
              }
              iconColor={
                this.isDisliked
                  ? { ...RUBY, a: this.alpha }
                  : { ...BLACK_TEXT, a: this.alpha }
              }
              onMouseEnter={() => {
                this.onDislikeEnter()
              }}
              onMouseLeave={() => {
                this.resetBackgrounds()
              }}
              onMouseDown={() => {
                if (this.place === LOADING_PLACE) return
                if (this.isDisliked) {
                  this.setLikeStatus('null')
                } else {
                  this.setLikeStatus('dislike')
                }
              }}
            />
            <ButtonIcon
              uiTransform={{
                width: '23%'
              }}
              icon={this.favIcon}
              backgroundColor={
                this.updating
                  ? { ...SELECTED_BUTTON_COLOR, a: this.alpha }
                  : this.setFavBackgroundColor
              }
              iconColor={
                this.isFav
                  ? { ...RUBY, a: this.alpha }
                  : { ...BLACK_TEXT, a: this.alpha }
              }
              onMouseEnter={() => {
                this.onFavEnter()
              }}
              onMouseLeave={() => {
                this.resetBackgrounds()
              }}
              onMouseDown={() => {
                if (this.place === LOADING_PLACE) return
                this.toggleFav()
              }}
            />
            <UiEntity
              uiTransform={{
                width: '23%',
                height: this.fontSize * 2
              }}
            >
              <ButtonIcon
                uiTransform={{
                  minHeight: '100%',
                  minWidth: '100%'
                }}
                icon={{
                  atlasName: 'context',
                  spriteName: 'Share'
                }}
                backgroundColor={this.shareBackgroundColor}
                iconColor={BLACK_TEXT}
                onMouseEnter={() => {
                  this.onShareEnter()
                }}
                onMouseLeave={() => {
                  this.resetBackgrounds()
                }}
                onMouseDown={() => {
                  if (this.place === LOADING_PLACE) return
                  this.isShareMenuOpen = !this.isShareMenuOpen
                }}
              />
              <UiEntity
                uiTransform={{
                  display: this.isShareMenuOpen ? 'flex' : 'none',
                  padding: { left: this.fontSize, right: this.fontSize },
                  flexDirection: 'column',
                  positionType: 'absolute',
                  position: { right: 0, bottom: '110%' },
                  width: 'auto',
                  minWidth: '100%',
                  height: 'auto',
                  borderRadius: getFontSize({}) / 2,
                  borderWidth: 0
                }}
                uiBackground={{
                  color: COLOR.BLACK_POPUP_BACKGROUND
                }}
              >
                <ButtonTextIcon
                  value={'Share on X'}
                  icon={{
                    atlasName: 'social',
                    spriteName: 'Twitter'
                  }}
                  onMouseDown={() => {
                    void openExternalUrl({
                      url: `https://twitter.com/intent/tweet?text=Check%20out%20${
                        this.place?.title ?? ''
                      },%20a%20cool%20place%20I%20found%20in%20Decentraland!&hashtags=DCLPlace&url=https://play.decentraland.org/?position=${this
                        .place?.base_position}`
                    })
                  }}
                />
                <ButtonTextIcon
                  onMouseDown={() => {
                    if (this.place === LOADING_PLACE) return
                    void openExternalUrl({
                      url: `https://decentraland.org/play/?position=${this.place?.base_position}`
                    })
                  }}
                  value={'Copy Link'}
                  icon={{
                    atlasName: 'social',
                    spriteName: 'Link'
                  }}
                />
              </UiEntity>
            </UiEntity>
          </UiEntity>
        )}
      </UiEntity>
    )
  }

  infoDetail(
    value: string,
    icon: AtlasIcon,
    uiTransform: Partial<UiTransformProps>,
    color?: Color4,
    title?: string
  ): ReactEcs.JSX.Element {
    return (
      <UiEntity
        uiTransform={{
          ...uiTransform,
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start'
        }}
      >
        {title !== undefined && (
          <Label
            value={title}
            fontSize={this.fontSize}
            textAlign="middle-left"
            uiTransform={{ width: '100%', height: this.fontSize }}
            color={GRAY_TEXT}
          />
        )}
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            margin: { top: this.fontSize * 0.25 }
          }}
        >
          <UiEntity
            uiTransform={{
              width: this.fontSize * 1.25,
              height: this.fontSize * 1.25,
              margin: { left: this.fontSize * 0.5 }
            }}
            uiBackground={
              color !== undefined
                ? { ...getBackgroundFromAtlas(icon), color }
                : { ...getBackgroundFromAtlas(icon), color: GRAY_TEXT }
            }
          />
          <Label
            value={value}
            fontSize={this.fontSize}
            textAlign="middle-left"
            uiTransform={{ width: '70%', height: this.fontSize * 1.2 }}
            color={BLACK_TEXT}
          />
        </UiEntity>
      </UiEntity>
    )
  }

  filterChip(
    type: CategoryFromApi,
    index: string | number
  ): ReactEcs.JSX.Element {
    let title = ''
    let spriteName = ''

    const filterDefinition = MAP_FILTER_DEFINITIONS.find((d) => d.id === type)
    title = filterDefinition?.label ?? 'Unknown'
    spriteName = filterDefinition?.spriteName ?? 'MapPins'

    return (
      <UiEntity
        key={index}
        uiTransform={{
          width: 'auto',
          height: this.fontSize * 2,
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          margin: {
            right: this.fontSize / 2,
            top: this.fontSize / 4,
            bottom: this.fontSize / 4
          }
        }}
        uiBackground={{
          ...ROUNDED_TEXTURE_BACKGROUND,
          color: DCL_SNOW
        }}
      >
        <UiEntity
          uiTransform={{
            width: this.fontSize * 1.5,
            height: this.fontSize * 1.5,
            margin: { right: this.fontSize / 4, left: this.fontSize / 4 }
          }}
          uiBackground={getBackgroundFromAtlas({
            atlasName: 'map2',
            spriteName
          })}
        />
        <Label
          value={title}
          fontSize={this.fontSize}
          textAlign="middle-left"
          textWrap="nowrap"
          uiTransform={{
            width: 'auto',
            height: this.fontSize * 1.2,
            margin: { right: this.fontSize / 4 }
          }}
          color={BLACK_TEXT}
        />
      </UiEntity>
    )
  }

  overviewContent(): ReactEcs.JSX.Element | null {
    if (this.place === undefined) return null
    return (
      <UiEntity
        uiTransform={{
          width: '90%',
          height: 'auto',
          justifyContent: 'flex-start',
          alignItems: 'center',
          flexDirection: 'column'
        }}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 'auto',
            justifyContent: 'flex-start',
            alignItems: 'center',
            flexDirection: 'row',
            margin: { bottom: this.fontSize }
          }}
        >
          {this.infoDetail(
            this.place.base_position,
            {
              atlasName: 'icons',
              spriteName: 'PinIcn'
            },
            { width: 'auto', height: 'auto', margin: { right: this.fontSize } },
            undefined,
            'LOCATION'
          )}
          {this.infoDetail(
            (this.place.positions?.length ?? 0).toString(),
            {
              atlasName: 'map',
              spriteName: 'ParcelsIcn'
            },
            { width: 'auto', height: 'auto' },
            undefined,
            'PARCELS'
          )}
        </UiEntity>

        {this.place.world &&
          this.place.world_name && [
            <Label
              value={'WORLD ENS'}
              fontSize={this.fontSize}
              textAlign="bottom-left"
              uiTransform={{ width: '100%' }}
              color={GRAY_TEXT}
            />,
            <Row
              uiTransform={{ width: '100%' }}
              onMouseDown={() => {
                if (this.place?.world_name) {
                  copyToClipboard({ text: this.place.world_name }).catch(
                    console.error
                  )
                }
              }}
            >
              <Label
                value={this.place.world_name}
                fontSize={this.fontSize}
                color={BLACK_TEXT}
              />
              <ButtonIcon
                icon={{ spriteName: 'CopyIcon', atlasName: 'icons' }}
                iconColor={BLACK_TEXT}
              />
            </Row>
          ]}
        <Label
          value={'DESCRIPTION'}
          fontSize={this.fontSize}
          textAlign="bottom-left"
          uiTransform={{ width: '100%' }}
          color={GRAY_TEXT}
        />

        <Label
          value={this.place.description ?? 'No description'}
          fontSize={this.fontSize}
          textAlign="bottom-left"
          uiTransform={{ width: '100%' }}
          color={BLACK_TEXT}
        />

        {this.place.categories?.length !== 0 && (
          <Label
            value={'APPEARS ON'}
            fontSize={this.fontSize}
            textAlign="bottom-left"
            uiTransform={{
              width: '100%',
              height: this.fontSize * 1.2,
              margin: { top: this.fontSize }
            }}
            color={GRAY_TEXT}
          />
        )}
        {this.place.categories?.length !== 0 && (
          <UiEntity
            uiTransform={{
              width: '100%',
              height: 'auto',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              flexDirection: 'row',
              flexWrap: 'wrap',
              margin: { bottom: this.fontSize }
            }}
          >
            {this.place.categories.map((tag, index) =>
              this.filterChip(tag, index)
            )}
          </UiEntity>
        )}
      </UiEntity>
    )
  }

  eventCard(event: EventFromApi, index: number): ReactEcs.JSX.Element | null {
    const BIG_TEXT = this.fontSize
    const SMALL_TEXT = BIG_TEXT * 0.8

    const CARD_HEIGHT = this.fontSize * 8
    const CARD_PADDING = this.fontSize * 0.5

    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          height: CARD_HEIGHT,
          alignItems: 'center',
          padding: CARD_PADDING,
          margin: { bottom: this.fontSize }
        }}
        uiBackground={{
          ...ROUNDED_TEXTURE_BACKGROUND,
          color: EVENT_BACKGROUND_COLOR
        }}
      >
        <UiEntity
          uiTransform={{
            minWidth: CARD_HEIGHT - CARD_PADDING * 4,
            minHeight: CARD_HEIGHT - CARD_PADDING * 4
          }}
          uiBackground={{
            textureMode: 'stretch',
            texture: { src: event.image, wrapMode: 'clamp' }
          }}
        />
        <UiEntity
          uiTransform={{
            width: '50%',
            height: 'auto',
            flexDirection: 'column',
            alignItems: 'flex-start',
            margin: { left: CARD_PADDING }
          }}
        >
          <Label
            value={formatEventTime(
              getTimestamp(event.start_at),
              getTimestamp(event.finish_at)
            )}
            fontSize={SMALL_TEXT}
            uiTransform={{
              height: SMALL_TEXT * 1.1,
              margin: { left: BIG_TEXT * 0.2, bottom: BIG_TEXT * 0.3 }
            }}
            color={Color4.Black()}
          />
          <Label
            value={truncateWithoutBreakingWords(event.name, 20)}
            fontSize={BIG_TEXT}
            uiTransform={{
              height: BIG_TEXT,
              width: '90%',
              margin: { bottom: BIG_TEXT * 0.3 }
            }}
            color={Color4.Black()}
            textWrap="nowrap"
            textAlign="middle-left"
          />
          <UiEntity
            uiTransform={{
              width: '90%',
              height: BIG_TEXT,
              alignItems: 'center'
            }}
          >
            <UiEntity
              uiTransform={{
                width: this.fontSize * 0.8,
                height: this.fontSize * 0.88,
                margin: { left: this.fontSize * 0.5 }
              }}
              uiBackground={{
                ...getBackgroundFromAtlas({
                  atlasName: 'icons',
                  spriteName: 'Members'
                }),
                color: GRAY_TEXT
              }}
            />
            <Label
              value={(event.total_attendees ?? 0).toString()}
              fontSize={SMALL_TEXT}
              color={GRAY_TEXT}
            />
          </UiEntity>
          <UiEntity
            uiTransform={{ width: '100%', margin: { top: BIG_TEXT * 0.3 } }}
          >
            {getTimestamp(event.start_at) <= Date.now() / 1000 && (
              <ButtonTextIcon
                uiTransform={{
                  width: '100%',
                  height: 2 * BIG_TEXT,
                  flexDirection: 'row-reverse',
                  flexGrow: 1
                }}
                onMouseDown={() => {}}
                value={'JUMP IN'}
                backgroundColor={RUBY}
                fontSize={BIG_TEXT}
                iconSize={1.2 * BIG_TEXT}
                icon={{
                  atlasName: 'icons',
                  spriteName: 'JumpIn'
                }}
              />
            )}
            {getTimestamp(event.start_at) > Date.now() / 1000 && (
              <ButtonTextIcon
                uiTransform={{
                  width: '100%',
                  height: 2 * BIG_TEXT,
                  flexGrow: 1
                }}
                onMouseDown={() => {
                  this.interestedOnMouseDown(event).catch(console.error)
                }}
                onMouseEnter={() => {
                  this.eventInterestedEnter = index
                }}
                onMouseLeave={() => {
                  this.eventInterestedEnter = undefined
                }}
                value={
                  this.areInterestedButtonsLocked ? 'Loading...' : 'INTERESTED'
                }
                backgroundColor={
                  this.eventInterestedEnter === index
                    ? SELECTED_BUTTON_COLOR
                    : DCL_SNOW
                }
                fontSize={BIG_TEXT}
                iconSize={1.2 * BIG_TEXT}
                fontColor={BLACK_TEXT}
                iconColor={BLACK_TEXT}
                icon={{
                  atlasName: 'icons',
                  spriteName:
                    this.interestedEvents.find(
                      (interestEvent) => interestEvent.id === event.id
                    ) !== undefined
                      ? 'StarSolid'
                      : 'StarOutline'
                }}
              />
            )}
            <UiEntity
              uiTransform={{
                minHeight: 2 * BIG_TEXT,
                minWidth: 2 * BIG_TEXT,
                margin: { left: BIG_TEXT / 2.5 }
              }}
            >
              <ButtonIcon
                uiTransform={{
                  minHeight: '100%',
                  minWidth: '100%'
                }}
                iconSize={this.fontSize * 1.5}
                icon={{
                  atlasName: 'context',
                  spriteName: 'Share'
                }}
                backgroundColor={
                  this.eventShareEnter === index
                    ? SELECTED_BUTTON_COLOR
                    : DCL_SNOW
                }
                iconColor={BLACK_TEXT}
                onMouseDown={() => {
                  if (this.eventShareMenuOpenIndex === index) {
                    this.eventShareMenuOpenIndex = undefined
                  } else {
                    this.eventShareMenuOpenIndex = index
                  }
                }}
                onMouseEnter={() => {
                  this.eventShareEnter = index
                }}
                onMouseLeave={() => {
                  this.eventShareEnter = undefined
                }}
              />
              <UiEntity
                uiTransform={{
                  display:
                    this.eventShareMenuOpenIndex === index ? 'flex' : 'none',
                  padding: { left: this.fontSize, right: this.fontSize },
                  flexDirection: 'column',
                  positionType: 'absolute',
                  position: { right: 0, bottom: '110%' },
                  width: 'auto',
                  minWidth: '100%',
                  height: 'auto'
                }}
                uiBackground={{
                  texture: { src: 'assets/images/backgrounds/rounded.png' },
                  color: BLACK_TEXT,
                  textureMode: 'nine-slices',
                  textureSlices: {
                    top: 0.42,
                    bottom: 0.42,
                    left: 0.42,
                    right: 0.42
                  }
                }}
              >
                <ButtonTextIcon
                  onMouseDown={() => {
                    void openExternalUrl({
                      url: `https://x.com/intent/tweet?text=${event.name}&hashtags=DCLPlace&url=https://decentraland.org/events/event/?id=${event.id}`
                    })
                  }}
                  value={'Share on X'}
                  fontSize={(this.fontSize * 2) / 3}
                  icon={{
                    atlasName: 'social',
                    spriteName: 'Twitter'
                  }}
                  iconSize={this.fontSize}
                />
                <ButtonTextIcon
                  onMouseDown={() => {
                    void openExternalUrl({
                      url: `https://decentraland.org/events/event/?id=${event.id}`
                    })
                  }}
                  value={'Copy Link'}
                  fontSize={(this.fontSize * 2) / 3}
                  icon={{
                    atlasName: 'social',
                    spriteName: 'Link'
                  }}
                  iconSize={this.fontSize}
                />
              </UiEntity>
            </UiEntity>
          </UiEntity>
        </UiEntity>
      </UiEntity>
    )
  }

  eventsContent(): ReactEcs.JSX.Element {
    const eventsArray = Object.values(store.getState().scene.explorerEvents)
    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 'auto',
          justifyContent: 'flex-start',
          alignItems: 'center',
          flexDirection: 'column'
        }}
      >
        {eventsArray?.length > 0 &&
          eventsArray.map((event, index) => this.eventCard(event, index))}
        {eventsArray?.length === 0 &&
          this.noResults(
            { atlasName: 'icons', spriteName: 'Events' },
            this.fontSize * 3,
            'No Upcoming Events',
            this.fontSize,
            BLACK_TEXT
          )}
      </UiEntity>
    )
  }

  photosContent(width: number): ReactEcs.JSX.Element {
    const photosArray = Object.values(
      store.getState().scene?.explorerPhotos ?? {}
    )
    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          height: 'auto',
          justifyContent: 'flex-start',
          alignItems: 'center',
          flexDirection: 'column'
        }}
      >
        {photosArray?.length > 0 &&
          photosArray.map((photo, index) => (
            <UiEntity
              uiTransform={{
                width: width * 0.88,
                height: width * 0.88 * 0.56,
                margin: this.fontSize * 0.1
              }}
              onMouseDown={() => {
                this.uiController.photosPanel.showPhoto(index)
                this.hide()
              }}
              uiBackground={{
                textureMode: 'stretch',
                texture: {
                  src: photo.url.replace(
                    'https://camera-reel-service.decentraland.org/api/images/',
                    'https://camera-reel-s3-bucket.decentraland.org/'
                  )
                }
              }}
            />
          ))}
        {photosArray?.length === 0 &&
          this.noResults(
            { atlasName: 'icons', spriteName: 'Camera' },
            this.fontSize * 3,
            'There Are No Photos',
            this.fontSize,
            BLACK_TEXT
          )}
      </UiEntity>
    )
  }

  noResults(
    icon: AtlasIcon,
    iconSize: number,
    message: string,
    fontSize: number,
    color: Color4,
    uiTransform?: Partial<UiTransformProps>
  ): ReactEcs.JSX.Element {
    return (
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          alignItems: 'center',
          flexGrow: 1,
          justifyContent: 'center',
          ...uiTransform
        }}
      >
        <UiEntity
          uiTransform={{ width: iconSize, height: iconSize }}
          uiBackground={{ ...getBackgroundFromAtlas(icon), color }}
        />
        <Label value={message} color={color} fontSize={fontSize} />
      </UiEntity>
    )
  }
}
