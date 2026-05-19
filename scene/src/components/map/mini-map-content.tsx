import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { engine, Transform } from '@dcl/sdk/ecs'
import { Quaternion } from '@dcl/sdk/math'

import { rotateUVs } from '../../utils/ui-utils'
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
  getTileInfo,
  PARCEL_METERS,
  worldToScreen2D
} from './mini-map-tiles'
import { getUiController } from '../../controllers/ui.controller'
import { currentRealmProviderIsWorld } from '../../service/realm-change'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'
import useEffect = ReactEcs.useEffect

// Diameter of world (in meters) that fits across the minimap.
const VISIBLE_METERS = 256

const POI_SRC = 'assets/images/map/POI.png'
const MAP_ARROW_SRC = 'assets/images/MapArrow.png'

export function MiniMapContent(): ReactElement {
  const mapSize = getMapSize()
  const mapCenter = mapSize / 2
  const pxPerMeter = mapSize / VISIBLE_METERS

  const minimapStyle = store.getState().hud.minimapStyle ?? 'parcel'

  const playerTransform = Transform.get(engine.PlayerEntity)
  const playerWorldX = playerTransform.position.x
  const playerWorldZ = playerTransform.position.z

  const cameraYawDeg = Quaternion.toEulerAngles(
    Transform.get(engine.CameraEntity).rotation
  ).y
  const cameraYawRad = (cameraYawDeg * Math.PI) / 180

  const playerParcel = getPlayerParcel()
  const tile = getTileInfo(minimapStyle, playerParcel.x, playerParcel.y)
  const tileUvs = buildMinimapUvs(
    playerWorldX,
    playerWorldZ,
    tile,
    VISIBLE_METERS,
    cameraYawRad
  )

  // Load places catalog once.
  useEffect(() => {
    loadCompleteMapPlaces().catch(console.error)
  }, [])

  // POIs/places shown as 2D markers. Skip in worlds (no map context).
  const places: Place[] = currentRealmProviderIsWorld()
    ? []
    : getPlacesAroundParcel(playerParcel, 10).filter((p) =>
        p.categories.some((c: string) => c === 'poi' || c === 'player')
      )
  // Tie places state to a memo via getLoadedMapPlaces (re-evaluated per render).
  void getLoadedMapPlaces()

  return (
    <UiEntity
      uiTransform={{
        width: mapSize,
        height: mapSize,
        flexShrink: 0,
        flexGrow: 0,
        overflow: 'hidden'
      }}
      uiBackground={{ color: COLOR.BLACK_TRANSPARENT }}
      onMouseDown={() => {
        getUiController().menu?.show('map')
      }}
    >
      {/* Single image tile covering the whole viewport. The UV array
          samples a sub-region of the underlying texture, centered on
          the player and rotated with the camera. */}
      <UiEntity
        uiTransform={{
          width: mapSize,
          height: mapSize,
          positionType: 'absolute',
          position: { top: 0, left: 0 }
        }}
        uiBackground={{
          textureMode: 'stretch',
          uvs: tileUvs,
          texture: { src: tile.url }
        }}
      />

      {/* POI markers */}
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
          cameraYawRad,
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
          />
        )
      })}

      <PlayerArrow mapSize={mapSize} />
      <CardinalLabels mapSize={mapSize} cameraYawDeg={cameraYawDeg} />
      <MinimapStyleToggle style={minimapStyle} />
    </UiEntity>
  )
}

const POI_SIZE = 18

function PoiMarker({
  screenX,
  screenY
}: {
  screenX: number
  screenY: number
  key?: any
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        width: POI_SIZE,
        height: POI_SIZE,
        positionType: 'absolute',
        position: {
          left: screenX - POI_SIZE / 2,
          top: screenY - POI_SIZE / 2
        }
      }}
      uiBackground={{
        textureMode: 'stretch',
        texture: { src: POI_SRC }
      }}
    />
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
        textAlign: 'middle-center',
        outlineColor: COLOR.TEXT_COLOR,
        outlineWidth: fontSize / 10
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

function PlayerArrow({ mapSize = 1000 }: { mapSize: number }): ReactElement {
  const ARROW_SIZE = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY_S }) * 2
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
        uvs: rotateUVs(
          Quaternion.toEulerAngles(Transform.get(engine.PlayerEntity).rotation)
            .y -
            Quaternion.toEulerAngles(
              Transform.get(engine.CameraEntity).rotation
            ).y
        ),
        texture: { src: MAP_ARROW_SRC }
      }}
    />
  )
}

function MinimapStyleToggle({
  style
}: {
  style: 'parcel' | 'satellite'
}): ReactElement {
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY_S })
  const padding = 4
  const label = style === 'satellite' ? 'SAT' : 'MAP'
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: padding, right: padding },
        padding: { left: padding, right: padding, top: 2, bottom: 2 },
        borderRadius: 4,
        borderWidth: 0,
        borderColor: COLOR.BLACK_TRANSPARENT
      }}
      uiBackground={{ color: COLOR.BLACK }}
      uiText={{
        value: label,
        fontSize: fontSize * 0.8,
        color: COLOR.WHITE
      }}
      onMouseDown={() => {
        store.dispatch(
          updateHudStateAction({
            minimapStyle: style === 'parcel' ? 'satellite' : 'parcel'
          })
        )
      }}
    />
  )
}
