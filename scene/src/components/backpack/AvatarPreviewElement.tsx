import type { UiTransformProps } from '@dcl/sdk/react-ecs'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import {
  getContentHeight,
  getContentScaleRatio,
  getContentWidth
} from '../../service/canvas-ratio'
import {
  AvatarShape,
  CameraLayer,
  CameraLayers,
  engine,
  executeTask,
  PrimaryPointerInfo,
  TextureCamera,
  Transform,
  UiScrollResult,
  UiTransform
} from '@dcl/sdk/ecs'
import {
  getCameraPositionPerCategory,
  getCameraZoomPerCategory,
  type OrthographicMode
} from './AvatarPreview'
import { Color4, Quaternion, Vector2 } from '@dcl/sdk/math'
import { type PBAvatarShape } from '@dcl/ecs/dist/components/generated/pb/decentraland/sdk/components/avatar_shape.gen'
import { type Entity } from '@dcl/ecs'

import Icon from '../icon/Icon'
import type { AtlasIcon } from '../../utils/definitions'
import {
  hideMouseCursor,
  showMouseCursor
} from '../../service/custom-cursor-service'
import { memoize } from '../../utils/function-utils'
import {
  WEARABLE_CATEGORY_DEFINITIONS,
  type WearableCategory
} from '../../service/categories'
import { store } from '../../state/store'
import useEffect = ReactEcs.useEffect
import useState = ReactEcs.useState
import { CONTEXT, getFontSize } from '../../service/fontsize-system'

// TODO GltfContainerLoadingState
const CAMERA_SIZE = { WIDTH: 1600, HEIGHT: 1800 }
const state = {
  alivePreviews: 0
}
const ROTATE_ICON: AtlasIcon = {
  atlasName: 'icons',
  spriteName: 'RotateIcn'
}
const ROTATION_FACTOR = -0.5
const AVATAR_PREVIEW_ELEMENT_ID = 'AP'
const getScrollVector = memoize(_getScrollVector)

