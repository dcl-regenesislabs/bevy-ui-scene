import {
  type DeepReadonlyObject,
  engine,
  type Entity,
  executeTask,
  InputAction,
  InputModifier,
  inputSystem,
  MainCamera,
  type PBMainCamera,
  PrimaryPointerInfo,
  Transform,
  VirtualCamera
} from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { updateHudStateAction } from '../../state/hud/actions'
import { store } from '../../state/store'
import { sleep } from '../../utils/dcl-utils'
import { getUiController } from '../../controllers/ui.controller'
import {
  listenSystemAction,
  unlistenSystemAction
} from '../system-actions-emitter'
import { createMoveTween } from '../tween'

type MapCameraState = {
  initialized: boolean
  defaultMainCamera: DeepReadonlyObject<PBMainCamera> | null
  dragActive: boolean
  targetPosition: Vector3.MutableVector3
  targetCameraDistance: number
  orbitYaw: number
  orbitPitch: number
  zoomLastTime: number
}

const OFFSET_MAP_CAMERA = 300
export const ISO_OFFSET = [
  OFFSET_MAP_CAMERA,
  OFFSET_MAP_CAMERA * (8 / 6),
  -OFFSET_MAP_CAMERA
].map((i) => i * 2)

export const PLAN_OFFSET = [0, OFFSET_MAP_CAMERA * (8 / 6), 0].map((i) => i * 2)
export const PLAN_OFFSET_3 = Vector3.create(...PLAN_OFFSET)
export const ISO_OFFSET_3 = Vector3.create(...ISO_OFFSET)

const state: MapCameraState = {
  dragActive: false, // TODO move to store, review different with MovingMap
  initialized: false,
  defaultMainCamera: null,
  targetPosition: Vector3.Zero(),
  targetCameraDistance: Vector3.length(ISO_OFFSET_3),
  orbitYaw: Math.atan2(ISO_OFFSET_3.z, ISO_OFFSET_3.x),
  orbitPitch: Math.asin(ISO_OFFSET_3.y / Vector3.length(ISO_OFFSET_3)),
  zoomLastTime: 0
}

let mapCamera: Entity
let isKeyboardMoving = false

export const getBigMapCameraEntity = (): Entity => mapCamera

export const closeBigMapIfActive = (): void => {
  if (store.getState().hud.mapModeActive) {
    deactivateMapCamera()
  }
}
const TRANSITION_MS = 2000
const ZOOM_DELAY_HANDLER = 200
function zoomInHandler(): void {
  state.zoomLastTime = Date.now()
  const zoomFactor = 0.8
  const minDistance = 200
  const newDistance = state.targetCameraDistance * zoomFactor
  if (newDistance > minDistance) {
    state.targetCameraDistance = newDistance
  }
  executeTask(async () => {
    await sleep(ZOOM_DELAY_HANDLER + 50)
    if (Date.now() - state.zoomLastTime > ZOOM_DELAY_HANDLER) {
      state.zoomLastTime = 0
    }
  })
}

function zoomOutHandler(): void {
  state.zoomLastTime = Date.now()
  const zoomFactor = 1.25
  const maxDistance = 3000
  const newDistance = state.targetCameraDistance * zoomFactor
  if (newDistance < maxDistance) {
    state.targetCameraDistance = newDistance
  }
  executeTask(async () => {
    await sleep(ZOOM_DELAY_HANDLER + 50)
    if (Date.now() - state.zoomLastTime > ZOOM_DELAY_HANDLER) {
      state.zoomLastTime = 0
    }
  })
}
export const isMapDoingZoom: () => boolean = () => !!state.zoomLastTime
export const activateMapCamera = (): void => {
  mapCamera = mapCamera ?? engine.addEntity()

  engine.addSystem(mapInputHandlingSystem)
  engine.addSystem(cameraPositionSystem, 1_000_001)
  engine.addSystem(mapCameraMouseSystem, 1_000_001)
  listenSystemAction('CameraZoomIn', zoomInHandler)
  listenSystemAction('CameraZoomOut', zoomOutHandler)

  state.targetPosition = Vector3.clone(
    Transform.get(engine.PlayerEntity).position
  )
  state.defaultMainCamera = MainCamera.getOrNull(engine.CameraEntity)
  Transform.createOrReplace(mapCamera, {
    position: Vector3.add(
      Transform.get(engine.PlayerEntity).position,
      ISO_OFFSET_3
    )
  })

  if (store.getState().hud.bigMapStyle === '3d') {
    activate3DCameraTransition()
  }

  InputModifier.createOrReplace(engine.PlayerEntity, {
    mode: InputModifier.Mode.Standard({
      disableAll: true
    })
  })
  store.dispatch(
    updateHudStateAction({
      mapModeActive: true
    })
  )
}

