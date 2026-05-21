import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { engine, Transform } from '@dcl/sdk/ecs'
import { Quaternion } from '@dcl/sdk/math'

import { rotateUVs, truncateWithoutBreakingWords } from '../../utils/ui-utils'
import { COLOR } from '../color-palette'
import {
  getCentralParcel,
  getLoadedMapPlaces,
  getPlacesAroundParcel,
  loadCompleteMapPlaces,
  type Place
} from '../../service/map-places'
import { getPlayerParcel } from '../../service/player-scenes'
import { store } from '../../state/store'
import { updateHudStateAction } from '../../state/hud/actions'
import { getMapSize } from './mini-map-size'
import { getCardinalLabelPositions } from './mini-map-cardinals'
import {
  buildMinimapUvs,
  getPrefetchTiles,
  getTileInfo,
  type MinimapStyle,
  PARCEL_METERS,
  worldToScreen2D
} from './mini-map-tiles'
import {
  disposeSatelliteCamera,
  getSatelliteCamera,
  updateSatelliteCamera,
  updateSatelliteTiles
} from './mini-map-satellite-camera'
import {
  disposeImpostersCamera,
  getImpostersCamera,
  updateImpostersCamera
} from './mini-map-imposters-camera'
import {
  type MinimapRotation,
  saveMinimapRotation,
  saveMinimapStyle
} from './mini-map-persistence'
import { getUiController } from '../../controllers/ui.controller'
import { currentRealmProviderIsWorld } from '../../service/realm-change'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'
import ButtonComponent from '../button-component'
import useEffect = ReactEcs.useEffect
import { type UiTransformProps } from '@dcl/sdk/react-ecs'

const VISIBLE_METERS = 256

const directionState = {
  initialized: false,
  lastWorldX: 0,
  lastWorldZ: 0,
  dirX: 0 as -1 | 0 | 1,
  dirZ: 0 as -1 | 0 | 1
}
const DELTA_THRESHOLD_METERS = 0.05

function updateDirection(
  playerWorldX: number,
  playerWorldZ: number
): { dirX: -1 | 0 | 1; dirZ: -1 | 0 | 1 } {
  if (!directionState.initialized) {
    directionState.initialized = true
    directionState.lastWorldX = playerWorldX
    directionState.lastWorldZ = playerWorldZ
    return { dirX: 0, dirZ: 0 }
  }
  const deltaX = playerWorldX - directionState.lastWorldX
  const deltaZ = playerWorldZ - directionState.lastWorldZ
  if (Math.abs(deltaX) > DELTA_THRESHOLD_METERS) {
    directionState.dirX = Math.sign(deltaX) as -1 | 1
  }
  if (Math.abs(deltaZ) > DELTA_THRESHOLD_METERS) {
    directionState.dirZ = Math.sign(deltaZ) as -1 | 1
  }
  directionState.lastWorldX = playerWorldX
  directionState.lastWorldZ = playerWorldZ
  return { dirX: directionState.dirX, dirZ: directionState.dirZ }
}

const POI_SRC = 'assets/images/map/POI.png'
const MAP_ARROW_SRC = 'assets/images/MapArrow.png'

