import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { engine, type Entity, Transform } from '@dcl/sdk/ecs'
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
import ButtonComponent from '../ui-system/button-component'
import ButtonIcon from '../button-icon/ButtonIcon'
import { type AtlasIcon } from '../../utils/definitions'
import useEffect = ReactEcs.useEffect
import useState = ReactEcs.useState
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
  const forceImposters = isWorld
  const minimapStyle: MinimapStyle = forceImposters
    ? 'imposters'
    : userMinimapStyle
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

  // Track the entities of each camera in state so the JSX can read them
  // without triggering a lazy create from inside render (side effects in
  // render are an anti-pattern and make cleanup harder to reason about).
  // The useEffect below owns setup + teardown; the JSX just reads.
  const [satelliteCameraEntity, setSatelliteCameraEntity] =
    useState<Entity | null>(null)
  const [impostersCameraEntity, setImpostersCameraEntity] =
    useState<Entity | null>(null)

  useEffect(() => {
    loadCompleteMapPlaces().catch(console.error)
  }, [])

  useEffect(() => {
    if (minimapStyle !== 'satellite') return
    setSatelliteCameraEntity(getSatelliteCamera())
    return () => {
      disposeSatelliteCamera()
      setSatelliteCameraEntity(null)
    }
  }, [minimapStyle])

  // Camera reposition depends on position + yaw (the TextureCamera is
  // rotated physically to follow the player's heading).
  useEffect(() => {
    if (minimapStyle !== 'satellite') return
    updateSatelliteCamera(playerWorldX, playerWorldZ, effectiveYawDeg)
  }, [minimapStyle, playerWorldX, playerWorldZ, effectiveYawDeg])

  // Tile selection depends on position only — yaw doesn't change which
  // satellite chunks fall inside the viewport (it's an axis-aligned
  // window over world coords; the circular mask hides the corners).
  useEffect(() => {
    if (minimapStyle !== 'satellite') return
    updateSatelliteTiles(playerWorldX, playerWorldZ)
  }, [minimapStyle, playerWorldX, playerWorldZ])

  useEffect(() => {
    if (minimapStyle !== 'imposters') return
    setImpostersCameraEntity(getImpostersCamera())
    return () => {
      disposeImpostersCamera()
      setImpostersCameraEntity(null)
    }
  }, [minimapStyle])

  useEffect(() => {
    if (minimapStyle !== 'imposters') return
    updateImpostersCamera(playerWorldX, playerWorldZ, effectiveYawDeg)
  }, [minimapStyle, playerWorldX, playerWorldZ, effectiveYawDeg])

  const places: Place[] = forceImposters
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

        {minimapStyle === 'satellite' && satelliteCameraEntity !== null && (
          <UiEntity
            uiTransform={mapUiTransform}
            uiBackground={{
              textureMode: 'stretch',
              videoTexture: { videoPlayerEntity: satelliteCameraEntity }
            }}
          />
        )}

        {minimapStyle === 'imposters' && impostersCameraEntity !== null && (
          <UiEntity
            uiTransform={mapUiTransform}
            uiBackground={{
              textureMode: 'stretch',
              videoTexture: { videoPlayerEntity: impostersCameraEntity }
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
          const dxFromCenter = screen.x - mapCenter
          const dyFromCenter = screen.y - mapCenter
          if (Math.hypot(dxFromCenter, dyFromCenter) > mapCenter - POI_SIZE / 2)
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
      <MinimapSettings
        style={minimapStyle}
        rotation={minimapRotation}
        hideStyleSection={forceImposters}
      />
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

const MINIMAP_ROTATION_LABEL: Record<MinimapRotation, string> = {
  camera: 'Rotate with camera',
  north: 'Fixed north'
}
const MINIMAP_STYLE_OPTION_LABEL: Record<MinimapStyle, string> = {
  parcel: 'Parcel atlas',
  satellite: 'Satellite',
  imposters: 'Camera'
}

const SETTINGS_ICON_IDLE: AtlasIcon = {
  atlasName: 'navbar',
  spriteName: 'Settings off'
}
const SETTINGS_ICON_HOVER: AtlasIcon = {
  atlasName: 'navbar',
  spriteName: 'Settings on'
}
const CHECK_ICON: AtlasIcon = { atlasName: 'icons', spriteName: 'Check' }

function MinimapSettings({
  style,
  rotation,
  hideStyleSection
}: {
  style: MinimapStyle
  rotation: MinimapRotation
  hideStyleSection: boolean
}): ReactElement {
  const [open, setOpen] = ReactEcs.useState<boolean>(false)
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY })
  const padding = fontSize / 4
  const gearSize = fontSize * 2

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: padding, right: -padding },
        width: gearSize,
        height: gearSize
      }}
    >
      <ButtonIcon
        variant="transparent"
        icon={SETTINGS_ICON_IDLE}
        hoverIcon={SETTINGS_ICON_HOVER}
        iconSize={gearSize}
        active={open}
        onMouseDown={() => {
          setOpen(!open)
        }}
      />
      {open && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 0, left: gearSize + padding },
            flexDirection: 'column',
            padding: { top: padding * 2, bottom: padding * 2 },
            minWidth: fontSize * 14,
            borderRadius: padding
          }}
          uiBackground={{ color: COLOR.BLACK }}
        >
          <SubmenuSection title="Rotation mode" fontSize={fontSize}>
            {(['camera', 'north'] as MinimapRotation[]).map((opt) => (
              <SubmenuOption
                key={`rot-${opt}`}
                label={MINIMAP_ROTATION_LABEL[opt]}
                selected={rotation === opt}
                fontSize={fontSize}
                onMouseDown={() => {
                  saveMinimapRotation(opt)
                  store.dispatch(updateHudStateAction({ minimapRotation: opt }))
                }}
              />
            ))}
          </SubmenuSection>

          {!hideStyleSection && (
            <SubmenuSection title="Visualization style" fontSize={fontSize}>
              {(['parcel', 'satellite', 'imposters'] as MinimapStyle[]).map(
                (opt) => (
                  <SubmenuOption
                    key={`style-${opt}`}
                    label={MINIMAP_STYLE_OPTION_LABEL[opt]}
                    selected={style === opt}
                    fontSize={fontSize}
                    onMouseDown={() => {
                      saveMinimapStyle(opt)
                      store.dispatch(
                        updateHudStateAction({ minimapStyle: opt })
                      )
                    }}
                  />
                )
              )}
            </SubmenuSection>
          )}
        </UiEntity>
      )}
    </UiEntity>
  )
}