export const activate3DCameraTransition = (): void => {
  store.dispatch(
    updateHudStateAction({
      transitioningToMap: true
    })
  )
  VirtualCamera.createOrReplace(mapCamera, {
    lookAtEntity: engine.PlayerEntity,
    defaultTransition: {
      transitionMode: {
        $case: 'time',
        time: TRANSITION_MS / 1_000
      }
    }
  })

  executeTask(async () => {
    await sleep(TRANSITION_MS)
    VirtualCamera.getMutable(mapCamera).lookAtEntity = undefined
    Transform.getMutable(mapCamera).rotation = Quaternion.fromLookAt(
      Transform.getMutable(mapCamera).position,
      Transform.get(engine.PlayerEntity).position
    )
    store.dispatch(
      updateHudStateAction({
        transitioningToMap: false
      })
    )
  })
  MainCamera.createOrReplace(engine.CameraEntity, {
    virtualCameraEntity: mapCamera
  })
  VirtualCamera.getMutable(mapCamera).lookAtEntity = engine.PlayerEntity
}

export const deactivate3DCameraTransition = (): void => {
  const current = MainCamera.getOrNull(engine.CameraEntity)
  if (current?.virtualCameraEntity !== mapCamera) return
  MainCamera.createOrReplace(engine.CameraEntity, {})
}

export const orbitToBird = (): void => {
  store.dispatch(
    updateHudStateAction({
      mapCameraIsOrbiting: true,
      movingMap: true
    })
  )
  const DISPLACE_TIME = 500 // TODO review to calculate time by displacement

  const targetPitch = Math.asin(ISO_OFFSET_3.y / Vector3.length(ISO_OFFSET_3))
  const targetYaw = Math.atan2(ISO_OFFSET_3.z, ISO_OFFSET_3.x)
  const targetDistance = Vector3.length(ISO_OFFSET_3)
  const startPitch = state.orbitPitch
  const startYaw = state.orbitYaw
  const startDistance = state.targetCameraDistance

  executeTask(async () => {
    const startTime = Date.now()
    const lerp = (a: number, b: number, u: number): number => a + (b - a) * u
    const angleLerp = (a: number, b: number, u: number): number => {
      const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a))
      return a + diff * u
    }
    while (true) {
      const t = Math.min(1, (Date.now() - startTime) / DISPLACE_TIME)
      const te = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

      state.orbitPitch = lerp(startPitch, targetPitch, te)
      state.orbitYaw = angleLerp(startYaw, targetYaw, te)
      state.targetCameraDistance = lerp(startDistance, targetDistance, te)

      if (t >= 1) break
      await sleep(16)
    }
    await sleep(16)
    store.dispatch(
      updateHudStateAction({
        mapCameraIsOrbiting: false,
        movingMap: false
      })
    )
  })
}

export const orbitToTop = (): void => {
  store.dispatch(
    updateHudStateAction({
      mapCameraIsOrbiting: true,
      movingMap: true
    })
  )
  const DISPLACE_TIME = 500 // TODO review to calculate time by displacement
  // Aim for a top-down pitch (just shy of 90º to avoid singularities)
  const MAX_PITCH = Math.PI / 2 - 0.001
  const MIN_PITCH = 0.05
  const targetPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, MAX_PITCH))

  // Force a heading where world +Z ("north") is at the top of the screen in plan view
  const targetYaw = -Math.PI / 2

  const startPitch = state.orbitPitch
  const startYaw = state.orbitYaw

  // Smoothly interpolate pitch and yaw over the duration (do not change distance)
  executeTask(async () => {
    const startTime = Date.now()
    const lerp = (a: number, b: number, u: number): number => a + (b - a) * u
    const angleLerp = (a: number, b: number, u: number): number => {
      // shortest path interpolation handling wrap-around
      const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a))
      return a + diff * u
    }
    while (true) {
      const t = Math.min(1, (Date.now() - startTime) / DISPLACE_TIME)
      // ease in-out
      const te = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

      state.orbitPitch = Math.max(
        MIN_PITCH,
        Math.min(MAX_PITCH, lerp(startPitch, targetPitch, te))
      )
      state.orbitYaw = angleLerp(startYaw, targetYaw, te)

      if (t >= 1) break
      await sleep(16)
    }
    await sleep(16)
    store.dispatch(
      updateHudStateAction({
        mapCameraIsOrbiting: false,
        movingMap: false
      })
    )
  })
}