export function MiniMapContent(): ReactElement {
  const mapSize = getMapSize()
  const mapCenter = mapSize / 2
  const pxPerMeter = mapSize / VISIBLE_METERS

  const userMinimapStyle = store.getState().hud.minimapStyle ?? 'satellite'
  const isWorld = currentRealmProviderIsWorld()
  const minimapStyle: MinimapStyle = isWorld ? 'imposters' : userMinimapStyle
  const minimapRotation: MinimapRotation =
    store.getState().hud.minimapRotation ?? 'north'

  const playerTransform = Transform.get(engine.PlayerEntity)
  const playerWorldX = playerTransform.position.x
  const playerWorldZ = playerTransform.position.z

  const cameraYawDeg = Quaternion.toEulerAngles(
    Transform.get(engine.CameraEntity).rotation
  ).y
  const effectiveYawDeg = minimapRotation === 'north' ? 0 : cameraYawDeg
  const effectiveYawRad = (effectiveYawDeg * Math.PI) / 180

  const playerParcel = getPlayerParcel()

  const parcelTile =
    minimapStyle === 'parcel'
      ? getTileInfo('parcel', playerParcel.x, playerParcel.y)
      : null
  const parcelTileUvs = parcelTile
    ? buildMinimapUvs(
        playerWorldX,
        playerWorldZ,
        parcelTile,
        VISIBLE_METERS,
        effectiveYawRad
      )
    : null

  const { dirX, dirZ } = updateDirection(playerWorldX, playerWorldZ)
  const prefetchTiles =
    minimapStyle === 'parcel'
      ? getPrefetchTiles(
          minimapStyle,
          playerParcel.x,
          playerParcel.y,
          dirX,
          dirZ
        )
      : []

  useEffect(() => {
    loadCompleteMapPlaces().catch(console.error)
  }, [])

  useEffect(() => {
    if (minimapStyle !== 'satellite') return
    getSatelliteCamera()
    return () => {
      disposeSatelliteCamera()
    }
  }, [minimapStyle])

  useEffect(() => {
    if (minimapStyle !== 'satellite') return
    updateSatelliteCamera(playerWorldX, playerWorldZ, effectiveYawDeg)
    updateSatelliteTiles(playerWorldX, playerWorldZ)
  })

  useEffect(() => {
    if (minimapStyle !== 'imposters') return
    getImpostersCamera()
    return () => {
      disposeImpostersCamera()
    }
  }, [minimapStyle])

  useEffect(() => {
    if (minimapStyle !== 'imposters') return
    updateImpostersCamera(playerWorldX, playerWorldZ, effectiveYawDeg)
  })

  const places: Place[] = isWorld
    ? []
    : getPlacesAroundParcel(playerParcel, 10).filter((p) =>
        p.categories.some((c: string) => c === 'poi' || c === 'player')
      )
  void getLoadedMapPlaces()
  const mapUiTransform: UiTransformProps = {
    width: mapSize,
    height: mapSize,
    positionType: 'absolute',
    position: { top: 0, left: 0 },
    borderRadius: 9999
  }
  return (
    <UiEntity
      uiTransform={{
        width: mapSize,
        height: mapSize,
        flexShrink: 0,
        flexGrow: 0
      }}
      onMouseDown={() => {
        getUiController().menu?.show('map')
      }}
    >
      <UiEntity
        uiTransform={{
          width: mapSize,
          height: mapSize,
          positionType: 'absolute',
          position: { top: 0, left: 0 },
          overflow: 'hidden'
        }}
        uiBackground={{ color: COLOR.BLACK_TRANSPARENT }}
      >
        {minimapStyle === 'parcel' && parcelTile && parcelTileUvs && (
          <UiEntity
            uiTransform={mapUiTransform}
            uiBackground={{
              textureMode: 'stretch',
              uvs: parcelTileUvs,
              texture: { src: parcelTile.url }
            }}
          />
        )}

        {minimapStyle === 'satellite' && (
          <UiEntity
            uiTransform={mapUiTransform}
            uiBackground={{
              textureMode: 'stretch',
              videoTexture: { videoPlayerEntity: getSatelliteCamera() }
            }}
          />
        )}

        {minimapStyle === 'imposters' && (
          <UiEntity
            uiTransform={mapUiTransform}
            uiBackground={{
              textureMode: 'stretch',
              videoTexture: { videoPlayerEntity: getImpostersCamera() }
            }}
          />
        )}

        {prefetchTiles.map((p) => (
          <UiEntity
            key={`prefetch-${p.url}`}
            uiTransform={{
              width: 1,
              height: 1,
              positionType: 'absolute',
              position: { top: 0, left: 0 }
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: { src: p.url }
            }}
          />
        ))}

        {places.map((place) => {
          const central = getCentralParcel(place.positions ?? [])
          if (!central) return null
          const [cx, cy] = central.split(',').map(Number)
          const worldX = cx * PARCEL_METERS + PARCEL_METERS / 2
          const worldZ = cy * PARCEL_METERS + PARCEL_METERS / 2
          const screen = worldToScreen2D(
            worldX,
            worldZ,
            playerWorldX,
            playerWorldZ,
            effectiveYawRad,
            pxPerMeter,
            mapCenter
          )
          if (
            screen.x < -POI_SIZE ||
            screen.x > mapSize + POI_SIZE ||
            screen.y < -POI_SIZE ||
            screen.y > mapSize + POI_SIZE
          )
            return null
          return (
            <PoiMarker
              key={`poi-${place.id}`}
              screenX={screen.x}
              screenY={screen.y}
              title={place.title}
            />
          )
        })}
      </UiEntity>

      <PlayerArrow mapSize={mapSize} mapYawDeg={effectiveYawDeg} />
      <CardinalLabels mapSize={mapSize} cameraYawDeg={effectiveYawDeg} />
      {!isWorld && <MinimapStyleToggle style={minimapStyle} />}
      <MinimapRotationToggle rotation={minimapRotation} />
    </UiEntity>
  )
}

