import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import useEffect = ReactEcs.useEffect
import { engine, Transform } from '@dcl/sdk/ecs'
import { Quaternion } from '@dcl/sdk/math'

import { rotateUVs } from '../../utils/ui-utils'
import { COLOR } from '../color-palette'
import {
  getLoadedMapPlaces,
  getPlacesAroundParcel,
  loadCompleteMapPlaces,
  type Place
} from '../../service/map-places'
import { getPlayerParcel } from '../../service/player-scenes'
import useState = ReactEcs.useState

import {
  CAMERA_X_ANGLE,
  disposeMiniMapCameraEntities,
  getMapInfoCamera,
  getMinimapCamera
} from './mini-map-camera'
import {
  applyRotation,
  renderMinimapPlayers,
  renderVisiblePlaces,
  updatePlayerSymbolPositions
} from './mini-map-info-entities'
import { getMapSize } from './mini-map-size'
import { getCardinalLabelPositions } from './mini-map-cardinals'
import {
  createOrGetAvatarsTracker,
  getPlayerAvatarEntities
} from '../../service/avatar-tracker'
import { getUiController } from '../../controllers/ui.controller'
import { currentRealmProviderIsWorld } from '../../service/realm-change'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'

export function MiniMapContent(): ReactElement {
  const mapSize = getMapSize()
  const [parcelsAroundIds, setParcelsAroundIds] = useState<string>('')
  const [parcelsAround, setParcelsAround] = useState<Place[]>([])

  useEffect(() => {
    try {
      if (getMinimapCamera() === engine.RootEntity) return
      const playerGlobalTransform = Transform.get(engine.PlayerEntity)
      const minimapCameraTransform = Transform.getMutable(getMinimapCamera())

      const mutableCameraPosition = minimapCameraTransform.position
      const mutableInfoCameraTransform = Transform.getMutable(
        getMapInfoCamera()
      )
      const mutableInfoCameraPosition = mutableInfoCameraTransform.position
      mutableCameraPosition.x = mutableInfoCameraPosition.x =
        playerGlobalTransform.position.x
      mutableCameraPosition.z = mutableInfoCameraPosition.z =
        playerGlobalTransform.position.z

      const cameraRotation = Quaternion.toEulerAngles(
        Transform.get(engine.CameraEntity).rotation
      )

      Object.assign(
        minimapCameraTransform.rotation,
        Quaternion.fromEulerDegrees(CAMERA_X_ANGLE, cameraRotation.y, 0)
      )
      Object.assign(
        mutableInfoCameraTransform.rotation,
        Quaternion.fromEulerDegrees(CAMERA_X_ANGLE, cameraRotation.y, 0)
      )
      applyRotation(cameraRotation.y)
    } catch (error) {
      console.log(error)
    }
    if (Date.now() % 3 === 0) {
      updatePlayerSymbolPositions()
    }
  })

  useEffect(() => {
    loadCompleteMapPlaces().catch(console.error)
    renderMinimapPlayers(getPlayerAvatarEntities())
    const avatarTracker = createOrGetAvatarsTracker()

    avatarTracker.onEnterScene((userId) => {
      // TODO review
      renderMinimapPlayers(getPlayerAvatarEntities())
    })
    avatarTracker.onLeaveScene((userId) => {
      renderMinimapPlayers(getPlayerAvatarEntities())
    })
    return () => {
      console.log('DISPOSE_MINIMAP')
      disposeMiniMapCameraEntities()
    }
  }, [])

  useEffect(() => {
    if (currentRealmProviderIsWorld()) {
      renderVisiblePlaces([])
    } else {
      renderVisiblePlaces(parcelsAround)
    }
  }, [parcelsAroundIds])

  useEffect(() => {
    const playerParcel = getPlayerParcel()
    const placesAroundPlayerParcel = getPlacesAroundParcel(
      playerParcel,
      10
    ).filter((p) =>
      p.categories.some((c: string) => c === 'poi' || c === 'player')
    )
    setParcelsAroundIds(
      placesAroundPlayerParcel.map((p) => p.base_position).join(',')
    )

    setParcelsAround(placesAroundPlayerParcel)
  }, [getPlayerParcel(), getLoadedMapPlaces()])

  return (
    <UiEntity
      uiTransform={{
        width: mapSize,
        height: mapSize,
        flexShrink: 0,
        flexGrow: 0
      }}
      uiBackground={{
        textureMode: 'stretch',
        videoTexture: {
          videoPlayerEntity: getMinimapCamera()
        }
      }}
      onMouseDown={() => {
        getUiController().menu?.show('map')
      }}
    >
      <UiEntity
        uiTransform={{
          width: mapSize,
          height: mapSize,
          flexShrink: 0,
          flexGrow: 0,
          positionType: 'absolute',
          position: { top: 0, left: 0 }
        }}
        uiBackground={{
          textureMode: 'stretch',
          videoTexture: {
            videoPlayerEntity: getMapInfoCamera()
          }
        }}
      />
      <PlayerArrow mapSize={mapSize} />
      {CardinalLabels()}
    </UiEntity>
  )
}

function CardinalLabels(): ReactElement {
  const labelPositions = getCardinalLabelPositions(
    getMapSize(),
    -Quaternion.toEulerAngles(Transform.get(engine.CameraEntity).rotation).y,
    0
  )
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
      uiBackground={{
        color: COLOR.BLACK
      }}
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
        texture: {
          src: 'assets/images/MapArrow.png'
        }
      }}
    />
  )
}
