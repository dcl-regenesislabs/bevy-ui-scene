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
import { Column } from '../../../components/layout'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { formatCompletedAt } from './badges-collection'

export function Badge3dPreviewElement(): ReactElement | null {
  const [badgePreviewCamera, setBadgePreviewCamera] = useState<Entity | null>(
    null
  )
  const [badgeEntity, setBadgeEntity] = useState<Entity | null>(null)

  useEffect(() => {
    const badgePreviewEntities = createBadgePreview()

    setBadgeEntity(badgePreviewEntities.badgeEntity)
    setBadgePreviewCamera(badgePreviewEntities.badgeCameraEntity)

    return () => {
      if (badgePreviewEntities.badgeEntity)
        engine.removeEntity(badgePreviewEntities.badgeEntity)

      if (badgePreviewEntities.badgeCameraEntity)
        engine.removeEntity(badgePreviewEntities.badgeCameraEntity)

      engine.removeSystem(FloatingBadgeSystem)
    }
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
  if (!store.getState().hud.passportSelectedBadge) return null

  return (
    <Column
      uiTransform={{
        width: '100%',
        height: '100%',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      }}
      uiBackground={{
        videoTexture: { videoPlayerEntity: badgePreviewCamera },

        textureMode: 'stretch'
      }}
    >
      <Column
        uiTransform={{
          width: '100%',
          margin: { top: '132%' },
          padding: { left: '5%' },
          alignItems: 'flex-start',
          justifyContent: 'flex-start'
        }}
      >
        <UiEntity
          uiTransform={{
            margin: { left: '-1%' }
          }}
          uiText={{
            value: `<b>${store.getState().hud.passportSelectedBadge?.name}</b>`,
            fontSize: getFontSize({
              context: CONTEXT.DIALOG,
              token: TYPOGRAPHY_TOKENS.TITLE_M
            }),
            textAlign: 'top-left'
          }}
        />
        <UiEntity
          uiTransform={{
            margin: { top: '-3%' }
          }}
          uiText={{
            value: `Unlocked: ${formatCompletedAt(
              store.getState().hud.passportSelectedBadge?.completedAt ?? ''
            )}`,
            textAlign: 'top-left',
            fontSize: getFontSize({
              context: CONTEXT.DIALOG,
              token: TYPOGRAPHY_TOKENS.BODY_S
            }),
            color: COLOR.TEXT_COLOR_LIGHT_GREY
          }}
        />
        <UiEntity
          uiText={{
            value:
              store
                .getState()
                .hud.passportSelectedBadge?.description.replace(/;/g, '\n') ??
              '',
            fontSize: getFontSize({
              context: CONTEXT.DIALOG,
              token: TYPOGRAPHY_TOKENS.BODY_S
            }),
            textAlign: 'top-left'
          }}
        />
      </Column>
    </Column>
  )
}
const FloatingBadgeComponent = engine.defineComponent('FloatingBadge', {})
const CAMERA_SIZE = { WIDTH: 270 * 2, HEIGHT: 600 * 2 }

function createBadgePreview(): {
  badgeEntity: Entity
  badgeCameraEntity: Entity
} {
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
