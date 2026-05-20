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
import { saveMinimapStyle } from './mini-map-persistence'
import { getUiController } from '../../controllers/ui.controller'
import { currentRealmProviderIsWorld } from '../../service/realm-change'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'
import useEffect = ReactEcs.useEffect

// Diameter of world (in meters) that fits across the minimap.
const VISIBLE_METERS = 256

// Module-level direction tracker: stores the latest non-zero sign of the
// player's movement on each world axis. Used to decide which neighbour
// chunks to prefetch (1 cardinal + 2 chunks for diagonals).
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

  const minimapStyle = store.getState().hud.minimapStyle ?? 'parcel'

  const playerTransform = Transform.get(engine.PlayerEntity)
  const playerWorldX = playerTransform.position.x
  const playerWorldZ = playerTransform.position.z

  const cameraYawDeg = Quaternion.toEulerAngles(
    Transform.get(engine.CameraEntity).rotation
  ).y
  const cameraYawRad = (cameraYawDeg * Math.PI) / 180

  const playerParcel = getPlayerParcel()

  // Parcel mode renders a single 2D quad with UV rotation — compute its
  // tile + UVs + prefetch list. Other modes do their own rendering.
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
        cameraYawRad
      )
    : null

  // Directional prefetch: load 1–3 neighbour chunks ahead of the player
  // so the swap is instant when they cross a snap boundary. Only relevant
  // for parcel mode (satellite uses a 3×3 window of 3D planes).
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

  // Load places catalog once.
  useEffect(() => {
    loadCompleteMapPlaces().catch(console.error)
  }, [])

  // Satellite mode lifecycle: spawn the TextureCamera + tile planes when
  // entering satellite mode, tear them down when leaving. Avoids paying
  // GPU + memory cost while in parcel/imposters mode.
  useEffect(() => {
    if (minimapStyle !== 'satellite') return
    // Lazy-spawn.
    getSatelliteCamera()
    return () => {
      disposeSatelliteCamera()
    }
  }, [minimapStyle])

  // Per-frame: keep satellite camera/tiles in sync with the player when
  // active. Skipping the work when not in satellite mode means no
  // wasted updates.
  useEffect(() => {
    if (minimapStyle !== 'satellite') return
    updateSatelliteCamera(playerWorldX, playerWorldZ, cameraYawDeg)
    updateSatelliteTiles(playerWorldX, playerWorldZ)
  })

  // Imposters mode lifecycle: spawn / dispose the world-facing
  // TextureCamera as the user toggles in / out of CAM mode.
  useEffect(() => {
    if (minimapStyle !== 'imposters') return
    getImpostersCamera()
    return () => {
      disposeImpostersCamera()
    }
  }, [minimapStyle])

  // Per-frame: follow the player + yaw while imposters mode is active.
  useEffect(() => {
    if (minimapStyle !== 'imposters') return
    updateImpostersCamera(playerWorldX, playerWorldZ, cameraYawDeg)
  })

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
        flexGrow: 0
      }}
      onMouseDown={() => {
        getUiController().menu?.show('map')
      }}
    >
      {/* Clipped layer: the rotating tiles + markers stay inside the
          minimap rect. Cardinal labels, player arrow and the toggle
          live OUTSIDE this clipped layer so they can overflow on top
          (e.g. the rotating N label sits half-out of the square). */}
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
        {/* PARCEL mode: single 2D quad sampling a re-centered parcel
          atlas image, rotated around the player's UV. */}
        {minimapStyle === 'parcel' && parcelTile && parcelTileUvs && (
          <UiEntity
            uiTransform={{
              width: mapSize,
              height: mapSize,
              positionType: 'absolute',
              position: { top: 0, left: 0 }
            }}
            uiBackground={{
              textureMode: 'stretch',
              uvs: parcelTileUvs,
              texture: { src: parcelTile.url }
            }}
          />
        )}

        {/* SATELLITE mode: render the TextureCamera output. The 3D
          tile planes + rotating camera live in `mini-map-satellite-camera`. */}
        {minimapStyle === 'satellite' && (
          <UiEntity
            uiTransform={{
              width: mapSize,
              height: mapSize,
              positionType: 'absolute',
              position: { top: 0, left: 0 }
            }}
            uiBackground={{
              textureMode: 'stretch',
              videoTexture: { videoPlayerEntity: getSatelliteCamera() }
            }}
          />
        )}

        {/* IMPOSTERS mode: top-down TextureCamera on the default world
          layer (0) — renders the actual scene / scene impostors from
          above. The 3D camera entity lives in `mini-map-imposters-camera`. */}
        {minimapStyle === 'imposters' && (
          <UiEntity
            uiTransform={{
              width: mapSize,
              height: mapSize,
              positionType: 'absolute',
              position: { top: 0, left: 0 }
            }}
            uiBackground={{
              textureMode: 'stretch',
              videoTexture: { videoPlayerEntity: getImpostersCamera() }
            }}
          />
        )}

        {/* PARCEL prefetch: invisible 1×1 quads so bevy AssetServer
          downloads the neighbour tile images ahead of the player
          crossing a snap boundary. Satellite uses a 3D windowed grid
          instead, so it doesn't need these. */}
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
              title={place.title}
            />
          )
        })}
      </UiEntity>

      <PlayerArrow mapSize={mapSize} />
      <CardinalLabels mapSize={mapSize} cameraYawDeg={cameraYawDeg} />
      <MinimapStyleToggle style={minimapStyle} />
    </UiEntity>
  )
}

const POI_SIZE = 18
// Width budget for the title shown below the POI icon. Wider than the
// icon so 2–3 word names render centered without immediate ellipsis,
// but bounded so long names don't bleed across neighbouring markers.
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
        // Container is the width of the label so we can horizontally
        // center both the icon and the text on the POI's screen point.
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
          // `<b>…</b>` is the SDK's inline bold markup — the SDK has no
          // fontWeight on UiText, but the renderer parses these tags.
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
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY_S })
  const padding = 4
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
        value: MINIMAP_STYLE_LABEL[style],
        fontSize: fontSize * 0.8,
        color: COLOR.WHITE
      }}
      onMouseDown={() => {
        const next = MINIMAP_STYLE_CYCLE[style]
        saveMinimapStyle(next)
        store.dispatch(
          updateHudStateAction({
            minimapStyle: next
          })
        )
      }}
    />
  )
}
