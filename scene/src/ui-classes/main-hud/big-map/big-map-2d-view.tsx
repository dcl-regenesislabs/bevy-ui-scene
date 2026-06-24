import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { engine, PrimaryPointerInfo, Transform } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { COLOR } from '../../../components/color-palette'
import Icon from '../../../components/icon/Icon'
import {
  getContentScaleRatio,
  getViewportHeight,
  getViewportWidth
} from '../../../service/canvas-ratio'
import { getMainMenuHeight } from '../../main-menu/MainMenu'
import {
  PARCEL_METERS,
  tileInfoForChunk
} from '../../../components/map/mini-map-tiles'
import type { BigMap2DLayer } from '../../../components/map/mini-map-persistence'
import {
  fromParcelCoordsToPosition,
  fromStringToCoords,
  getLoadedMapPlaces,
  loadCompleteMapPlaces,
  type Place
} from '../../../service/map-places'
import { getPlayerParcel } from '../../../service/player-scenes'
import {
  decoratePlaceRepresentation,
  getZIndexForPlaceSymbol,
  isHomePlace
} from './place-decoration'
import { type PlaceRepresentation, PLAYER_PLACE_ID } from './big-map-view'
import { listenSystemAction } from '../../../service/system-actions-emitter'
import { getUiController } from '../../../controllers/ui.controller'
import { store } from '../../../state/store'
import { updateHudStateAction } from '../../../state/hud/actions'
import { MapBottomLeftBar } from '../../../components/map/map-bottom-left-bar'
import { MapFooter } from './map-footer'
import { createTween } from '../../../service/tween'
import { currentRealmProviderIsWorld } from '../../../service/realm-change'
import {
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { truncateWithoutBreakingWords } from '../../../utils/ui-utils'
import useEffect = ReactEcs.useEffect
import useState = ReactEcs.useState

const moduleState = {
  wasDragged: false,
  wasMouseDownOnMap: false
}

export const bigMap2DViewport = {
  centerWorldX: 0,
  centerWorldZ: 0,
  pxPerParcel: 12,
  viewportWidth: 0,
  viewportHeight: 0,
  mainMenuHeight: 0,
  active: false
}

export function screenToParcel2D(
  screenX: number,
  screenY: number
): { x: number; y: number } | null {
  if (!bigMap2DViewport.active) return null
  const relativeY = screenY - bigMap2DViewport.mainMenuHeight
  const dx = screenX - bigMap2DViewport.viewportWidth / 2
  const dy = relativeY - bigMap2DViewport.viewportHeight / 2
  const targetWorldX =
    bigMap2DViewport.centerWorldX +
    (dx / bigMap2DViewport.pxPerParcel) * PARCEL_METERS
  const targetWorldZ =
    bigMap2DViewport.centerWorldZ -
    (dy / bigMap2DViewport.pxPerParcel) * PARCEL_METERS
  return {
    x: Math.floor(targetWorldX / PARCEL_METERS),
    y: Math.floor(targetWorldZ / PARCEL_METERS)
  }
}

const DEFAULT_PX_PER_PARCEL = 12
const MIN_PX_PER_PARCEL = 2
const MAX_PX_PER_PARCEL = 48
const ZOOM_SPEED_PER_SEC = 3
const ZOOM_SUSTAIN = 0.12
const zoomState = {
  display: DEFAULT_PX_PER_PARCEL,
  dir: 0,
  held: false,
  hold: 0
}

const PARCEL_TILE_PARCELS = 48
const PARCEL_TILE_PX_PER_PARCEL = 16

const SATELLITE_TILE_PARCELS = 40

const PLAYER_PLACE_LABEL = 'ME'

function parcelAtlasUrl(centerParcelX: number, centerParcelY: number): string {
  const px = PARCEL_TILE_PARCELS * PARCEL_TILE_PX_PER_PARCEL
  return `https://api.decentraland.org/v1/map.png?center=${centerParcelX},${centerParcelY}&width=${px}&height=${px}&size=${PARCEL_TILE_PX_PER_PARCEL}`
}

type Tile = {
  cx: number
  cy: number
  centerParcelX: number
  centerParcelY: number
  tileParcels: number
  url: string
}

function tilesForViewport(
  centerWorldX: number,
  centerWorldZ: number,
  pxPerParcel: number,
  viewportPx: { width: number; height: number },
  layer: BigMap2DLayer
): Tile[] {
  const halfParcelsX = viewportPx.width / pxPerParcel / 2
  const halfParcelsY = viewportPx.height / pxPerParcel / 2
  const centerParcelX = centerWorldX / PARCEL_METERS
  const centerParcelY = centerWorldZ / PARCEL_METERS

  const tileParcels =
    layer === 'satellite' ? SATELLITE_TILE_PARCELS : PARCEL_TILE_PARCELS

  const minCx = Math.floor((centerParcelX - halfParcelsX) / tileParcels) - 1
  const maxCx = Math.floor((centerParcelX + halfParcelsX) / tileParcels) + 1
  const minCy = Math.floor((centerParcelY - halfParcelsY) / tileParcels) - 1
  const maxCy = Math.floor((centerParcelY + halfParcelsY) / tileParcels) + 1

  const out: Tile[] = []
  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      if (layer === 'satellite') {
        const probeParcelX = cx * SATELLITE_TILE_PARCELS
        const probeParcelY = cy * SATELLITE_TILE_PARCELS
        const probeTile = tileFromParcel(probeParcelX, probeParcelY)
        if (probeTile !== null) out.push(probeTile)
      } else {
        const cParcelX = cx * PARCEL_TILE_PARCELS + PARCEL_TILE_PARCELS / 2
        const cParcelY = cy * PARCEL_TILE_PARCELS + PARCEL_TILE_PARCELS / 2
        out.push({
          cx,
          cy,
          centerParcelX: cParcelX,
          centerParcelY: cParcelY,
          tileParcels: PARCEL_TILE_PARCELS,
          url: parcelAtlasUrl(cParcelX, cParcelY)
        })
      }
    }
  }
  if (layer === 'satellite') {
    const seen = new Set<string>()
    return out.filter((t) => {
      const key = `${t.centerParcelX},${t.centerParcelY}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  return out
}

function tileFromParcel(parcelX: number, parcelY: number): Tile | null {
  const SATELLITE_TILE_00_CENTER_PARCEL_X = -133
  const SATELLITE_TILE_00_CENTER_PARCEL_Y = 132
  const cx = Math.floor(
    (parcelX -
      (SATELLITE_TILE_00_CENTER_PARCEL_X - SATELLITE_TILE_PARCELS / 2)) /
      SATELLITE_TILE_PARCELS
  )
  const cy = Math.floor(
    (SATELLITE_TILE_00_CENTER_PARCEL_Y +
      SATELLITE_TILE_PARCELS / 2 -
      1 -
      parcelY) /
      SATELLITE_TILE_PARCELS
  )
  const info = tileInfoForChunk('satellite', cx, cy)
  if (info === null) return null
  const centerParcelX = info.centerWorldX / PARCEL_METERS - 0.5
  const centerParcelY = info.centerWorldZ / PARCEL_METERS - 0.5
  return {
    cx,
    cy,
    centerParcelX,
    centerParcelY,
    tileParcels: SATELLITE_TILE_PARCELS,
    url: info.url
  }
}

function worldParcelToScreen(
  parcelX: number,
  parcelY: number,
  centerWorldX: number,
  centerWorldZ: number,
  pxPerParcel: number,
  viewportPx: { width: number; height: number }
): { x: number; y: number } {
  const worldX = parcelX * PARCEL_METERS + PARCEL_METERS / 2
  const worldZ = parcelY * PARCEL_METERS + PARCEL_METERS / 2
  const deltaParcelsX = (worldX - centerWorldX) / PARCEL_METERS
  const deltaParcelsY = (worldZ - centerWorldZ) / PARCEL_METERS
  return {
    x: viewportPx.width / 2 + deltaParcelsX * pxPerParcel,
    y: viewportPx.height / 2 - deltaParcelsY * pxPerParcel
  }
}

export function BigMap2DContent(): ReactElement {
  const viewportWidth = getViewportWidth()
  const viewportHeight = getViewportHeight() - getMainMenuHeight()
  const viewportPx = { width: viewportWidth, height: viewportHeight }

  const initialPlayerParcel = getPlayerParcel()
  const [centerWorld, setCenterWorld] = useState<{ x: number; z: number }>({
    x: initialPlayerParcel.x * PARCEL_METERS + PARCEL_METERS / 2,
    z: initialPlayerParcel.y * PARCEL_METERS + PARCEL_METERS / 2
  })
  const [pxPerParcel, setPxPerParcel] = useState<number>(DEFAULT_PX_PER_PARCEL)
  const [dragging, setDragging] = useState<boolean>(false)
  const layer = store.getState().hud.bigMap2DLayer

  useEffect(() => {
    loadCompleteMapPlaces().catch(console.error)
  }, [])

  useEffect(() => {
    bigMap2DViewport.active = true
    zoomState.display = DEFAULT_PX_PER_PARCEL
    zoomState.dir = 0
    zoomState.held = false
    zoomState.hold = 0
    return () => {
      bigMap2DViewport.active = false
    }
  }, [])

  bigMap2DViewport.centerWorldX = centerWorld.x
  bigMap2DViewport.centerWorldZ = centerWorld.z
  bigMap2DViewport.pxPerParcel = pxPerParcel
  bigMap2DViewport.viewportWidth = viewportWidth
  bigMap2DViewport.viewportHeight = viewportHeight
  bigMap2DViewport.mainMenuHeight = getMainMenuHeight()

  const pendingCenter = store.getState().hud.bigMap2DPendingCenter
  useEffect(() => {
    if (pendingCenter === null) return
    const start = { x: centerWorld.x, z: centerWorld.z }
    const end = { x: pendingCenter.x, z: pendingCenter.z }
    const tween = createTween({ startValue: 0, endValue: 1, time: 0.4 })
    tween.onUpdate((_value: number, t: number) => {
      setCenterWorld({
        x: start.x + (end.x - start.x) * t,
        z: start.z + (end.z - start.z) * t
      })
    })
    tween.onComplete(() => {
      setCenterWorld(end)
      store.dispatch(updateHudStateAction({ bigMap2DPendingCenter: null }))
    })
    return () => {
      tween.cancel()
    }
  }, [pendingCenter?.ts])

  useEffect(() => {
    const onZoom = (dir: number, pressed: boolean): void => {
      if (pressed) {
        zoomState.dir = dir
        zoomState.held = true
        zoomState.hold = ZOOM_SUSTAIN
      } else if (zoomState.dir === dir) {
        zoomState.held = false
        zoomState.hold = ZOOM_SUSTAIN
      }
    }
    const unsubIn = listenSystemAction('CameraZoomIn', (pressed: boolean) => {
      onZoom(1, pressed)
    })
    const unsubOut = listenSystemAction('CameraZoomOut', (pressed: boolean) => {
      onZoom(-1, pressed)
    })
    const zoomTick = (dt: number): void => {
      if (!zoomState.held && zoomState.hold <= 0) return
      if (!zoomState.held) zoomState.hold = Math.max(0, zoomState.hold - dt)
      const next =
        zoomState.display * Math.pow(ZOOM_SPEED_PER_SEC, dt * zoomState.dir)
      zoomState.display = Math.min(
        MAX_PX_PER_PARCEL,
        Math.max(MIN_PX_PER_PARCEL, next)
      )
      setPxPerParcel(zoomState.display)
    }
    engine.addSystem(zoomTick)
    return () => {
      unsubIn()
      unsubOut()
      engine.removeSystem(zoomTick)
    }
  }, [])

  useEffect(() => {
    if (!dragging) return
    const panTick = (): void => {
      const info = PrimaryPointerInfo.getOrNull(engine.RootEntity)
      const delta = info?.screenDelta
      if (!delta) return
      if (delta.x === 0 && delta.y === 0) return
      setCenterWorld((prev) => ({
        x: prev.x - (delta.x / pxPerParcel) * PARCEL_METERS,
        z: prev.z + (delta.y / pxPerParcel) * PARCEL_METERS
      }))
    }
    engine.addSystem(panTick)
    return () => {
      engine.removeSystem(panTick)
    }
  }, [dragging, pxPerParcel])

  const loadedMapPlaces = getLoadedMapPlaces()
  const mapFilterCategories = store.getState().hud.mapFilterCategories
  const buildFilteredPlaces = (): PlaceRepresentation[] => {
    if (mapFilterCategories[0] === 'favorites') {
      return Object.values(loadedMapPlaces)
        .filter((p) => p.user_favorite === true)
        .map(decoratePlaceRepresentation)
        .filter((p): p is PlaceRepresentation => p !== null)
    }
    const showAll = mapFilterCategories[0] === 'all'
    return Object.values(loadedMapPlaces)
      .map(decoratePlaceRepresentation)
      .filter((p): p is PlaceRepresentation => p !== null)
      .filter(
        (p) =>
          showAll ||
          p.categories.some((c: string) => mapFilterCategories.includes(c))
      )
  }
  const [allPlaces, setAllPlaces] =
    useState<PlaceRepresentation[]>(buildFilteredPlaces)
  useEffect(() => {
    setAllPlaces(buildFilteredPlaces())
  }, [loadedMapPlaces, mapFilterCategories])

  const tiles = tilesForViewport(
    centerWorld.x,
    centerWorld.z,
    pxPerParcel,
    viewportPx,
    layer
  )

  const playerParcel = getPlayerParcel()
  const playerPlaceData: Place = {
    id: PLAYER_PLACE_ID,
    title: PLAYER_PLACE_LABEL,
    positions: [],
    categories: [PLAYER_PLACE_ID],
    base_position: `${playerParcel.x},${playerParcel.y}`,
    centralParcelCoords: fromParcelCoordsToPosition(playerParcel, { height: 0 })
  }
  const playerRepresentation = decoratePlaceRepresentation(
    playerPlaceData
  ) as PlaceRepresentation

  const homePlace = store.getState().hud.homePlace
  const homeRepresentation = homePlace
    ? decoratePlaceRepresentation(homePlace)
    : null

  return (
    <UiEntity
      uiTransform={{
        position: { top: getMainMenuHeight(), left: 0 },
        width: viewportWidth,
        height: viewportHeight,
        overflow: 'hidden'
      }}
      uiBackground={{ color: COLOR.URL_POPUP_BACKGROUND }}
      onMouseDown={() => {
        moduleState.wasDragged = false
        moduleState.wasMouseDownOnMap = true
      }}
      onMouseDrag={() => {
        if (!dragging) setDragging(true)
        moduleState.wasDragged = true
      }}
      onMouseDragEnd={() => {
        setDragging(false)
      }}
      onMouseUp={() => {
        if (!moduleState.wasMouseDownOnMap) return
        moduleState.wasMouseDownOnMap = false
        if (moduleState.wasDragged) {
          moduleState.wasDragged = false
          return
        }
        const pointerInfo = PrimaryPointerInfo.getOrNull(engine.RootEntity)
        if (!pointerInfo?.screenCoordinates) return
        const relativeX = pointerInfo.screenCoordinates.x
        const relativeY = pointerInfo.screenCoordinates.y - getMainMenuHeight()
        const dx = relativeX - viewportWidth / 2
        const dy = relativeY - viewportHeight / 2
        const targetWorldX = centerWorld.x + (dx / pxPerParcel) * PARCEL_METERS
        const targetWorldZ = centerWorld.z - (dy / pxPerParcel) * PARCEL_METERS
        store.dispatch(
          updateHudStateAction({
            bigMap2DPendingCenter: {
              x: targetWorldX,
              z: targetWorldZ,
              ts: Date.now()
            }
          })
        )
        if (!currentRealmProviderIsWorld()) {
          const parcelX = Math.floor(targetWorldX / PARCEL_METERS)
          const parcelY = Math.floor(targetWorldZ / PARCEL_METERS)
          console.log(`[bigmap2d] click parcel: ${parcelX},${parcelY}`)
          getUiController()
            .sceneCard.showByCoords(Vector3.create(parcelX, 0, parcelY))
            .catch(console.error)
        }
      }}
    >
      {tiles.map((tile) => {
        const tileCenterScreen = worldParcelToScreen(
          tile.centerParcelX,
          tile.centerParcelY,
          centerWorld.x,
          centerWorld.z,
          pxPerParcel,
          viewportPx
        )
        const tilePx = tile.tileParcels * pxPerParcel
        return (
          <UiEntity
            key={`tile-${layer}-${tile.cx},${tile.cy}`}
            uiTransform={{
              positionType: 'absolute',
              position: {
                left: tileCenterScreen.x - tilePx / 2,
                top: tileCenterScreen.y - tilePx / 2
              },
              width: tilePx,
              height: tilePx
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: { src: tile.url }
            }}
          />
        )
      })}

      {allPlaces.map((placeRepresentation) =>
        renderMarker({
          placeRepresentation,
          centerWorld,
          pxPerParcel,
          viewportPx
        })
      )}

      {homeRepresentation !== null &&
        renderMarker({
          placeRepresentation: homeRepresentation,
          centerWorld,
          pxPerParcel,
          viewportPx
        })}

      {renderMarker({
        placeRepresentation: playerRepresentation,
        centerWorld,
        pxPerParcel,
        viewportPx,
        worldOverride: {
          x: Transform.get(engine.PlayerEntity).position.x,
          z: Transform.get(engine.PlayerEntity).position.z
        }
      })}

      <MapBottomLeftBar />
      <MapFooter />
    </UiEntity>
  )
}

function renderMarker({
  placeRepresentation,
  centerWorld,
  pxPerParcel,
  viewportPx,
  worldOverride
}: {
  placeRepresentation: PlaceRepresentation
  centerWorld: { x: number; z: number }
  pxPerParcel: number
  viewportPx: { width: number; height: number }
  worldOverride?: { x: number; z: number }
}): ReactElement | null {
  let screen: { x: number; y: number }
  if (worldOverride !== undefined) {
    const deltaParcelsX = (worldOverride.x - centerWorld.x) / PARCEL_METERS
    const deltaParcelsY = (worldOverride.z - centerWorld.z) / PARCEL_METERS
    screen = {
      x: viewportPx.width / 2 + deltaParcelsX * pxPerParcel,
      y: viewportPx.height / 2 - deltaParcelsY * pxPerParcel
    }
  } else {
    const central = placeRepresentation.base_position
    if (!central) return null
    const [pxParcel, pyParcel] = central.split(',').map(Number)
    if (Number.isNaN(pxParcel) || Number.isNaN(pyParcel)) return null
    screen = worldParcelToScreen(
      pxParcel,
      pyParcel,
      centerWorld.x,
      centerWorld.z,
      pxPerParcel,
      viewportPx
    )
  }

  if (
    screen.x < 0 ||
    screen.x > viewportPx.width ||
    screen.y < 0 ||
    screen.y > viewportPx.height
  ) {
    return null
  }

  const sizeMultiplier = placeRepresentation.isActive
    ? 2
    : placeRepresentation.sprite?.spriteName === 'PinPOI' ||
      placeRepresentation.user_favorite
    ? 1.5
    : placeRepresentation.sprite?.spriteName === 'PinLive'
    ? 1.5
    : 1
  const symbolSize = getContentScaleRatio() * 50 * sizeMultiplier

  const showLabel =
    placeRepresentation.id === PLAYER_PLACE_ID ||
    isHomePlace(placeRepresentation)
  const isPoi = placeRepresentation.sprite?.spriteName === 'PinPOI'
  const isPlayer = placeRepresentation.id === PLAYER_PLACE_ID
  const labelFontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY })
  const topOffset = isPlayer ? symbolSize / 2 : symbolSize

  return (
    <UiEntity
      key={`marker-${placeRepresentation.id}`}
      uiTransform={{
        positionType: 'absolute',
        position: {
          left: screen.x - symbolSize / 2,
          top: screen.y - topOffset
        },
        width: symbolSize,
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: getZIndexForPlaceSymbol(placeRepresentation)
      }}
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
        uiTransform={{ width: symbolSize, height: symbolSize }}
        onMouseUp={() => {
          if (moduleState.wasDragged) {
            moduleState.wasDragged = false
            return
          }
          if (placeRepresentation.id === PLAYER_PLACE_ID) return
          const coords = fromStringToCoords(placeRepresentation.base_position)
          console.log(`[bigmap2d] marker click parcel: ${coords.x},${coords.y}`)
          store.dispatch(
            updateHudStateAction({
              bigMap2DPendingCenter: {
                x: coords.x * PARCEL_METERS + PARCEL_METERS / 2,
                z: coords.y * PARCEL_METERS + PARCEL_METERS / 2,
                ts: Date.now()
              }
            })
          )
          getUiController()
            .sceneCard.showByData(placeRepresentation)
            .catch(console.error)
        }}
      />
      {showLabel && (
        <UiEntity
          uiTransform={{ position: { top: 0 } }}
          uiText={{
            value: isHomePlace(placeRepresentation) ? 'Home' : 'You are here',
            textAlign: 'top-center',
            textWrap: 'nowrap'
          }}
          uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
        />
      )}
      {isPoi && (
        <UiEntity
          uiTransform={{
            borderRadius: labelFontSize / 2,
            height: labelFontSize * 2,
            justifyContent: 'center',
            alignItems: 'center',
            margin: { top: labelFontSize / 2 },
            flexShrink: 0
          }}
          uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
          uiText={{
            value: `<b>${truncateWithoutBreakingWords(
              placeRepresentation.title ?? '',
              20
            )}</b>`,
            textWrap: 'nowrap',
            fontSize: labelFontSize,
            textAlign: 'middle-center',
            color: COLOR.WHITE
          }}
        />
      )}
    </UiEntity>
  )
}