export function AvatarPreviewElement({
  uiTransform,
  avatarShapeDefinition,
  userId = '',
  allowRotation = false,
  allowZoom = false,
  cameraCategory = WEARABLE_CATEGORY_DEFINITIONS.body_shape
    .id as WearableCategory
}: {
  uiTransform?: UiTransformProps
  avatarShapeDefinition: PBAvatarShape
  userId: string
  allowRotation?: boolean
  allowZoom?: boolean
  cameraCategory?: WearableCategory | null
}): ReactElement | null {
  const [avatarCamera, setAvatarCamera] = useState<Entity | null>(null)
  const [avatarEntity, setAvatarEntity] = useState<Entity | null>(null)
  const [elementId] = useState<string>(
    `${AVATAR_PREVIEW_ELEMENT_ID}-${userId}-${getAliveAvatarPreviews()}`
  )
  const [, setListeningZoom] = useState(false) // when mouse inside
  const [zoomFactor, setZoomFactor] = useState(
    getCameraZoomPerCategory(cameraCategory)
  )

  const [scrollPosition] = useState(
    allowZoom ? getScrollVector(zoomFactor) : undefined
  )

  useEffect(() => {
    if (avatarCamera) {
      const mode: OrthographicMode = TextureCamera.getMutable(avatarCamera)
        ?.mode as OrthographicMode

      mode.orthographic.verticalRange =
        getVerticalRangeFromZoomFactor(zoomFactor)
    }
  }, [zoomFactor])

  useEffect(() => {
    const { avatarEntity, cameraEntity } = createAvatarPreview({
      id: userId,
      avatarShapeDefinition,
      cameraCategory,
      zoomFactor
    })
    setAvatarCamera(cameraEntity)
    setAvatarEntity(avatarEntity)
    state.alivePreviews++

    return () => {
      state.alivePreviews--
      engine.removeEntity(avatarEntity)
      engine.removeEntity(cameraEntity)
    }
  }, [])

  useEffect(() => {
    executeTask(async () => {
      if (!avatarCamera) return
      Transform.getMutable(avatarCamera).position =
        getCameraPositionPerCategory(cameraCategory)
      setZoomFactor(getCameraZoomPerCategory(cameraCategory))
    })
  }, [cameraCategory])

  useEffect(() => {
    if (!avatarEntity) return
    const avatarShapeMutable = AvatarShape.getMutableOrNull(avatarEntity)
    if (!avatarShapeMutable) return
    Object.assign(avatarShapeMutable, avatarShapeDefinition)
  }, [avatarShapeDefinition])

  useEffect(() => {
    if (!avatarCamera) return
    if (!allowZoom) return

    for (const [, scroll, transform] of engine.getEntitiesWith(
      UiScrollResult,
      UiTransform
    )) {
      if (transform.elementId !== elementId) continue
      if (scroll.value === undefined) continue

      setZoomFactor(scroll.value.y)
    }
    return () => {}
  })

  useEffect(() => {
    if (!avatarEntity) return
    if (AvatarShape.getMutableOrNull(avatarEntity) === null) return
    AvatarShape.getMutable(avatarEntity).expressionTriggerId =
      store.getState().backpack.reproducingEmotePreview
  }, [store.getState().backpack.reproducingEmotePreview])

  return (
    <UiEntity
      uiTransform={{
        height: getContentHeight(),
        width: (540 / 1920) * getContentWidth() * 0.85,
        ...uiTransform
      }}
    >
      {avatarCamera && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: {
              left: '-75%'
            },
            width: '250%',
            height: '140%'
          }}
          uiBackground={{
            videoTexture: { videoPlayerEntity: avatarCamera },
            textureMode: 'stretch'
          }}
        >
          <UiEntity
            key="avatar-preview-zoom"
            uiTransform={{
              height: '100%',
              width: '100%',
              elementId,
              ...(allowZoom
                ? {
                    overflow: 'scroll',
                    scrollPosition,
                    scrollVisible: 'hidden'
                  }
                : {})
            }}
            onMouseDown={() => {
              if (!allowRotation) return
              showMouseCursor(ROTATE_ICON)
            }}
            onMouseDragLocked={() => {
              if (!allowRotation) return
              if (!avatarEntity) return
              showMouseCursor(ROTATE_ICON)
              const pointerInfo = PrimaryPointerInfo.get(engine.RootEntity)
              const deltaX: number = pointerInfo?.screenDelta?.x ?? 0
              const qY = Quaternion.fromAngleAxis(deltaX * ROTATION_FACTOR, {
                x: 0,
                y: 1,
                z: 0
              })
              const avatarRotation = Transform.get(avatarEntity).rotation
              const initialQuaternionCopy = Quaternion.create(
                avatarRotation.x,
                avatarRotation.y,
                avatarRotation.z,
                avatarRotation.w
              )
              Transform.getMutable(avatarEntity).rotation = Quaternion.multiply(
                initialQuaternionCopy,
                qY
              )
            }}
            onMouseEnter={() => {
              setListeningZoom(true)
            }}
            onMouseLeave={() => {
              setListeningZoom(false)
            }}
            onMouseUp={() => {
              hideMouseCursor()
            }}
          >
            <UiEntity
              uiTransform={{
                height: 6000 * getContentScaleRatio(),
                width: '100%'
              }}
            ></UiEntity>
          </UiEntity>
        </UiEntity>
      )}
      <AvatarPreviewInstructions
        allowRotation={allowRotation}
        allowZoom={allowZoom}
      />
    </UiEntity>
  )
}

