import { UiCanvasInformation, engine } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, {
  type Callback,
  Label,
  type Position,
  UiEntity,
  type UiTransformProps
} from '@dcl/sdk/react-ecs'
import { type AtlasIcon } from '../../utils/definitions'
import { ArrowToast } from '../arrow-toast'
import Icon from '../icon/Icon'
import { ROUNDED_TEXTURE_BACKGROUND } from '../../utils/constants'
import { type UiBackgroundProps } from '@dcl/react-ecs'
import { COLOR } from '../color-palette'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'

function ButtonIcon(props: {
  // Events
  key?: any
  onMouseEnter?: Callback
  onMouseLeave?: Callback
  onMouseDown?: Callback
  // Shape
  uiTransform?: UiTransformProps
  uiBackground?: UiBackgroundProps
  backgroundColor?: Color4
  icon: AtlasIcon
  iconSize?: number
  iconColor?: Color4
  hintText?: string
  showHint?: boolean
  hintFontSize?: number
  notifications?: number
  side?: 'left' | 'right' | 'top' | 'bottom'
}): ReactEcs.JSX.Element | null {
  const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
  if (canvasInfo === null) return null

  const DEFAULT_HINT_FONT_SIZE = getFontSize({})

  let position: Partial<Position> = { left: '100%' }

  if (props.side === 'right') position = { right: '100%' }
  if (props.side === 'bottom') position = { bottom: '100%' }
  if (props.side === 'top') position = { top: '100%' }

  return (
    <UiEntity
      uiTransform={{
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: (props.iconSize ?? 30) * 0.5,
        borderColor: COLOR.BLACK_TRANSPARENT,
        borderWidth: 0,
        ...props.uiTransform
      }}
      uiBackground={{
        color: props.backgroundColor ?? { ...Color4.White(), a: 0 },
        ...props.uiBackground
      }}
      onMouseDown={props.onMouseDown}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      {/* ICON */}

      <Icon
        icon={props.icon}
        iconColor={props.iconColor ?? Color4.White()}
        iconSize={props.iconSize}
      />
      <UiEntity
        uiTransform={{
          width: '40%',
          height: '40%',
          flexDirection: 'row',
          alignItems: 'center',
          positionType: 'absolute',
          position: { bottom: '-5%', right: '-5%' },
          display:
            props.notifications !== undefined && props.notifications > 0
              ? 'flex'
              : 'none'
        }}
        uiBackground={{
          ...ROUNDED_TEXTURE_BACKGROUND,
          color: { ...Color4.Red() }
        }}
      >
        <Label
          value={props.notifications?.toString() ?? '0'}
          textAlign="middle-center"
          fontSize={getFontSize({ token: TYPOGRAPHY_TOKENS.BODY_S })}
          uiTransform={{ width: '100%', height: '100%' }}
          textWrap={'nowrap'}
        />
      </UiEntity>
      {props.showHint && props.hintText !== undefined && (
        <ArrowToast
          uiTransform={{
            width: 'auto',
            height: 'auto',
            positionType: 'absolute',
            position
          }}
          text={props.hintText}
          fontSize={props.hintFontSize ?? DEFAULT_HINT_FONT_SIZE}
          arrowSide={props.side ?? 'left'}
        />
      )}
    </UiEntity>
  )
}

export default ButtonIcon
