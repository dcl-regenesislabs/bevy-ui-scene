import { ReactEcs, ReactElement, UiEntity } from '@dcl/react-ecs'
import useEffect = ReactEcs.useEffect
import { store } from '../../../state/store'
import {
  AvatarShape,
  CameraLayer,
  CameraLayers,
  engine,
  Entity,
  executeTask,
  MeshRenderer,
  TextureCamera,
  Transform
} from '@dcl/sdk/ecs'
import useState = ReactEcs.useState
import { getAliveAvatarPreviews } from '../../../components/backpack/AvatarPreviewElement'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { COLOR } from '../../../components/color-palette'
import { waitFor } from '../../../utils/dcl-utils'
import { getAvatarShapeFromBackpackStore } from '../../main-menu/backpack-page/backpack-avatar-preview-element'

export function Badge3dPreviewElement(): ReactElement | null {
  useEffect(() => {
    executeTask(async () => {
      await waitFor(() => !!store.getState().hud.passportSelectedBadge)

      const { badgeEntity, badgeCameraEntity } = createBadgePreview()

      setBadgePreviewCamera(badgeCameraEntity)
    })
  }, [])

  useEffect(() => {}, [store.getState().hud.passportSelectedBadge])

  const [badgePreviewCamera, setBadgePreviewCamera] = useState<Entity | null>(
    null
  )
  if (!badgePreviewCamera) return null

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        borderRadius: 0,
        borderWidth: 1,
        borderColor: COLOR.WHITE
      }}
      uiBackground={{
        videoTexture: { videoPlayerEntity: badgePreviewCamera },

        textureMode: 'stretch'
      }}
    ></UiEntity>
  )
}

const CAMERA_SIZE = { WIDTH: 270 * 2, HEIGHT: 600 * 2 }
function createBadgePreview(): {
  badgeEntity: Entity
  badgeCameraEntity: Entity
} {
  const badgeEntity = engine.addEntity()
  const badgeCameraEntity = engine.addEntity()
  const layer = getAliveAvatarPreviews() + 11
  MeshRenderer.setPlane(badgeEntity)
  Transform.create(badgeEntity, {
    position: Vector3.create(8, 0, 8),
    rotation: Quaternion.fromEulerDegrees(-5, 175, 0),
    scale: { x: 4, y: 4, z: 2 }
  })

  Transform.create(badgeCameraEntity, {
    position: Vector3.create(0, 0, 0),
    rotation: Quaternion.fromLookAt(
      Vector3.create(0, 0, 0),
      Transform.get(badgeEntity).position
    )
  })

  CameraLayers.create(badgeEntity, {
    layers: [layer]
  })
  CameraLayer.create(badgeCameraEntity, {
    layer,
    directionalLight: false,
    showAvatars: false,
    showSkybox: false,
    showFog: false,
    ambientBrightnessOverride: 5
  })
  TextureCamera.create(badgeCameraEntity, {
    width: CAMERA_SIZE.WIDTH,
    height: CAMERA_SIZE.HEIGHT,
    layer,
    clearColor: Color4.create(0.4, 0.4, 1.0, 1),
    mode: {
      $case: 'orthographic',
      orthographic: {
        verticalRange: 15
      }
    },
    volume: 1
  })
  return { badgeEntity, badgeCameraEntity }
}
