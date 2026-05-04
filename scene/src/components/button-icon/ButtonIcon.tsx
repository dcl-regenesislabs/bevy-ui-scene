import { engine, UiCanvasInformation } from '@dcl/sdk/ecs'
import { type Color4 } from '@dcl/sdk/math'
import ReactEcs, {
  type Callback,
  type Position,
  UiEntity,
  type UiTransformProps
} from '@dcl/sdk/react-ecs'
import { type AtlasIcon } from '../../utils/definitions'
import { ArrowToast } from '../arrow-toast'
import Icon from '../icon/Icon'
import { type UiBackgroundProps } from '@dcl/react-ecs'
import { COLOR } from '../color-palette'
import {
  type CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../service/fontsize-system'
import { useLayoutContext } from '../../service/layout-context'
import { getLoadingAlphaValue } from '../../service/loading-alpha-color'
import { NotificationBadge } from '../notification-badge'

export type ButtonIconVariant =
  | 'transparent'
  | 'solid'
  | 'subtle'
  | 'destructive'

type VariantStyle = {
  bg: { base: Color4; hover: Color4; active: Color4 }
  iconColor: { base: Color4; hover?: Color4; active?: Color4 }
}

const VARIANT_STYLES: Record<ButtonIconVariant, VariantStyle> = {
  transparent: {
    bg: {
      base: COLOR.BLACK_TRANSPARENT,
      hover: COLOR.WHITE_OPACITY_1,
      active: COLOR.WHITE_OPACITY_2
    },
    iconColor: { base: COLOR.WHITE }
  },
  solid: {
    bg: {
      base: COLOR.BUTTON_PRIMARY,
      hover: COLOR.BUTTON_PRIMARY_HOVER,
      active: COLOR.BUTTON_PRIMARY_HOVER
    },
    iconColor: { base: COLOR.WHITE }
  },
  subtle: {
    bg: {
      base: COLOR.WHITE_OPACITY_1,
      hover: COLOR.WHITE_OPACITY_2,
      active: COLOR.WHITE_OPACITY_3
    },
    iconColor: { base: COLOR.WHITE }
  },
  destructive: {
    bg: {
      base: COLOR.BLACK_TRANSPARENT,
      hover: { ...COLOR.RED, a: 0.15 },
      active: { ...COLOR.RED, a: 0.25 }
    },
    iconColor: { base: COLOR.WHITE, hover: COLOR.RED, active: COLOR.RED }
  }
}

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
  hoverIcon?: AtlasIcon
  iconSize?: number
  borderRadius?: number
  iconColor?: Color4
  hintText?: string
  showHint?: boolean
  hintFontSize?: number
  notifications?: number
  hintSide?: 'left' | 'right' | 'top' | 'bottom'
  layoutContext?: CONTEXT
  // Design-system additions
  variant?: ButtonIconVariant
  active?: boolean
  disabled?: boolean
  loading?: boolean
}): ReactEcs.JSX.Element | null {
  const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
  const fromContext = useLayoutContext()
  const [hovered, setHovered] = ReactEcs.useState<boolean>(false)
  if (canvasInfo === null) return null
  const layoutContext = props.layoutContext ?? fromContext
  const variant = props.variant ?? 'transparent'
  const styles = VARIANT_STYLES[variant]

  const BUTTON_ICON_SIZE = getFontSize({
    token: TYPOGRAPHY_TOKENS.BUTTON_ICON,
    context: layoutContext
  })
  const BUTTON_ICON_BORDER_RADIUS = getFontSize({
    token: TYPOGRAPHY_TOKENS.BUTTON_ICON_BORDER_RADIUS,
    context: layoutContext
  })
  const BUTTON_ICON_HEIGHT = (BUTTON_ICON_SIZE / 1.5) * 2
  const DEFAULT_HINT_FONT_SIZE = getFontSize({ context: layoutContext })

  // Resolve visual state. `disabled` short-circuits everything (no hover,
  // no clicks). `active` forces the active style. Otherwise we fall back
  // to the live hover state.
  const isDisabled = props.disabled === true
  const isLoading = props.loading === true
  const isInteractive = !isDisabled && !isLoading
  const visualState: 'base' | 'hover' | 'active' = isDisabled
    ? 'base'
    : props.active === true
      ? 'active'
      : hovered
        ? 'hover'
        : 'base'

  const variantBg = styles.bg[visualState]
  const variantIconColor =
    styles.iconColor[visualState] ?? styles.iconColor.base

  // Legacy prop overrides win over variant defaults (backwards compat).
  const bgColor = props.backgroundColor ?? variantBg
  const iconColor = props.iconColor ?? variantIconColor

  // Sprite swap: hoverIcon when hovered or active, else default icon.
  const renderedIcon =
    (hovered || props.active === true) && props.hoverIcon !== undefined
      ? props.hoverIcon
      : props.icon

  // Hint visibility: external prop wins; else show on internal hover when
  // hintText is provided.
  const showHint =
    props.showHint ??
    (props.hintText !== undefined && hovered && isInteractive)

  let position: Partial<Position> = { left: '100%' }
  if (props.hintSide === 'right') position = { right: '100%' }
  if (props.hintSide === 'bottom') position = { bottom: '100%' }
  if (props.hintSide === 'top') position = { top: '100%' }

  // Opacity for disabled / loading visuals.
  const opacity = isDisabled ? 0.4 : isLoading ? getLoadingAlphaValue() : 1

  return (
    <UiEntity
      uiTransform={{
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: props.borderRadius ?? BUTTON_ICON_BORDER_RADIUS,
        height: BUTTON_ICON_HEIGHT,
        opacity,
        ...props.uiTransform
      }}
      uiBackground={{
        color: bgColor,
        ...props.uiBackground
      }}
      onMouseDown={isInteractive ? props.onMouseDown : undefined}
      onMouseEnter={() => {
        if (!isInteractive) return
        setHovered(true)
        props.onMouseEnter?.()
      }}
      onMouseLeave={() => {
        setHovered(false)
        props.onMouseLeave?.()
      }}
    >
      {/* ICON */}
      <Icon
        icon={renderedIcon}
        iconColor={iconColor}
        iconSize={props.iconSize ?? BUTTON_ICON_SIZE}
      />
      {/* Notification badge — renders nothing if count <= 0 */}
      <NotificationBadge
        count={props.notifications ?? 0}
        context={layoutContext}
      />
      {showHint && props.hintText !== undefined && (
        <ArrowToast
          uiTransform={{
            width: 'auto',
            height: 'auto',
            positionType: 'absolute',
            position
          }}
          text={props.hintText}
          fontSize={props.hintFontSize ?? DEFAULT_HINT_FONT_SIZE}
          arrowSide={props.hintSide ?? 'left'}
        />
      )}
    </UiEntity>
  )
}

export default ButtonIcon
