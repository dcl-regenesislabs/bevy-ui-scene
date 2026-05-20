import {
  CameraLayer,
  engine,
  type Entity,
  TextureCamera,
  Transform
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'

const IMPOSTERS_LAYER = 0

const IMPOSTERS_CAMERA_ALT = 201

const IMPOSTERS_CAMERA_X_ANGLE = 89.9

const IMPOSTERS_VISIBLE_METERS = 256

const IMPOSTERS_RT_SIZE = 512

let cameraEntity: Entity = engine.RootEntity

export function getImpostersCamera(): Entity {
  if (cameraEntity === engine.RootEntity) {
    cameraEntity = engine.addEntity()
    Transform.create(cameraEntity, {
      position: Vector3.create(0, IMPOSTERS_CAMERA_ALT, 0),
      rotation: Quaternion.fromEulerDegrees(IMPOSTERS_CAMERA_X_ANGLE, 0, 0)
    })
    CameraLayer.create(cameraEntity, {
      layer: IMPOSTERS_LAYER,
      directionalLight: false,
      showAvatars: false,
      showSkybox: false,
      showFog: false,
      ambientBrightnessOverride: 5,
      ambientColorOverride: Color3.White()
    })
    TextureCamera.create(cameraEntity, {
      width: IMPOSTERS_RT_SIZE,
      height: IMPOSTERS_RT_SIZE,
      layer: IMPOSTERS_LAYER,
      clearColor: Color4.create(0, 0, 0, 1),
      mode: {
        $case: 'orthographic',
        orthographic: { verticalRange: IMPOSTERS_VISIBLE_METERS }
      },
      volume: 1
    })
  }
  return cameraEntity
}

export function updateImpostersCamera(
  playerWorldX: number,
  playerWorldZ: number,
  yawDeg: number
): void {
  if (cameraEntity === engine.RootEntity) return
  const t = Transform.getMutableOrNull(cameraEntity)
  if (!t) return
  t.position.x = playerWorldX
  t.position.z = playerWorldZ
  Object.assign(
    t.rotation,
    Quaternion.fromEulerDegrees(IMPOSTERS_CAMERA_X_ANGLE, yawDeg, 0)
  )
}

export function disposeImpostersCamera(): void {
  if (cameraEntity !== engine.RootEntity) {
    engine.removeEntityWithChildren(cameraEntity)
    cameraEntity = engine.RootEntity
  }
}
