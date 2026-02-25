import { COLOR } from './color-palette'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { getFontSize } from '../service/fontsize-system'
import { Color4 } from '@dcl/sdk/math'
import { noop } from '../utils/function-utils'
import { Callback, UiTransformProps } from '@dcl/sdk/react-ecs'

export const ThinButton = ({
  children,
  fontSize = getFontSize({}),
  backgroundColor = COLOR.BLACK,
  onMouseDown = noop,
  uiTransform = {}
}: {
  children?: ReactElement | ReactElement[]
  fontSize?: number
  backgroundColor?: Color4
  onMouseDown?: Callback
  uiTransform?: UiTransformProps
}): ReactElement => (
  <UiEntity
    uiTransform={{
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      width: fontSize,
      height: fontSize * 2.5,
      borderRadius: fontSize / 2.5,
      borderColor: COLOR.WHITE,
      borderWidth: 0,
      flexShrink: 0,
      flexGrow: 0,
      ...uiTransform
    }}
    uiBackground={{ color: backgroundColor }}
    onMouseDown={onMouseDown}
    onMouseEnter={() => {}}
    onMouseLeave={() => {}}
  >
    {children}
  </UiEntity>
)
