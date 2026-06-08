import {
  type PermissionValue,
  POSSIBLE_PERMISSION_VALUES
} from '../../../../bevy-api/permission-definitions'
import type { UiTransformProps } from '@dcl/sdk/react-ecs'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getContentScaleRatio } from '../../../../service/canvas-ratio'
import { COLOR } from '../../../../components/color-palette'
import Icon from '../../../../components/icon/Icon'
import type { Color4 } from '@dcl/sdk/math'
import useState = ReactEcs.useState
import { noop } from '../../../../utils/function-utils'
import { useDebouncedValue } from '../../../../hooks/use-debounce'
import useEffect = ReactEcs.useEffect
const REQUIRED_POSSIBLE_PERMISSION_VALUES = POSSIBLE_PERMISSION_VALUES.filter(
  (i) => i !== null
)
export function PermissionBox({
  value,
  uiTransform,
  active,
  onChange = noop,
  debounce = 0,
  required = false
}: {
  value: PermissionValue
  uiTransform?: UiTransformProps
  active?: boolean
  onChange?: (value: PermissionValue) => void
  debounce?: number
  required?: boolean
}): ReactElement {
  const [currentValue, setValue] = useState(value)
  const possiblePermissionValues = required
    ? REQUIRED_POSSIBLE_PERMISSION_VALUES
    : POSSIBLE_PERMISSION_VALUES
  const switchValue: () => void = () => {
    const nextValue =
      possiblePermissionValues.indexOf(currentValue) ===
      possiblePermissionValues.length - 1
        ? possiblePermissionValues[0]
        : possiblePermissionValues[
            possiblePermissionValues.indexOf(currentValue) + 1
          ]
    setValue(nextValue)
    if (!debounce) onChange(nextValue)
  }
  const debouncedValue = useDebouncedValue(currentValue)
  const [changedOnce, setchangedOnce] = useState<boolean>(false)

  useEffect(() => {
    if (debounce && (value !== debouncedValue || changedOnce)) {
      onChange(debouncedValue)
      setchangedOnce(true)
    }
  }, [debouncedValue])

  return (
    <UiEntity
      uiTransform={{
        flexGrow: 0,
        flexShrink: 0,
        padding: getContentScaleRatio() * 5,
        borderColor: active
          ? COLOR.ACTIVE_BACKGROUND_COLOR
          : COLOR.BLACK_TRANSPARENT,
        borderRadius: getContentScaleRatio() * 18,
        borderWidth: 1,
        ...uiTransform
      }}
      onMouseDown={switchValue}
    >
      <Icon
        iconSize={getContentScaleRatio() * 48}
        icon={{
          spriteName: 'check-off',
          atlasName: 'backpack'
        }}
      />
      <Icon
        uiTransform={{
          positionType: 'absolute',
          position: {
            left: getContentScaleRatio() * 5,
            top: getContentScaleRatio() * 5
          },
          zIndex: 2
        }}
        iconSize={getContentScaleRatio() * 48}
        icon={{
          spriteName: getSpritePerValue(currentValue),
          atlasName: 'icons'
        }}
        iconColor={getSpriteColorPerValue(currentValue)}
      />
    </UiEntity>
  )

  function getSpritePerValue(value: PermissionValue): string {
    if (value === 'Ask') {
      return 'Support'
    } else if (value === 'Deny') {
      return 'CloseIcon'
    } else if (value === 'Allow') {
      return 'Check'
    }
    return 'LeftArrow'
  }

  function getSpriteColorPerValue(value: PermissionValue): Color4 {
    if (value === 'Ask') {
      return COLOR.ORANGE
    } else if (value === 'Deny') {
      return COLOR.RED
    } else if (value === 'Allow') {
      return COLOR.GREEN
    }
    return COLOR.TEXT_COLOR_GREY
  }
}