export const displaceCamera = (targetPosition: Vector3): void => {
  const DISPLACE_TIME = 500 // TODO review to calculate time by displacement
  if (!store.getState().hud.movingMap) {
    store.dispatch(
      updateHudStateAction({
        movingMap: true
      })
    )
  }
  const tween = createMoveTween(
    Vector3.clone(state.targetPosition),
    targetPosition,
    DISPLACE_TIME / 1000,
    state.targetPosition
  )

  tween.onComplete(() => {
    store.dispatch(
      updateHudStateAction({
        movingMap: false
      })
    )
    state.targetPosition = Vector3.clone(targetPosition)
  })
}

export const deactivateMapCamera = (): void => {
  // TODO REVIEW IF THIS IS REMOVED AND ADDED AGAIN
  console.log('REMOVE_SYSTEM_MAP_CAMERA')
  engine.removeSystem(mapInputHandlingSystem)
  engine.removeSystem(cameraPositionSystem)
  engine.removeSystem(mapCameraMouseSystem)

  store.dispatch(
    updateHudStateAction({
      mapModeActive: false
    })
  )
  deactivate3DCameraTransition()
  InputModifier.createOrReplace(engine.PlayerEntity, {
    mode: InputModifier.Mode.Standard({
      disableAll: false
    })
  })
  deactivateDragMapSystem()
  getUiController().sceneCard.hide()
  unlistenSystemAction('CameraZoomIn', zoomInHandler)
  unlistenSystemAction('CameraZoomOut', zoomOutHandler)
}

export const activateDragMapSystem = (): boolean => (state.dragActive = true)
export const deactivateDragMapSystem = (): void => {
  state.dragActive = false
}

function mapCameraMouseSystem(dt: number): void {
  if (store.getState().hud.bigMapStyle === '2d') return
  // TODO move to a different file
  const isOrbiting = inputSystem.isPressed(InputAction.IA_WALK)
  if (isOrbiting !== store.getState().hud.mapCameraIsOrbiting) {
    store.dispatch(
      updateHudStateAction({
        mapCameraIsOrbiting: isOrbiting
      })
    )
  }
  if (store.getState().hud.transitioningToMap) return

  if (state.dragActive || isOrbiting) {
    const pointerInfo = PrimaryPointerInfo.get(engine.RootEntity)
    if (!pointerInfo?.screenDelta?.x && !pointerInfo?.screenDelta?.y) return
    const bigMapCameraEntity = getBigMapCameraEntity()
    const mapCameraTransform = Transform.get(bigMapCameraEntity)

    if (isOrbiting) {
      const deltaX = pointerInfo.screenDelta.x ?? 0
      const deltaY = pointerInfo.screenDelta.y ?? 0
      const yawSensitivity = 0.005
      const pitchSensitivity = 0.004
      state.orbitYaw -= deltaX * yawSensitivity
      const MIN_PITCH = 0.05
      const MAX_PITCH = Math.PI / 2 - 0.1
      state.orbitPitch = Math.max(
        MIN_PITCH,
        Math.min(MAX_PITCH, state.orbitPitch + deltaY * pitchSensitivity)
      )
    } else {
      const forward = Vector3.rotate(
        Vector3.Forward(),
        mapCameraTransform.rotation
      )
      const right = Vector3.rotate(Vector3.Right(), mapCameraTransform.rotation)
      const forwardXZ = Vector3.normalize(
        Vector3.create(forward.x, 0, forward.z)
      )
      const rightXZ = Vector3.normalize(Vector3.create(right.x, 0, right.z))
      const deltaX = -(pointerInfo.screenDelta.x ?? 0)
      const deltaY = pointerInfo.screenDelta.y ?? 0
      const movementScale = 2
      const horizontalMovement = Vector3.scale(rightXZ, deltaX * movementScale)
      const verticalMovement = Vector3.scale(forwardXZ, deltaY * movementScale)
      const totalMovement = Vector3.add(horizontalMovement, verticalMovement)

      state.targetPosition = Vector3.add(state.targetPosition, totalMovement)
    }
  }
}

