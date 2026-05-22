import {
  CameraLayer,
  CameraLayers,
  engine,
  type Entity,
  executeTask,
  Material,
  MeshRenderer,
  TextureCamera,
  Transform
} from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'

import { sleep } from '../../utils/dcl-utils'
import { PARCEL_METERS, tileInfoForChunk } from './mini-map-tiles'

const SATELLITE_LAYER = 9

const SATELLITE_CAMERA_ALT = 200

const SATELLITE_CAMERA_X_ANGLE = 89.9

const SATELLITE_VISIBLE_METERS = 256

const VIEWPORT_RADIUS_METERS = (SATELLITE_VISIBLE_METERS / 2) * Math.SQRT2

const SATELLITE_RT_SIZE = 512

const MAX_TILE_ENTITIES = 8

let cameraEntity: Entity = engine.RootEntity
let frameCounter = 0

type CachedTile = { entity: Entity; lastUsedFrame: number }
const tileEntities = new Map<string, CachedTile>()

function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`
}

function chunksOverlappingViewport(
  playerWorldX: number,
  playerWorldZ: number
): Array<{ cx: number; cy: number }> {
  const minX = playerWorldX - VIEWPORT_RADIUS_METERS
  const maxX = playerWorldX + VIEWPORT_RADIUS_METERS
  const minZ = playerWorldZ - VIEWPORT_RADIUS_METERS
  const maxZ = playerWorldZ + VIEWPORT_RADIUS_METERS

  const cxLow = Math.floor((minX / PARCEL_METERS + 153) / 40)
  const cxHigh = Math.floor((maxX / PARCEL_METERS + 153) / 40)
  const cyLow = Math.floor((151 - maxZ / PARCEL_METERS) / 40)
  const cyHigh = Math.floor((151 - minZ / PARCEL_METERS) / 40)

  const out: Array<{ cx: number; cy: number }> = []
  for (let cy = cyLow; cy <= cyHigh; cy++) {
    for (let cx = cxLow; cx <= cxHigh; cx++) {
      out.push({ cx, cy })
    }
  }
  return out
}

export function getSatelliteCamera(): Entity {
  if (cameraEntity === engine.RootEntity) {
    cameraEntity = engine.addEntity()
    Transform.create(cameraEntity, {
      position: Vector3.create(0, SATELLITE_CAMERA_ALT, 0),
      rotation: Quaternion.fromEulerDegrees(SATELLITE_CAMERA_X_ANGLE, 0, 0)
    })
    CameraLayer.create(cameraEntity, {
      layer: SATELLITE_LAYER,
      directionalLight: false,
      showAvatars: false,
      showSkybox: false,
      showFog: false,
      ambientBrightnessOverride: 5,
      ambientColorOverride: Color3.White()
    })
    TextureCamera.create(cameraEntity, {
      width: SATELLITE_RT_SIZE,
      height: SATELLITE_RT_SIZE,
      layer: SATELLITE_LAYER,
      clearColor: Color4.create(0, 0, 0, 1),
      mode: {
        $case: 'orthographic',
        orthographic: { verticalRange: SATELLITE_VISIBLE_METERS }
      },
      volume: 1
    })
  }
  return cameraEntity
}

export function updateSatelliteCamera(
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
    Quaternion.fromEulerDegrees(SATELLITE_CAMERA_X_ANGLE, yawDeg, 0)
  )
}

export function updateSatelliteTiles(
  playerWorldX: number,
  playerWorldZ: number
): void {
  frameCounter++

  const neededKeys = new Set<string>()
  for (const { cx, cy } of chunksOverlappingViewport(
    playerWorldX,
    playerWorldZ
  )) {
    const info = tileInfoForChunk('satellite', cx, cy)
    if (!info) continue
    const key = chunkKey(cx, cy)
    neededKeys.add(key)
    const existing = tileEntities.get(key)
    if (existing) {
      existing.lastUsedFrame = frameCounter
      continue
    }
    const entity = engine.addEntity()
    Transform.create(entity, {
      position: Vector3.create(info.centerWorldX, 0, info.centerWorldZ),
      rotation: Quaternion.fromEulerDegrees(90, 0, 0),
      scale: Vector3.create(info.imageMeters, info.imageMeters, 1)
    })
    CameraLayers.create(entity, { layers: [SATELLITE_LAYER] })
    tileEntities.set(key, { entity, lastUsedFrame: frameCounter })
    executeTask(async () => {
      await sleep(1)
      if (!tileEntities.has(key)) return
      MeshRenderer.setPlane(entity)
      Material.setBasicMaterial(entity, {
        texture: Material.Texture.Common({ src: info.url })
      })
    })
  }

  while (tileEntities.size > MAX_TILE_ENTITIES) {
    let oldestKey: string | null = null
    let oldestFrame = Infinity
    for (const [key, t] of tileEntities) {
      if (neededKeys.has(key)) continue
      if (t.lastUsedFrame < oldestFrame) {
        oldestFrame = t.lastUsedFrame
        oldestKey = key
      }
    }
    if (oldestKey === null) break
    const t = tileEntities.get(oldestKey)
    if (t) engine.removeEntityWithChildren(t.entity)
    tileEntities.delete(oldestKey)
  }
}

export function disposeSatelliteCamera(): void {
  if (cameraEntity !== engine.RootEntity) {
    engine.removeEntityWithChildren(cameraEntity)
    cameraEntity = engine.RootEntity
  }
  for (const { entity } of tileEntities.values()) {
    engine.removeEntityWithChildren(entity)
  }
  tileEntities.clear()
}
