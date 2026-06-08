import ReactEcs, {
  type ReactElement,
  type UiBackgroundProps,
  UiEntity
} from '@dcl/react-ecs'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { engine, PrimaryPointerInfo } from '@dcl/sdk/ecs'
import { noop } from '../../utils/function-utils'
import { Color4 } from '@dcl/sdk/math'

import { getContentScaleRatio } from '../../service/canvas-ratio'
import useState = ReactEcs.useState

type BasicSliderProps = {
  children?: ReactElement
  value: number
  uiTransform: UiTransformProps
  min?: number
  max?: number
  stepSize?: number
  onChange?: (percentage: number) => void
  uiBackground?: UiBackgroundProps
  onRelease?: (value: number) => void
  backgroundBar?: Color4
}
const MOUSE_VELOCITY = 0.1

export function BasicSlider({
  children,
  min = 0,
  max = 1,
  value,
  uiTransform,
  onChange = noop,
  stepSize = 0.1,
  uiBackground = { color: Color4.Black() },
  onRelease = noop,
  backgroundBar
}: BasicSliderProps): ReactElement {
  // Calculate percentage correctly for both positive and negative ranges
  const percentage = Math.min(
    100,
    Math.max(0, ((value - min) / (max - min)) * 100)
  )
  // Sub-step drag accumulator: `percentage` above is derived from the rounded
  // `value` prop, so each drag tick re-snaps to the last step and slow drags
  // whose per-frame delta stays inside one step never advance. Carry the
  // un-snapped percentage across frames here, reset on drag end.
  const [drag] = useState<{ rawPercent: number | null }>({ rawPercent: null })
  return (
    <UiEntity uiTransform={uiTransform}>
      {children}
      {/* Background bar - only render if backgroundBar prop is provided */}
      {backgroundBar && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            width: '100%',
            height: '70%',
            alignSelf: 'center'
          }}
        >
          {/* Filled portion (left) */}
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { left: '0%' },
              width: `${percentage}%`,
              height: '100%',
              borderRadius: getContentScaleRatio() * 20
            }}
            uiBackground={{
              color: backgroundBar
            }}
          />
          {/* Unfilled portion (right) */}
          <UiEntity
            uiTransform={{
              positionType: 'absolute',
              position: { left: `${percentage}%` },
              width: `${100 - percentage}%`,
              height: '100%',
              borderRadius: getContentScaleRatio() * 20
            }}
            uiBackground={{
              color: Color4.create(0.5, 0.5, 0.5, 0.5) // Light grey with some transparency
            }}
          />
        </UiEntity>
      )}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%'
        }}
        uiBackground={{
          ...uiBackground
        }}
        onMouseDragLocked={() => {
          const pointerInfo = PrimaryPointerInfo.get(engine.RootEntity)
          const deltaX: number = pointerInfo?.screenDelta?.x ?? 0
          const basePercent = drag.rawPercent ?? percentage
          const newPercentage = Math.min(
            100,
            Math.max(0, basePercent + deltaX * MOUSE_VELOCITY)
          )
          drag.rawPercent = newPercentage
          const total = max - min
          let newValue = min + (newPercentage / 100) * total

          // Apply step size and round to nearest step
          if (stepSize > 0) {
            newValue = Math.round(newValue / stepSize) * stepSize

            // Determine decimal places based on stepSize
            const stepString = stepSize.toString()
            const decimalIndex = stepString.indexOf('.')

            if (decimalIndex === -1) {
              // stepSize is an integer, no decimals
              newValue = Math.floor(newValue)
            } else {
              // Count decimals in stepSize and round to that precision
              const decimalPlaces = stepString.length - decimalIndex - 1
              newValue =
                Math.floor(newValue * Math.pow(10, decimalPlaces)) /
                Math.pow(10, decimalPlaces)
            }
          }

          onChange(newValue)
        }}
        onMouseDragEnd={() => {
          drag.rawPercent = null
          onRelease(value)
        }}
      >
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { left: `${percentage}%` },
            margin: { top: '-1%', left: '-2.5%' },
            height: '120%',
            width: '5%'
          }}
          uiBackground={{
            textureMode: 'stretch',
            texture: { src: 'assets/images/menu/slider.png' }
          }}
        />
      </UiEntity>
    </UiEntity>
  )
}
