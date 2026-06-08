import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import useEffect = ReactEcs.useEffect
import {
  fromParcelCoordsToPosition,
  fromStringToCoords,
  getLoadedMapPlaces,
  type Place
} from '../../../service/map-places'
import {
  engine,
  executeTask,
  PointerLock,
  PrimaryPointerInfo,
  Transform
} from '@dcl/sdk/ecs'
import { sleep } from '../../../utils/dcl-utils'
import useState = ReactEcs.useState
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import Icon from '../../../components/icon/Icon'
import {
  getContentScaleRatio,
  getRightPanelWidth,
  getViewportHeight,
  getViewportWidth
} from '../../../service/canvas-ratio'
import {
  screenToGround,
  worldToScreenPx
} from '../../../service/perspective-to-screen'
import {
  activateDragMapSystem,
  deactivateDragMapSystem,
  displaceCamera,
  getBigMapCameraEntity,
  isMapDoingZoom
} from '../../../service/map/map-camera'
import {
  getPlayerParcel,
  getVector3Parcel
} from '../../../service/player-scenes'
import { getUiController } from '../../../controllers/ui.controller'
import { store } from '../../../state/store'
import { dedupeById } from '../../../utils/function-utils'
import { updateHudStateAction } from '../../../state/hud/actions'
import { type AtlasIcon } from '../../../utils/definitions'
import { MapBottomLeftBar } from '../../../components/map/map-bottom-left-bar'
import { BevyApi } from '../../../bevy-api'
import { fetchPlaceFromCoords } from '../../../utils/promise-utils'
import {
  decoratePlaceRepresentation,
  getZIndexForPlaceSymbol,
  isHomePlace
} from './place-decoration'
import { fetchLiveEvents } from '../../../utils/fetch-live-events'
import {
  type EventFromApi,
  type PlaceFromApi
} from '../../scene-info-card/SceneInfoCard.types'
import { currentRealmProviderIsWorld } from '../../../service/realm-change'
import { MapFooter } from './map-footer'
import { getMainMenuHeight } from '../../main-menu/MainMenu'
import { BigMap2DContent } from './big-map-2d-view'

export const FOV = (45 * 1.25 * Math.PI) / 180

export const PLAYER_PLACE_ID = 'player'
export const BigMap = (): ReactElement => {
  const bigMapStyle = store.getState().hud.bigMapStyle
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        pointerFilter: 'block'
      }}
    >
      {bigMapStyle === '2d' ? <BigMap2DContent /> : <BigMapContent />}
    </UiEntity>
  )
}
const state = {
  dragging: false,
  lastClickTime: 0
}
const PLAYER_PLACE_LABEL = 'ME'
export type PlaceRepresentation = Place & {
  centralParcelCoords: Vector3
  sprite: AtlasIcon
  isActive: boolean
}
export type OrderType = 'most_active' | 'like_score' | 'created_at' | null

