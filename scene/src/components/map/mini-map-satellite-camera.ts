/**
 * Satellite minimap render pipeline.
 *
 * React ECS UI doesn't allow rotating quads, so a multi-tile satellite
 * minimap that rotates with the camera is impossible to do in pure 2D
 * without artifacts. The trick is to render the tile planes in 3D
 * space, place a `TextureCamera` above them rotated to match the
 * player's camera yaw, and feed its rendered texture into the
 * UI as `videoTexture`.
 *
 * The 3D scene used here lives on an **isolated camera layer**
 * (`SATELLITE_LAYER`) so it doesn't interact with the rest of the world
 * (avatars, skybox, scene geometry). Only our textured planes render.
 *
 * Tile-plane lifecycle: each frame we compute which satellite chunks
 * the rotated viewport actually overlaps (1–4 in practice) and spawn
 * their planes if missing. A bounded LRU (`MAX_TILE_ENTITIES`) keeps
 * recently-shown chunks around for a few frames so crossing a tile
 * boundary back-and-forth doesn't flicker. Tiles outside the 8×8
 * genesis-city grid are skipped (the camera's `clearColor` paints
 * those gaps black).
 */

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

// Dedicated ECS camera layer for satellite tiles. Anything spawned with
// `CameraLayers.create(entity, { layers: [SATELLITE_LAYER] })` is only
// visible to this TextureCamera, and the camera ignores world geometry,
// avatars, skybox, fog, etc.
//
// IMPORTANT: bevy-explorer's `LAYERS_PER_SCENE = 15`, so the layer
// number passed here must be in `[1, 15]`. Higher values are clamped
// (silently) which can leave entities on a different layer than the
// camera renders → black output. We use 11 to stay clear of the
// impostor minimap's historic layer 10 and the avatar-preview ones
// (>=11, growing per preview).
const SATELLITE_LAYER = 11

// Altitude of the camera above the tile planes. The planes sit at y=0
// and the camera looks straight down from `SATELLITE_CAMERA_ALT`. The
// orthographic projection means this number doesn't affect the apparent
// scale — only the visible vertical range does.
const SATELLITE_CAMERA_ALT = 200

// Matches the angle used by the old (impostor) minimap: 89.9 instead of
// 90 to avoid a degenerate camera basis.
const SATELLITE_CAMERA_X_ANGLE = 89.9

// Diameter of world (in meters) that fits across the rendered texture.
// Must match the equivalent VISIBLE_METERS used by parcel mode.
const SATELLITE_VISIBLE_METERS = 256

// Radius needed to cover the rotated viewport (corner of the visible
// square = sqrt(2) * radius). Used to compute which satellite chunks
// actually overlap the viewport.
const VIEWPORT_RADIUS_METERS = (SATELLITE_VISIBLE_METERS / 2) * Math.SQRT2

// Size of the rendered RT texture in pixels. Larger = sharper but more
// GPU cost. 512 looks crisp at the default minimap size.
const SATELLITE_RT_SIZE = 512

// Hard cap on simultaneously-alive plane entities. Worst-case visible
// count is 4 (player at chunk corner). Extras act as a small LRU
// cache so quick back-and-forth across boundaries doesn't flicker.
const MAX_TILE_ENTITIES = 8

let cameraEntity: Entity = engine.RootEntity
let frameCounter = 0

type CachedTile = { entity: Entity; lastUsedFrame: number }
const tileEntities = new Map<string, CachedTile>()

function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`
}

/**
 * Indices of every satellite chunk whose world rectangle overlaps the
 * (axis-aligned bounding box of the) rotating viewport around the
 * player. Returns 1–4 chunks: 1 when the player is well inside a chunk,
 * 4 when at an extreme corner.
 */
function chunksOverlappingViewport(
  playerWorldX: number,
  playerWorldZ: number
): Array<{ cx: number; cy: number }> {
  // Satellite tile (0,0) is centered at parcel (-133, 132) with
  // tile-y inverted (j=0 north). Convert to world bounds:
  // tile (cx, cy) covers world X in [(-133 + cx*40 - 20)*16, ...] and
  // world Z in [(132 - cy*40 - 20)*16, ...].
  // The cx mapping: cx = floor((worldX/16 + 153) / 40).
  const minX = playerWorldX - VIEWPORT_RADIUS_METERS
  const maxX = playerWorldX + VIEWPORT_RADIUS_METERS
  const minZ = playerWorldZ - VIEWPORT_RADIUS_METERS
  const maxZ = playerWorldZ + VIEWPORT_RADIUS_METERS

  const cxLow = Math.floor((minX / PARCEL_METERS + 153) / 40)
  const cxHigh = Math.floor((maxX / PARCEL_METERS + 153) / 40)
  // Y is flipped: high parcel.y = j=0, low parcel.y = j=7. The viewport
  // top (north, max worldZ) maps to the LOWEST cy, and viewport bottom
  // (south) to the HIGHEST cy.
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

/** Lazy-spawn (and cached) of the TextureCamera entity. */
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
      // Black outside the tile coverage area (e.g. when the player is
      // close to the edge of Genesis City or in a world without
      // satellite imagery).
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

/**
 * Move the satellite camera to follow the player and rotate to match
 * the world camera yaw. Call once per frame while satellite mode is
 * active.
 */
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

/**
 * Spawn / refresh / evict satellite tile planes so the rotating viewport
 * around the player is always covered. Only the chunks that actually
 * intersect the viewport are spawned (1–4 typically); a small LRU
 * cache (`MAX_TILE_ENTITIES`) keeps recently-shown chunks around so
 * crossing a boundary back-and-forth doesn't flicker.
 *
 * Tiles outside the genesis-city 8×8 grid are skipped — the camera's
 * clearColor renders black there.
 */
export function updateSatelliteTiles(
  playerWorldX: number,
  playerWorldZ: number
): void {
  frameCounter++

  // Mark currently-needed chunks as in-use this frame, spawn missing
  // entities.
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
    // CameraLayers must propagate BEFORE the mesh is renderable —
    // otherwise the plane is briefly visible in the default world layer
    // (the player sees a satellite tile floating in front of them for
    // one frame on mode switch). We add CameraLayers first, then defer
    // the MeshRenderer + Material by one frame so the layer is already
    // in place by the time the renderer kicks in.
    CameraLayers.create(entity, { layers: [SATELLITE_LAYER] })
    tileEntities.set(key, { entity, lastUsedFrame: frameCounter })
    executeTask(async () => {
      await sleep(1)
      // Guard: tile may have been evicted in the meantime (player moved
      // far before the frame finished). Skip rather than resurrect.
      if (!tileEntities.has(key)) return
      MeshRenderer.setPlane(entity)
      // Unlit material: ignores scene lighting; the satellite JPG IS the
      // final colour we want on screen.
      Material.setBasicMaterial(entity, {
        texture: Material.Texture.Common({ src: info.url })
      })
    })
  }

  // LRU eviction: if we're over the cap, drop the oldest non-needed
  // tile until we fit. Needed tiles are never evicted (they were just
  // touched above).
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
    if (oldestKey === null) break // shouldn't happen unless needed > MAX
    const t = tileEntities.get(oldestKey)
    if (t) engine.removeEntityWithChildren(t.entity)
    tileEntities.delete(oldestKey)
  }
}

/** Tear down the camera + all tile planes. Call when the minimap is
 *  unmounted or when leaving satellite mode for a while. */
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