function createAvatarPreview({
  id = '',
  avatarShapeDefinition,
  cameraCategory = null,
  zoomFactor = 0.5
}: {
  id: string
  avatarShapeDefinition: PBAvatarShape
  cameraCategory?: WearableCategory | null
  zoomFactor?: number
}): { avatarEntity: Entity; cameraEntity: Entity } {
  const avatarEntity: Entity = engine.addEntity()
  const cameraEntity: Entity = engine.addEntity()
  const layer = getAliveAvatarPreviews() + 10
  AvatarShape.create(avatarEntity, {
    bodyShape: avatarShapeDefinition.bodyShape,
    emotes: [],
    expressionTriggerId: undefined,
    expressionTriggerTimestamp: undefined,
    eyeColor: avatarShapeDefinition.eyeColor,
    hairColor: avatarShapeDefinition.hairColor,
    id,
    name: undefined,
    skinColor: avatarShapeDefinition.skinColor,
    talking: false,
    wearables: avatarShapeDefinition.wearables ?? [],
    forceRender: avatarShapeDefinition.forceRender ?? [] // TODO review
  })

  CameraLayers.create(avatarEntity, {
    layers: [layer]
  })
  CameraLayer.create(cameraEntity, {
    layer,
    directionalLight: false,
    showAvatars: false,
    showSkybox: false,
    showFog: false,
    ambientBrightnessOverride: 5
  })

  TextureCamera.create(cameraEntity, {
    width: CAMERA_SIZE.WIDTH,
    height: CAMERA_SIZE.HEIGHT,
    layer,
    clearColor: Color4.create(0.4, 0.4, 1.0, 0),
    mode: {
      $case: 'orthographic',
      orthographic: {
        verticalRange: getVerticalRangeFromZoomFactor(zoomFactor)
      }
    },
    volume: 1
  })

  Transform.create(avatarEntity, {
    position: { x: 8, y: 0, z: 8 },
    rotation: Quaternion.fromEulerDegrees(0, 180, 0),
    scale: { x: 2, y: 2, z: 2 }
  })

  Transform.create(cameraEntity, {
    position: getCameraPositionPerCategory(cameraCategory),
    rotation: Quaternion.fromEulerDegrees(4, 0, 0)
  })
  return { avatarEntity, cameraEntity }
}

export function getAliveAvatarPreviews(): number {
  return state.alivePreviews + 1
}

function AvatarPreviewInstructions({
  allowRotation,
  allowZoom
}: {
  allowRotation: boolean
  allowZoom: boolean
}): ReactElement {
  const canvasScaleRatio = getContentScaleRatio()
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  return (
    <UiEntity
      uiTransform={{
        position: { top: '100%', left: '5%' },
        flexDirection: 'column'
      }}
    >
      {allowRotation && (
        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'flex-end'
          }}
        >
          <Icon
            icon={{ atlasName: 'icons', spriteName: 'LeftClick' }}
            iconSize={fontSize}
            uiTransform={{
              alignSelf: 'flex-start',
              justifyContent: 'center',
              position: { top: fontSize / 2 }
            }}
          />
          <UiEntity
            uiText={{
              value: 'Drag avatar to rotate',
              fontSize
            }}
            uiTransform={{
              alignSelf: 'flex-start',
              justifyContent: 'center',
              position: { top: 0 }
            }}
          />
        </UiEntity>
      )}
      {allowZoom && (
        <UiEntity
          uiTransform={{
            flexDirection: 'row',
            justifyContent: 'flex-start'
          }}
        >
          <Icon
            icon={{ atlasName: 'icons', spriteName: 'Scroll' }}
            iconSize={canvasScaleRatio * 26}
            uiTransform={{
              alignSelf: 'flex-start',
              justifyContent: 'center',
              position: { top: canvasScaleRatio * 13 }
            }}
          />
          <UiEntity
            uiText={{
              value: 'Scroll to zoom in/out',
              fontSize
            }}
            uiTransform={{
              alignSelf: 'flex-start',
              justifyContent: 'center',
              position: { top: 0 }
            }}
          />
        </UiEntity>
      )}
    </UiEntity>
  )
}
function _getScrollVector(positionY: number): Vector2 {
  return Vector2.create(0, positionY)
}
function getVerticalRangeFromZoomFactor(zoomFactor: number): number {
  return zoomFactor * 10 + 10 * 0.3
}