function BigMapContent(): ReactElement {
  const [onScreenRepresentations, setOnScreenRepresentations] = useState<
    PlaceRepresentation[]
  >([])
  const [liveEvents, setLiveEvents] = useState<EventFromApi[]>([]) // TODO fix any type
  const [favoritePlaces, setFavoritePlaces] = useState<PlaceFromApi[]>([])
  const [placesRepresentations, setPlacesRepresentations] = useState<
    PlaceRepresentation[]
  >([])
  const initialPlayerParcel = getPlayerParcel()
  const [playerRespresentation, setPlayerRespresentation] =
    useState<PlaceRepresentation>(
      decoratePlaceRepresentation({
        id: PLAYER_PLACE_ID,
        title: PLAYER_PLACE_LABEL,
        positions: [],
        categories: [PLAYER_PLACE_ID],
        base_position: `${initialPlayerParcel.x},${initialPlayerParcel.y}`
      }) as PlaceRepresentation
    )
  const [allRepresentations, setAllRepresentations] = useState<
    PlaceRepresentation[]
  >([])

  // TODO review if it makes sense all the useEffect and their listenings
  useEffect(() => {
    // Avoid hiding mouse cursor with right click / camera lock
    if (PointerLock.get(engine.CameraEntity).isPointerLocked) {
      executeTask(async () => {
        PointerLock.getMutable(engine.CameraEntity).isPointerLocked = false
      })
    }
  }, [PointerLock.get(engine.CameraEntity).isPointerLocked])

  useEffect(() => {
    store.dispatch(
      updateHudStateAction({ placeListActiveItem: null, movingMap: true })
    )
    const u1 = getUiController().sceneCard.onHide(() => {
      store.dispatch(updateHudStateAction({ placeListActiveItem: null }))
    })
    const u2 = getUiController().sceneCard.onShow(() => {
      store.dispatch(
        updateHudStateAction({
          placeListActiveItem: getUiController().sceneCard.place
        })
      )
    })
    executeTask(async () => {
      const _liveEvents: EventFromApi[] = await fetchLiveEvents()
      setLiveEvents(_liveEvents)
      await sleep(2000)
      store.dispatch(
        updateHudStateAction({
          movingMap: false
        })
      )

      try {
        const _favoritePlaces = await BevyApi.kernelFetch({
          url: `https://places.decentraland.org/api/places?only_favorites=true`,
          init: {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          },
          meta: JSON.stringify({})
        })
          .then((r) => JSON.parse(r.body))
          .then((r) => r.data)
        setFavoritePlaces(_favoritePlaces)
        const home = await BevyApi.getHomeScene()
        const homePlace = await fetchPlaceFromCoords(
          Vector3.create(home.parcel.x, 0, home.parcel.y)
        )

        store.dispatch(
          updateHudStateAction({
            homePlace
          })
        )
      } catch (error) {}
    })

    return () => {
      u1()
      u2()
    }
  }, [])

  useEffect(handlePinsChange, [mustShowPins()])

  useEffect(() => {
    const initBigMapFn = async (): Promise<void> => {
      const _representations: PlaceRepresentation[] =
        store.getState().hud.mapFilterCategories[0] === 'favorites'
          ? []
          : (Object.values(getLoadedMapPlaces())
              .map(decoratePlaceRepresentation)
              .filter(
                (p) =>
                  p?.categories.some(
                    (c: string) =>
                      store.getState().hud.mapFilterCategories.includes(c) ||
                      store.getState().hud.mapFilterCategories[0] === 'all'
                  )
              ) as PlaceRepresentation[])

      setPlacesRepresentations(_representations) // TODO this is not the best, I would like to limit the rendered on screen
    }
    initBigMapFn().catch(console.error)
    handlePinsChange()
  }, [
    getLoadedMapPlaces(),
    store.getState().hud.mapFilterCategories,
    store.getState().hud.homePlace
  ])
  useEffect(() => {
    if (store.getState().hud.mapFilterCategories[0] === 'favorites') {
      const _allRepresentations: PlaceRepresentation[] = dedupeById(
        [
          playerRespresentation,
          ...favoritePlaces.map((f) => ({
            ...decoratePlaceRepresentation(f),
            user_favorite: true
          })),
          decoratePlaceRepresentation(store.getState().hud.homePlace),
          ...store
            .getState()
            .hud.sceneList.data.map(decoratePlaceRepresentation),
          decoratePlaceRepresentation(store.getState().hud.placeListActiveItem)
        ].filter((p) => p) as PlaceRepresentation[]
      )
      setAllRepresentationsWithLiveEvents(_allRepresentations)
    }
    handlePinsChange()
  }, [store.getState().hud.sceneList, favoritePlaces])
  useEffect(() => {
    const playerParcel = getPlayerParcel()
    const _playerRepresentation: PlaceRepresentation =
      decoratePlaceRepresentation({
        id: PLAYER_PLACE_ID,
        title: PLAYER_PLACE_LABEL,
        positions: [],
        categories: [PLAYER_PLACE_ID],
        base_position: `${playerParcel.x},${playerParcel.y}`,
        centralParcelCoords: fromParcelCoordsToPosition(playerParcel, {
          height: 0
        })
      }) as PlaceRepresentation

    setPlayerRespresentation(_playerRepresentation)

    const _allRepresentations: PlaceRepresentation[] = dedupeById(
      [
        _playerRepresentation,
        ...favoritePlaces.map((f) => ({
          ...decoratePlaceRepresentation(f),
          user_favorite: true
        })),
        decoratePlaceRepresentation(store.getState().hud.homePlace),
        ...placesRepresentations.map(decoratePlaceRepresentation),
        decoratePlaceRepresentation(store.getState().hud.placeListActiveItem)
      ].filter((p) => p) as PlaceRepresentation[]
    )
    setAllRepresentationsWithLiveEvents(_allRepresentations)
    handlePinsChange()
  }, [
    getPlayerParcel(),
    placesRepresentations,
    store.getState().hud.placeListActiveItem,
    favoritePlaces
  ])

  function setAllRepresentationsWithLiveEvents(
    _allRepresentations: PlaceRepresentation[]
  ): void {
    _allRepresentations.forEach(decorateHasLive)

    const liveEventsWithoutPlace = liveEvents.filter((l) => !l.placeID)
    const orphanLiveEventPlaceRepresentations: PlaceRepresentation[] =
      liveEventsWithoutPlace
        .map((liveEvent) =>
          decoratePlaceRepresentation({
            ...liveEvent,
            id: liveEvent.id,
            title: liveEvent.title ?? liveEvent.name ?? 'Event',
            positions: [liveEvent.position.join(',')],
            categories: ['live'],
            base_position: liveEvent.position.join(','),
            hasLive: true
          })
        )
        .filter((i) => i) as PlaceRepresentation[]

    setAllRepresentations([
      ..._allRepresentations,
      ...orphanLiveEventPlaceRepresentations
    ])
  }

  // TODO don't show genesis city points when in other realm/world/server
  return (
    <UiEntity
      uiTransform={{
        position: { top: getMainMenuHeight(), left: 0 },
        width: getViewportWidth() * getRightPanelWidth(),
        height: getViewportHeight() - getMainMenuHeight(),
        overflow: 'hidden'
      }}
      uiBackground={{}}
      onMouseDrag={() => {
        if (
          !state.dragging &&
          !store.getState().hud.movingMap &&
          !store.getState().hud.mapCameraIsOrbiting
        ) {
          state.dragging = true
          activateDragMapSystem()
        }
      }}
      onMouseDragEnd={() => {
        executeTask(async () => {
          // TODO REVIEW: why onMouseDrag/onMouseDragLocked is called continuously, then I cannot set dragging to false
          await sleep(0)

          state.dragging = false
          deactivateDragMapSystem()
        })
      }}
      onMouseDown={() => {
        if (state.dragging || store.getState().hud.movingMap) return
        if (Date.now() - state.lastClickTime < 300) {
          state.lastClickTime = 0
          const pointerInfo = PrimaryPointerInfo.get(engine.RootEntity)
          if (!pointerInfo?.screenCoordinates) return

          const mapCameraTransform = Transform.get(getBigMapCameraEntity())

          const targetPosition: Vector3 = screenToGround(
            pointerInfo.screenCoordinates.x, // TODO REVIEW + getRightPanelWidth() / 2, to move camera more centered
            pointerInfo.screenCoordinates.y,
            getViewportWidth(),
            getViewportHeight(),
            mapCameraTransform.position,
            mapCameraTransform.rotation,
            FOV
          ) as Vector3

          displaceCamera(targetPosition)

          const parcelVector3 = getVector3Parcel(targetPosition)
          if (!currentRealmProviderIsWorld()) {
            getUiController()
              .sceneCard.showByCoords(
                Vector3.create(parcelVector3.x, 0, parcelVector3.y)
              )
              .catch(console.error)
          }
        }
        state.lastClickTime = Date.now()
      }}
    >
      <MapFooter />
      <UiEntity uiTransform={{ positionType: 'absolute', position: 0 }}>
        {onScreenRepresentations.map(
          (placeRepresentation: PlaceRepresentation, index: number) => {
            try {
              // TODO optimize, only calculate when camera position or rotation changes, and with throttle
              const position = placeRepresentation.screenPosition

              const sizeMultiplier = placeRepresentation.isActive
                ? 2
                : placeRepresentation.sprite.spriteName === 'PinPOI' ||
                  placeRepresentation.user_favorite
                ? 1.5
                : placeRepresentation.sprite.spriteName === 'PinLive'
                ? 1.5
                : 1
              const symbolSize = getContentScaleRatio() * 50 * sizeMultiplier
              return (
                <UiEntity
                  uiTransform={{
                    positionType: 'absolute',
                    position: {
                      left: position.left,
                      top: position.top - getMainMenuHeight()
                    },
                    flexDirection: 'column',
                    alignItems: 'center',
                    alignContent: 'center',
                    justifyContent: 'center',
                    zIndex: getZIndexForPlaceSymbol(placeRepresentation)
                  }}
                  key={placeRepresentation.id}
                >
                  <Icon
                    icon={placeRepresentation.sprite}
                    iconColor={
                      placeRepresentation.id === PLAYER_PLACE_ID
                        ? COLOR.RED
                        : isHomePlace(placeRepresentation)
                        ? COLOR.WHITE
                        : undefined
                    }
                    uiTransform={{
                      positionType: 'absolute',
                      alignSelf: 'center',
                      position: {
                        top: -symbolSize * 1.1,
                        left: -symbolSize / 2
                      },
                      width: symbolSize,
                      height: symbolSize * 1.1
                    }}
                    onMouseDown={() => {
                      if (placeRepresentation.id === PLAYER_PLACE_ID) return
                      executeTask(async () => {
                        const coords = fromStringToCoords(
                          placeRepresentation.base_position
                        )
                        const shownByCoords =
                          await getUiController().sceneCard.showByCoords(
                            Vector3.create(coords.x, 0, coords.y)
                          )
                        if (!shownByCoords) {
                          getUiController()
                            .sceneCard.showByData(placeRepresentation)
                            .catch(console.error)
                        }
                      })
                    }}
                  />
                  {(placeRepresentation.id === PLAYER_PLACE_ID ||
                    isHomePlace(placeRepresentation)) && (
                    <UiEntity
                      uiTransform={{
                        position: {
                          top: 0,
                          left: isHomePlace(placeRepresentation)
                            ? -getContentScaleRatio() * 50
                            : -getContentScaleRatio() * 100
                        },

                        alignSelf: 'center'
                      }}
                      uiText={{
                        value: isHomePlace(placeRepresentation)
                          ? 'Home'
                          : 'You are here',
                        textAlign: 'top-center'
                      }}
                      uiBackground={{
                        color: COLOR.DARK_OPACITY_5
                      }}
                    />
                  )}
                </UiEntity>
              )
            } catch (error) {
              console.error('ERROR IN MAP', error)
              return null
            }
          }
        )}
      </UiEntity>
      <MapBottomLeftBar />
    </UiEntity>
  )
  function handlePinsChange(): void {
    if (mustShowPins()) {
      const _onScreenRepresentations = !mustShowPins()
        ? []
        : allRepresentations
            .map((placeRepresentation) => {
              return {
                ...placeRepresentation,
                screenPosition: worldToScreenPx(
                  placeRepresentation.centralParcelCoords,
                  Transform.getOrNull(getBigMapCameraEntity())?.position ??
                    Vector3.Zero(),
                  Transform.getOrNull(getBigMapCameraEntity())?.rotation ??
                    Quaternion.Zero(),
                  FOV,
                  getViewportWidth(),
                  getViewportHeight(),
                  {
                    fovIsHorizontal: false,
                    forwardIsNegZ: false
                  }
                )
              }
            })
            .filter((i) => i)
            .filter(
              (placeRepresentation) =>
                placeRepresentation.screenPosition.onScreen
            )
      setOnScreenRepresentations(_onScreenRepresentations)
    } else {
      setOnScreenRepresentations([])
    }
  }
  function decorateHasLive(_placeRepresentation: PlaceRepresentation): void {
    liveEvents.forEach((liveEvent) => {
      if (
        _placeRepresentation.positions.includes(liveEvent.position.join(','))
      ) {
        liveEvent.placeID = _placeRepresentation.id
        _placeRepresentation.hasLive = true
      }
    })
  }
}

function mustShowPins(): boolean {
  return (
    !store.getState().hud.transitioningToMap &&
    !store.getState().hud.movingMap &&
    !store.getState().hud.mapCameraIsOrbiting &&
    !state.dragging &&
    !currentRealmProviderIsWorld() &&
    !isMapDoingZoom()
  )
}
