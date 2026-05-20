/**
 * Imposters minimap render pipeline.
 *
 * A top-down `TextureCamera` looking at the *actual* world (layer 0):
 * the live scene geometry, scene impostors, and whatever else the
 * default camera renders — but flattened from above. Unlike the
 * satellite mode there are no synthetic tile planes; the camera just
 * looks down at the real world from `IMPOSTERS_CAMERA_ALT`.
 *
 * The camera rotates with the player's yaw so the minimap follows the
 * heading. It uses the default world layer (0) so it picks up whatever
 * the user actually has loaded around them.
 */

import {
  CameraLayer,
  engine,
  type Entity,
  TextureCamera,
  Transform
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'

// Default world layer. Everything the player normally sees lives here,
// so the TextureCamera renders the real scene from above.
const IMPOSTERS_LAYER = 0

// Altitude above the player. High enough to clear typical scene
// geometry without making the orthographic range matter.
const IMPOSTERS_CAMERA_ALT = 201

// Same angle as the satellite/old impostor camera — 89.9 avoids a
// degenerate basis from looking exactly straight down.
const IMPOSTERS_CAMERA_X_ANGLE = 89.9

// World meters visible across the rendered texture. Matches the
// other modes so toggling between them keeps the same scale.
const IMPOSTERS_VISIBLE_METERS = 256

// Output RT size. 512 matches the satellite mode.
const IMPOSTERS_RT_SIZE = 512

let cameraEntity: Entity = engine.RootEntity

/** Lazy-spawn (and cache) the imposters TextureCamera entity. */
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

/**
 * Move the imposters camera to follow the player and rotate to match
 * the world camera yaw. Call once per frame while imposters mode is
 * active.
 */
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

/** Tear down the camera. Call when leaving imposters mode. */
export function disposeImpostersCamera(): void {
  if (cameraEntity !== engine.RootEntity) {
    engine.removeEntityWithChildren(cameraEntity)
    cameraEntity = engine.RootEntity
  }
}