export const cameraPositionSystem = (dt: number): void => {
  const bigMapCameraEntity = getBigMapCameraEntity()
  const mutableMapCameraTransform = Transform.getMutable(bigMapCameraEntity)

  // Compute offset from spherical coordinates (distance + yaw/pitch)
  const cosPitch = Math.cos(state.orbitPitch)
  const sinPitch = Math.sin(state.orbitPitch)
  const offsetX =
    state.targetCameraDistance * cosPitch * Math.cos(state.orbitYaw)
  const offsetY = state.targetCameraDistance * sinPitch
  const offsetZ =
    state.targetCameraDistance * cosPitch * Math.sin(state.orbitYaw)
  const offset = Vector3.create(offsetX, offsetY, offsetZ)

  const targetCameraPosition = Vector3.add(state.targetPosition, offset)

  // Set camera position based on target position and computed offset
  mutableMapCameraTransform.position = targetCameraPosition

  // Only set camera rotation if not transitioning (let tweens handle rotation during transitions)
  if (!store.getState().hud.transitioningToMap) {
    // Always keep world up to avoid roll/bank (Google Maps style)
    const up = Vector3.create(0, 1, 0)
    mutableMapCameraTransform.rotation = Quaternion.fromLookAt(
      targetCameraPosition,
      state.targetPosition,
      up
    )
  }
}

function mapInputHandlingSystem(dt: number): void {
  if (store.getState().hud.bigMapStyle === '2d') return
  const bigMapCameraEntity = getBigMapCameraEntity()
  const cameraTransform = Transform.get(bigMapCameraEntity)
  const moveSpeed = dt * 600

  // Calculate movement directions based on camera rotation
  const forward = Vector3.rotate(Vector3.Forward(), cameraTransform.rotation)
  const right = Vector3.rotate(Vector3.Right(), cameraTransform.rotation)

  // Project vectors onto XZ plane (ignore Y component for map movement)
  const forwardXZ = Vector3.normalize(Vector3.create(forward.x, 0, forward.z))
  const rightXZ = Vector3.normalize(Vector3.create(right.x, 0, right.z))

  let movement = Vector3.Zero()
  let hasInput = false

  if (inputSystem.isPressed(InputAction.IA_WALK)) {
    state.dragActive = false
    // Orbit mode: rotate camera around target using WASD
    const yawSpeed = dt * 1.8 // radians per second
    const pitchSpeed = dt * 1.2
    const MIN_PITCH = 0.05
    const MAX_PITCH = Math.PI / 2 - 0.1

    if (inputSystem.isPressed(InputAction.IA_RIGHT)) {
      state.orbitYaw -= yawSpeed
      hasInput = true
    }
    if (inputSystem.isPressed(InputAction.IA_LEFT)) {
      state.orbitYaw += yawSpeed
      hasInput = true
    }
    if (inputSystem.isPressed(InputAction.IA_FORWARD)) {
      state.orbitPitch = Math.min(MAX_PITCH, state.orbitPitch + pitchSpeed)
      hasInput = true
    }
    if (inputSystem.isPressed(InputAction.IA_BACKWARD)) {
      state.orbitPitch = Math.max(MIN_PITCH, state.orbitPitch - pitchSpeed)
      hasInput = true
    }
  } else {
    // Pan mode: move target point using WASD relative to camera rotation
    if (inputSystem.isPressed(InputAction.IA_FORWARD)) {
      movement = Vector3.add(movement, Vector3.scale(forwardXZ, moveSpeed))
      hasInput = true
    }
    if (inputSystem.isPressed(InputAction.IA_BACKWARD)) {
      movement = Vector3.subtract(movement, Vector3.scale(forwardXZ, moveSpeed))
      hasInput = true
    }
    if (inputSystem.isPressed(InputAction.IA_RIGHT)) {
      movement = Vector3.add(movement, Vector3.scale(rightXZ, moveSpeed))
      hasInput = true
    }
    if (inputSystem.isPressed(InputAction.IA_LEFT)) {
      movement = Vector3.subtract(movement, Vector3.scale(rightXZ, moveSpeed))
      hasInput = true
    }
  }

  // Update movement state and store
  if (hasInput && !isKeyboardMoving) {
    isKeyboardMoving = true
    if (!store.getState().hud.movingMap) {
      store.dispatch(
        updateHudStateAction({
          movingMap: true
        })
      )
    }
  } else if (!hasInput && isKeyboardMoving) {
    isKeyboardMoving = false
    if (store.getState().hud.movingMap) {
      store.dispatch(
        updateHudStateAction({
          movingMap: false
        })
      )
    }
  }

  if (!Vector3.equals(movement, Vector3.Zero())) {
    state.targetPosition = Vector3.add(state.targetPosition, movement)
  }
}
