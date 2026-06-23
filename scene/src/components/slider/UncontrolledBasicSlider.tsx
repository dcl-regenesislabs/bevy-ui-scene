import ReactEcs, {
  type ReactElement,
  type UiBackgroundProps,
  UiEntity
} from '@dcl/react-ecs'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { noop } from '../../utils/function-utils'
import { Color4 } from '@dcl/sdk/math'
import { BasicSlider } from './slider-component'
import ButtonIcon from '../button-icon/ButtonIcon'
import useState = ReactEcs.useState
import { roundToStep } from './slider-utils'

type UncontrolledBasicSliderProps = {
  children?: ReactElement
  defaultValue?: number
  uiTransform: UiTransformProps
  min?: number
  max?: number
  stepSize?: number
  onChange?: (value: number) => void
  uiBackground?: UiBackgroundProps
  onRelease?: (value: number) => void
  showStepButtons?: boolean
  backgroundBar?: Color4
}

export function UncontrolledBasicSlider({
  children,
  min = 0,
  max = 1,
  defaultValue = min,
  uiTransform,
  onChange = noop,
  stepSize = 0.1,
  uiBackground = { color: Color4.Black() },
  onRelease = noop,
  showStepButtons = false,
  backgroundBar
}: UncontrolledBasicSliderProps): ReactElement {
  const [value, setValue] = useState<number>(defaultValue)

  // Helper function to round value based on stepSize precision

  const handleValueChange = (newValue: number): void => {
    const roundedValue = roundToStep(newValue, stepSize)
    setValue(roundedValue)
    onChange(roundedValue)
  }

  const handleDecrement = (): void => {
    const newValue = roundToStep(Math.max(min, value - stepSize), stepSize)
    setValue(newValue)
    onChange(newValue)
    onRelease(newValue)
  }

  const handleIncrement = (): void => {
    const newValue = roundToStep(Math.min(max, value + stepSize), stepSize)
    setValue(newValue)
    onChange(newValue)
    onRelease(newValue)
  }

  const slider = (
    <BasicSlider
      value={value}
      min={min}
      max={max}
      stepSize={stepSize}
      uiTransform={
        showStepButtons
          ? {
              ...uiTransform,
              width: '80%',
              height: '90%',
              margin: { left: '-5%' },
              flexShrink: 0,
              flexGrow: 0
            }
          : uiTransform
      }
      uiBackground={uiBackground}
      onChange={handleValueChange}
      onRelease={onRelease}
      backgroundBar={backgroundBar}
    >
      {children}
    </BasicSlider>
  )

  if (!showStepButtons) {
    return slider
  }

  return (
    <UiEntity
      uiTransform={{
        ...uiTransform,
        width: uiTransform?.width ?? '100%',
        height: uiTransform?.height ?? '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        positionType: 'relative'
      }}
    >
      <ButtonIcon
        icon={{ atlasName: 'icons', spriteName: 'LeftArrow' }}
        onMouseDown={handleDecrement}
        uiTransform={{
          width: '6%',
          height: '80%',

          flexShrink: 0,
          flexGrow: 0,
          position: { left: '1%' }
        }}
        iconColor={Color4.White()}
      />
      {slider}
      <ButtonIcon
        icon={{ atlasName: 'icons', spriteName: 'RightArrow' }}
        onMouseDown={handleIncrement}
        uiTransform={{
          width: '6%',
          height: '80%',
          flexShrink: 0,
          flexGrow: 0,
          position: { left: '-6%' }
        }}
        iconColor={Color4.White()}
      />
    </UiEntity>
  )
}
