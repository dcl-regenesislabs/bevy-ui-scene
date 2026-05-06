import { ReactEcs, type ReactElement, UiEntity } from '@dcl/react-ecs'
import { type SystemProximityEvent } from '../../bevy-api/interface'
import {
  engine,
  executeTask,
  inputSystem,
  PointerEventType,
  UiCanvasInformation
} from '@dcl/sdk/ecs'
import { type Key } from '@dcl/sdk/react-ecs'
import { BevyApi } from '../../bevy-api'
import { COLOR } from '../color-palette'
import { MAX_ZINDEX } from '../../utils/constants'
import { getFontSize } from '../../service/fontsize-system'
import { getSceneInputBindingsMap } from '../../service/input-bindings'
import {
  projectWorldToScreen,
  startCameraProjection
} from '../../service/camera-projection'
import { KeyIcon } from '../hover-actions/hover-action-component'
import { getViewportHeight } from '../../service/canvas-ratio'
import { type PBPointerEvents_Entry } from '@dcl/ecs'
import useEffect = ReactEcs.useEffect
import useState = ReactEcs.useState

// Margin inside the interactable area used to keep tooltip anchors away from
// the area's edges. Tweak here for visual feel.
const TOOLTIP_EDGE_MARGIN = 8

// Subscriber that surfaces the proximity stream as a screen-anchored tooltip
// per in-range entity. Re-projects the entity world position on every render
// so tooltips track camera movement, with a direction-based edge fallback for
// off-viewport / behind-camera entities.
export const ProximityActionComponent = (): ReactElement | null => {
  const [activeEntities, setActiveEntities] = useState<
    Record<string, SystemProximityEvent>
  >({})

  useEffect(() => {
    startCameraProjection()
    executeTask(async () => {
      try {
        const stream = await BevyApi.getProximityStream()
        for await (const ev of stream) {
          setActiveEntities((prev) => {
            const next = { ...prev }
            const key = String(ev.entity)
            if (ev.entered) {
              next[key] = ev
            } else {
              delete next[key]
            }
            return next
          })
        }
      } catch (err) {
        console.error('proximity stream error', err)
      }
    })
  }, [])

  const events = Object.values(activeEntities)
  if (events.length === 0) return null

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: MAX_ZINDEX - 1
      }}
    >
      {events.map((ev) => (
        <ProximityTooltip key={String(ev.entity)} event={ev} />
      ))}
    </UiEntity>
  )
}

// Rough character width used to estimate tooltip width for centering. DCL UI
// has no measurement API, so we approximate; minor under/overshoot is fine.
const APPROX_CHAR_WIDTH_RATIO = 0.55

function ProximityTooltip({
  event
}: {
  event: SystemProximityEvent
  key?: Key
}): ReactElement | null {
  // Match hover-action-component: pre-press, surface PET_DOWN entries (the
  // "press X to do Y" prompts); while the entry's button is held, surface the
  // matching PET_UP entry. Drag events drive the drag mechanics — scene
  // authors get drag tooltips by pairing PetDown + PetDrag (or PetUp +
  // PetDragEnd).
  const actions = event.actions
    .filter((a) => a.eventInfo?.showFeedback !== false)
    .filter((a) => {
      if (
        a.eventInfo?.button !== undefined &&
        inputSystem.isPressed(a.eventInfo?.button)
      ) {
        return a.eventType === PointerEventType.PET_UP
      }
      return a.eventType === PointerEventType.PET_DOWN
    })
  if (actions.length === 0) return null

  const projection = projectWorldToScreen(event.entityPosition)
  if (projection === null) return null

  const fontSize = getFontSize({})
  const inputBindings = getSceneInputBindingsMap()
  // Match hover tooltip styling: padding/border-radius scaled to viewport so
  // tooltips look consistent across resolutions.
  const padding = getViewportHeight() * 0.01
  const borderRadius = getViewportHeight() * 0.01
  const iconSize = fontSize * 2

  // Estimate tooltip dimensions so we can center on the anchor.
  const rowWidth = (a: PBPointerEvents_Entry & { enabled: boolean }): number => {
    const text = a.eventInfo?.hoverText ?? 'Interact'
    const button = a.eventInfo?.button
    const hasIcon = button !== undefined && inputBindings?.[button] !== undefined
    const iconW = hasIcon ? iconSize + fontSize * 0.3 : 0
    return iconW + text.length * fontSize * APPROX_CHAR_WIDTH_RATIO
  }
  const widestRow = Math.max(...actions.map(rowWidth))
  const estimatedWidth = padding * 2 + widestRow
  const rowHeight = Math.max(iconSize, fontSize) + fontSize * 0.1
  const estimatedHeight = padding * 2 + actions.length * rowHeight

  let left = projection.x - estimatedWidth / 2
  let top = projection.y - estimatedHeight / 2

  // Constrain to the system-scene-set interactable area so tooltips don't sit
  // under the HUD or in the unsafe-area edges.
  const canvas = UiCanvasInformation.getOrNull(engine.RootEntity)
  if (canvas?.interactableArea !== undefined && canvas.interactableArea !== null) {
    const ia = canvas.interactableArea
    const minLeft = ia.left + TOOLTIP_EDGE_MARGIN
    const minTop = ia.top + TOOLTIP_EDGE_MARGIN
    const maxLeft = Math.max(
      minLeft,
      canvas.width - ia.right - TOOLTIP_EDGE_MARGIN - estimatedWidth
    )
    const maxTop = Math.max(
      minTop,
      canvas.height - ia.bottom - TOOLTIP_EDGE_MARGIN - estimatedHeight
    )
    left = Math.min(Math.max(left, minLeft), maxLeft)
    top = Math.min(Math.max(top, minTop), maxTop)
  }

  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { left, top },
        padding,
        borderRadius,
        borderWidth: 0,
        borderColor: COLOR.BLACK_TRANSPARENT,
        flexDirection: 'column'
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_7 }}
    >
      {actions.map((action, i) => (
        <ProximityActionRow
          key={i}
          action={action}
          inputBindings={inputBindings}
          fontSize={fontSize}
        />
      ))}
    </UiEntity>
  )
}

function ProximityActionRow({
  action,
  inputBindings,
  fontSize
}: {
  action: PBPointerEvents_Entry & { enabled: boolean }
  inputBindings: ReturnType<typeof getSceneInputBindingsMap>
  fontSize: number
  key?: Key
}): ReactElement {
  const button = action.eventInfo?.button
  const binding =
    button !== undefined && inputBindings?.[button] !== undefined
      ? inputBindings[button]
      : undefined
  const text = action.eventInfo?.hoverText ?? 'Interact'

  return (
    <UiEntity
      uiTransform={{
        flexDirection: 'row',
        alignItems: 'center'
      }}
    >
      {binding !== undefined && <KeyIcon inputBinding={binding} />}
      <UiEntity
        uiTransform={{
          margin: { left: binding !== undefined ? fontSize * 0.3 : 0 }
        }}
        uiText={{
          value: text,
          fontSize,
          textWrap: 'nowrap'
        }}
      />
    </UiEntity>
  )
}
