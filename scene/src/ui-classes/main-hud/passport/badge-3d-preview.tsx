import { ReactEcs, ReactElement, UiEntity } from '@dcl/react-ecs'
import useEffect = ReactEcs.useEffect
import { store } from '../../../state/store'
import {
  CameraLayer,
  CameraLayers,
  engine,
  Entity,
  executeTask,
  Material,
  MeshRenderer,
  TextureCamera,
  Transform
} from '@dcl/sdk/ecs'
import useState = ReactEcs.useState
import { getAliveAvatarPreviews } from '../../../components/backpack/AvatarPreviewElement'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { COLOR } from '../../../components/color-palette'
import { waitFor } from '../../../utils/dcl-utils'

export function Badge3dPreviewElement(): ReactElement | null {
  const [badgePreviewCamera, setBadgePreviewCamera] = useState<Entity | null>(
    null
  )
  const [badgeEntity, setBadgeEntity] = useState<Entity | null>(null)

  useEffect(() => {
    executeTask(async () => {
      await waitFor(() => !!store.getState().hud.passportSelectedBadge)

      const { badgeEntity, badgeCameraEntity } = createBadgePreview()
      setBadgeEntity(badgeEntity)
      setBadgePreviewCamera(badgeCameraEntity)
    })
  }, [])

  useEffect(() => {
    executeTask(async () => {
      if (!store.getState().hud.passportSelectedBadge) return
      if (!badgeEntity) return
      console.log(
        'passportSelectedBadge',
        store.getState().hud.passportSelectedBadge
      )
      console.log('badgeEntity', badgeEntity)

      const texture = Material.Texture.Common({
        src:
          store.getState().hud.passportSelectedBadge?.assets['3d']?.basecolor ??
          ''
      })
      const bumpTexture = Material.Texture.Common({
        src:
          store.getState().hud.passportSelectedBadge?.assets['3d']?.normal ?? ''
      })
      Material.setPbrMaterial(badgeEntity, {
        albedoColor: Color4.White(),
        metallic: 0.8,
        roughness: 0.1,
        texture,
        bumpTexture,
        alphaTest: 0.5
      })
      console.log('setRpb')
    })
  }, [badgeEntity, store.getState().hud.passportSelectedBadge])

  if (!badgePreviewCamera) return null

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        borderRadius: 0,
        borderWidth: 1,
        borderColor: COLOR.BLACK_TRANSPARENT
      }}
      uiBackground={{
        videoTexture: { videoPlayerEntity: badgePreviewCamera },

        textureMode: 'stretch'
      }}
    ></UiEntity>
  )
}
const FloatingBadgeComponent = engine.defineComponent('FloatingBadge', {})
const CAMERA_SIZE = { WIDTH: 270 * 2, HEIGHT: 600 * 2 }
function createBadgePreview(): {
  badgeEntity: Entity
  badgeCameraEntity: Entity
} {
  engine.removeSystem(FloatingBadgeSystem)
  engine.addSystem(FloatingBadgeSystem)

  const badgeEntity = engine.addEntity()
  const badgeCameraEntity = engine.addEntity()
  const layer = getAliveAvatarPreviews() + 11

  MeshRenderer.setPlane(badgeEntity)
  Transform.create(badgeEntity, {
    position: Vector3.create(8, -0.6, 8),
    rotation: Quaternion.fromEulerDegrees(5, 5, 0),
    scale: { x: 3.5, y: 3, z: 2 }
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
    clearColor: Color4.create(0.4, 0.4, 1.0, 0),
    mode: {
      $case: 'orthographic',
      orthographic: {
        verticalRange: 5
      }
    },
    volume: 1
  })
  FloatingBadgeComponent.create(badgeEntity, {})

  return { badgeEntity, badgeCameraEntity }
}

function FloatingBadgeSystem(dt: number) {
  const t = Date.now() / 1000
  for (const [badgeEntity] of engine.getEntitiesWith(FloatingBadgeComponent)) {
    const transform = Transform.getMutable(badgeEntity)
    transform.position.y = 0 + Math.sin(t) * 0.1
    transform.position.x = 8 + Math.cos(t) * 0.1
    transform.rotation = Quaternion.fromEulerDegrees(
      2 + Math.cos(t) * 1,
      5 + Math.cos(t) * 2,
      0
    )
  }
}
