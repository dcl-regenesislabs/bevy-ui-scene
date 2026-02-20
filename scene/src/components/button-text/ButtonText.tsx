import { Color4 } from '@dcl/sdk/math'
import ReactEcs, {
  type Callback,
  UiEntity,
  type UiTransformProps
} from '@dcl/sdk/react-ecs'
import { ROUNDED_TEXTURE_BACKGROUND } from '../../utils/constants'
import { CONTEXT, getFontSize } from '../../service/fontsize-system'

function ButtonText(props: {
  // Events
  onMouseEnter?: Callback
  onMouseLeave?: Callback
  onMouseDown: Callback
  // Shape
  uiTransform?: UiTransformProps
  backgroundColor?: Color4
  // Text
  value: string
  fontSize: number
  fontColor?: Color4
  // Status
  isLoading?: boolean
}): ReactEcs.JSX.Element | null {
  //   const ICON_MARGIN = Math.max(canvasInfo.height * 0.01, 2)
  const { fontSize = getFontSize({ context: CONTEXT.DIALOG }) } = props
  return (
    <UiEntity
      uiTransform={{
        // padding: fontSize * 0.3,
        // margin: fontSize * 0.3,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: 'auto',
        height: 'auto',
        ...props.uiTransform
      }}
      uiBackground={{
        ...ROUNDED_TEXTURE_BACKGROUND,
        color: props.backgroundColor ?? { ...Color4.White(), a: 0 }
      }}
      onMouseDown={props.onMouseDown}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      {/* TEXT */}
      <UiEntity
        uiTransform={{
          width: 'auto',
          height: 'auto'
        }}
        uiText={{
          value: props.value,
          fontSize,
          color: props.fontColor ?? Color4.White()
        }}
      >
        {/* ICON */}
        {props.isLoading && (
          <UiEntity
            uiTransform={{
              width: fontSize,
              height: fontSize,
              positionType: 'absolute',
              position: { top: '25%', left: -1.25 * fontSize }
            }}
            uiBackground={{
              textureMode: 'stretch',
              texture: { src: 'assets/images/spinner.png' }
            }}
          />
        )}
      </UiEntity>
    </UiEntity>
  )
}

export default ButtonText
