import {
  engine,
  executeTask,
  Transform,
  UiCanvasInformation
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { rotateVec3ByQuat } from './perspective-to-screen'

// `~system/Runtime` doesn't ship `getCameraFov` in its bundled types; the op is
// added by bevy-explorer (mirroring `getWorldTime`). Augment the module so we
// can import it with proper typing.
declare module '~system/Runtime' {
  export function getCameraFov(): Promise<number>
}

// FOV is pushed via `GlobalCrdtState` whenever it changes and at least every
// two seconds. We cache the latest value here and refresh on a slow timer; the
// op is async, so we can't read it synchronously in the render path. Stale
// readings are bounded by the bevy-side push cadence.
let cachedFovY: number | null = null

async function refreshCameraFov(): Promise<void> {
  try {
    const { getCameraFov } = await import('~system/Runtime')
    const fov = await getCameraFov()
    if (Number.isFinite(fov) && fov > 0) {
      cachedFovY = fov
    }
  } catch (err) {
    console.error('failed to read camera fov', err)
  }
}

let started = false
export function startCameraProjection(): void {
  if (started) return
  started = true
  // Initial fetch + periodic refresh. Bevy already sends every two seconds on
  // its side; this keeps our cache aligned even if a push was missed.
  executeTask(async () => {
    await refreshCameraFov()
  })
  let elapsed = 0
  engine.addSystem((dt: number) => {
    elapsed += dt
    if (elapsed >= 1.5) {
      elapsed = 0
      void refreshCameraFov()
    }
  })
}

export type ScreenProjection =
  | { kind: 'on-screen'; x: number; y: number }
  | { kind: 'edge'; x: number; y: number }

/**
 * Project a world-space point to viewport pixel coords using the cached
 * camera FOV plus the live player camera transform. Returns:
 *
 * - `on-screen` (with x,y inside viewport) when the point is in front of the
 *   camera and within the canvas.
 * - `edge` (with x,y on the viewport rectangle) for points off-viewport or
 *   behind the camera — picked by intersecting the camera-space xy direction
 *   with the canvas rect, so callers can pin a "pointer over there" indicator.
 *
 * Returns `null` until the FOV cache has been populated (very first frames).
 */
export function projectWorldToScreen(world: Vector3): ScreenProjection | null {
  if (cachedFovY === null) return null
  const camT = Transform.getOrNull(engine.CameraEntity)
  if (camT === null) return null
  const canvas = UiCanvasInformation.getOrNull(engine.RootEntity)
  if (canvas === null || canvas.width <= 0 || canvas.height <= 0) return null

  const camPos = camT.position
  const camRot = camT.rotation as Quaternion

  // World → camera space. DCL convention: camera looks down +Z (forward = +Z).
  const rel = Vector3.create(
    world.x - camPos.x,
    world.y - camPos.y,
    world.z - camPos.z
  )
  const inv = Quaternion.create(-camRot.x, -camRot.y, -camRot.z, camRot.w)
  const cam = rotateVec3ByQuat(rel, inv)

  const halfW = canvas.width * 0.5
  const halfH = canvas.height * 0.5
  const aspect = canvas.width / canvas.height
  const tanHalf = Math.tan(cachedFovY * 0.5)

  if (cam.z > 1e-4) {
    // In front of camera — perspective project.
    const ndcX = cam.x / (cam.z * tanHalf * aspect)
    const ndcY = cam.y / (cam.z * tanHalf)
    const x = (ndcX + 1) * 0.5 * canvas.width
    const y = (1 - (ndcY + 1) * 0.5) * canvas.height
    if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
      return { kind: 'on-screen', x, y }
    }
    // Off-viewport but in front: clamp the perspective projection to the
    // viewport rect rather than shooting off to infinity.
    return {
      kind: 'edge',
      x: Math.min(Math.max(x, 0), canvas.width),
      y: Math.min(Math.max(y, 0), canvas.height)
    }
  }

  // Behind the camera — fall back to direction-only edge projection.
  // Camera-space y is up; viewport y is top-down, so flip y.
  const xy2 = { x: cam.x, y: cam.y }
  const len2 = xy2.x * xy2.x + xy2.y * xy2.y
  if (len2 < 1e-6) {
    return { kind: 'edge', x: halfW, y: halfH }
  }
  const len = Math.sqrt(len2)
  const nx = xy2.x / len
  const ny = xy2.y / len
  const sx = nx !== 0 ? halfW / Math.abs(nx) : Number.POSITIVE_INFINITY
  const sy = ny !== 0 ? halfH / Math.abs(ny) : Number.POSITIVE_INFINITY
  const scale = Math.min(sx, sy)
  return {
    kind: 'edge',
    x: halfW + nx * scale,
    y: halfH - ny * scale
  }
}
