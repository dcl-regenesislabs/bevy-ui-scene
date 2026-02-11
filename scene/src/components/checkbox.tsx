import Icon from './icon/Icon'
import { Label, type UiTransformProps } from '@dcl/sdk/react-ecs'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getContentScaleRatio } from '../service/canvas-ratio'
import useState = ReactEcs.useState
import { getFontSize } from '../service/fontsize-system'
export type CheckboxProps = {
  onChange: (value: boolean) => void
  value: boolean
  label?: string
  uiTransform?: UiTransformProps
  fontSize?: number
}
export const Checkbox = ({
  onChange,
  value,
  label,
  uiTransform,
  fontSize = getFontSize({})
}: CheckboxProps): ReactElement => {
  const [currentValue, setCurrentValue] = useState(value)

  return (
    <UiEntity
      uiTransform={{
        ...uiTransform,
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onMouseDown={() => {
        const newValue = !currentValue
        setCurrentValue(newValue)
        onChange(newValue)
      }}
    >
      <Icon
        iconSize={fontSize}
        icon={{
          spriteName: currentValue ? 'check-on' : 'check-off',
          atlasName: 'backpack'
        }}
      />
      {label && <Label value={label} fontSize={fontSize} />}
    </UiEntity>
  )
}