const POI_SIZE = 18
const POI_LABEL_WIDTH = 90

function PoiMarker({
  screenX,
  screenY,
  title
}: {
  screenX: number
  screenY: number
  title: string
  key?: any
}): ReactElement {
  const labelFontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY })
  return (
    <UiEntity
      uiTransform={{
        width: POI_LABEL_WIDTH,
        height: POI_SIZE + labelFontSize * 1.4,
        positionType: 'absolute',
        position: {
          left: screenX - POI_LABEL_WIDTH / 2,
          top: screenY - POI_SIZE / 2
        },
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <UiEntity
        uiTransform={{ width: POI_SIZE, height: POI_SIZE, flexShrink: 0 }}
        uiBackground={{
          textureMode: 'stretch',
          texture: { src: POI_SRC }
        }}
      />
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
          value: `<b>${truncateWithoutBreakingWords(title, 20)}</b>`,
          textWrap: 'nowrap',
          fontSize: labelFontSize,
          textAlign: 'middle-center',
          color: COLOR.WHITE
        }}
      />
    </UiEntity>
  )
}

function CardinalLabels({
  mapSize,
  cameraYawDeg
}: {
  mapSize: number
  cameraYawDeg: number
}): ReactElement {
  const labelPositions = getCardinalLabelPositions(mapSize, -cameraYawDeg, 0)
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY_S })
  return (
    <UiEntity
      uiText={{
        value: 'N',
        fontSize,
        textAlign: 'middle-center'
      }}
      uiTransform={{
        positionType: 'absolute',
        position: {
          top: labelPositions.N.y - fontSize,
          left: labelPositions.N.x - fontSize
        },
        borderRadius: 99,
        borderWidth: 0,
        borderColor: COLOR.BLACK_TRANSPARENT
      }}
      uiBackground={{ color: COLOR.BLACK }}
    />
  )
}

function PlayerArrow({
  mapSize = 1000,
  mapYawDeg
}: {
  mapSize: number
  mapYawDeg: number
}): ReactElement {
  const ARROW_SIZE = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY_S }) * 2
  const playerYawDeg = Quaternion.toEulerAngles(
    Transform.get(engine.PlayerEntity).rotation
  ).y
  return (
    <UiEntity
      uiTransform={{
        width: ARROW_SIZE,
        height: ARROW_SIZE,
        positionType: 'absolute',
        position: {
          top: mapSize / 2 - ARROW_SIZE / 2,
          left: mapSize / 2 - ARROW_SIZE / 2
        }
      }}
      uiBackground={{
        textureMode: 'stretch',
        uvs: rotateUVs(playerYawDeg - mapYawDeg),
        texture: { src: MAP_ARROW_SRC }
      }}
    />
  )
}

const MINIMAP_STYLE_CYCLE: Record<MinimapStyle, MinimapStyle> = {
  parcel: 'satellite',
  satellite: 'imposters',
  imposters: 'parcel'
}
const MINIMAP_STYLE_LABEL: Record<MinimapStyle, string> = {
  parcel: 'PARCEL',
  satellite: 'PIC',
  imposters: 'CAM'
}

function MinimapStyleToggle({ style }: { style: MinimapStyle }): ReactElement {
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.CAPTION })
  return (
    <ButtonComponent
      variant="black"
      value={MINIMAP_STYLE_LABEL[style]}
      fontSize={fontSize}
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, right: 0 }
      }}
      onMouseDown={() => {
        const next = MINIMAP_STYLE_CYCLE[style]
        saveMinimapStyle(next)
        store.dispatch(updateHudStateAction({ minimapStyle: next }))
      }}
    />
  )
}

const MINIMAP_ROTATION_LABEL: Record<MinimapRotation, string> = {
  camera: 'ROT',
  north: 'NORTH'
}

function MinimapRotationToggle({
  rotation
}: {
  rotation: MinimapRotation
}): ReactElement {
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.CAPTION })

  return (
    <ButtonComponent
      variant="black"
      value={MINIMAP_ROTATION_LABEL[rotation]}
      fontSize={fontSize}
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 }
      }}
      onMouseDown={() => {
        const next: MinimapRotation = rotation === 'camera' ? 'north' : 'camera'
        saveMinimapRotation(next)
        store.dispatch(updateHudStateAction({ minimapRotation: next }))
      }}
    />
  )
}