function SubmenuSection({
  title,
  fontSize,
  children
}: {
  title: string
  fontSize: number
  children?: ReactElement | ReactElement[] | null
}): ReactElement {
  return (
    <UiEntity uiTransform={{ flexDirection: 'column' }}>
      <UiEntity
        uiTransform={{
          padding: { left: fontSize, right: fontSize, top: fontSize / 3 },
          height: fontSize * 1.6
        }}
        uiText={{
          value: title.toUpperCase(),
          fontSize,
          color: COLOR.WHITE_OPACITY_5,
          textAlign: 'middle-left'
        }}
      />
      {children}
    </UiEntity>
  )
}

function SubmenuOption({
  label,
  selected,
  fontSize,
  onMouseDown
}: {
  key?: any
  label: string
  selected: boolean
  fontSize: number
  onMouseDown: () => void
}): ReactElement {
  return (
    <ButtonComponent
      variant="transparent"
      value={label}
      icon={selected ? CHECK_ICON : undefined}
      iconSize={fontSize}
      fontSize={fontSize * 0.85}
      uiTransform={{
        justifyContent: 'flex-start',
        padding: { left: fontSize / 2, right: fontSize, top: 2, bottom: 2 }
      }}
      onMouseDown={onMouseDown}
    />
  )
}
