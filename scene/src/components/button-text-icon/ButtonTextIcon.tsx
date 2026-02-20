import { Color4 } from '@dcl/sdk/math'
import ReactEcs, {
  type Callback,
  type PositionUnit,
  UiEntity,
  type UiTransformProps
} from '@dcl/sdk/react-ecs'
import { type AtlasIcon } from '../../utils/definitions'
import Icon from '../icon/Icon'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../service/fontsize-system'
import { COLOR } from '../color-palette'

function ButtonTextIcon(props: {
  // Events
  key?: string
  onMouseEnter?: Callback
  onMouseLeave?: Callback
  onMouseDown: Callback
  // Shape
  uiTransform?: UiTransformProps
  backgroundColor?: Color4
  // Text
  value: string
  fontSize?: number
  icon: AtlasIcon
  iconSize?: PositionUnit
  fontColor?: Color4
  iconColor?: Color4
  layoutContext?: CONTEXT
}): ReactEcs.JSX.Element | null {
  const layoutContext = props.layoutContext ?? CONTEXT.SIDE
  const fontSize = props.fontSize ?? getFontSize({})
  const borderRadius = getFontSize({
    token: TYPOGRAPHY_TOKENS.BUTTON_ICON_BORDER_RADIUS,
    context: layoutContext
  })
  return (
    <UiEntity
      uiTransform={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderWidth: 0,
        borderColor: COLOR.BLACK_TRANSPARENT,
        borderRadius,
        ...props.uiTransform
      }}
      uiBackground={{
        color: props.backgroundColor ?? COLOR.BLACK_TRANSPARENT
      }}
      onMouseDown={props.onMouseDown}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      {/* ICON */}

      <Icon
        uiTransform={{ flexShrink: 0 }}
        iconSize={props.iconSize ?? fontSize}
        icon={props.icon}
        iconColor={props.iconColor}
      />
      {/* TEXT */}
      <UiEntity
        uiText={{
          value: props.value,
          fontSize,
          color: props.fontColor ?? Color4.White(),
          textWrap: 'nowrap'
        }}
      ></UiEntity>
    </UiEntity>
  )
}

export default ButtonTextIcon
