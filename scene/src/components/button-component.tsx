import ReactEcs, {
  type Callback,
  type PositionUnit,
  UiEntity,
  type UiTransformProps
} from '@dcl/sdk/react-ecs'
import { type Color4 } from '@dcl/sdk/math'
import { type AtlasIcon } from '../utils/definitions'
import Icon from './icon/Icon'
import {
  type CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../service/fontsize-system'
import { useLayoutContext } from '../service/layout-context'
import { getLoadingAlphaValue } from '../service/loading-alpha-color'
import { COLOR } from './color-palette'

export type ButtonVariant = 'transparent' | 'subtle' | 'solid' | 'black'

type VariantStyle = {
  bg: { base: Color4; hover: Color4; active: Color4 }
  textColor: { base: Color4; hover?: Color4; active?: Color4 }
  borderColor?: Color4
  borderWidth: number
}

// Every variant carries a 1px border. Variants that don't want a visible
// border use `BLACK_TRANSPARENT` so the layout slot is reserved — that
// way swapping to a coloured border on hover (e.g. via `destructiveHover`)
// doesn't shift the surrounding layout.
const VARIANT_STYLES: Record<ButtonVariant, VariantStyle> = {
  transparent: {
    bg: {
      base: COLOR.BLACK_TRANSPARENT,
      hover: COLOR.WHITE_OPACITY_1,
      active: COLOR.WHITE_OPACITY_2
    },
    textColor: { base: COLOR.WHITE },
    borderColor: COLOR.BLACK_TRANSPARENT,
    borderWidth: 1
  },
  subtle: {
    bg: {
      base: COLOR.WHITE_OPACITY_1,
      hover: COLOR.WHITE_OPACITY_2,
      active: COLOR.WHITE_OPACITY_3
    },
    textColor: { base: COLOR.WHITE },
    borderColor: COLOR.WHITE,
    borderWidth: 1
  },
  solid: {
    bg: {
      base: COLOR.BUTTON_PRIMARY,
      hover: COLOR.BUTTON_PRIMARY_HOVER,
      active: COLOR.BUTTON_PRIMARY_HOVER
    },
    textColor: { base: COLOR.WHITE },
    borderColor: COLOR.BLACK_TRANSPARENT,
    borderWidth: 1
  },
  black: {
    bg: {
      base: COLOR.BLACK,
      hover: COLOR.MENU_ITEM_BACKGROUND,
      active: COLOR.MENU_ITEM_BACKGROUND
    },
    textColor: { base: COLOR.WHITE },
    borderColor: COLOR.BLACK_TRANSPARENT,
    borderWidth: 1
  }
}

/**
 * Generic clickable button (text and/or icon) with a variant-driven
 * visual identity. Replaces the older `ButtonTextIcon` (which is now a
 * deprecated alias of this component).
 *
 * Variants:
 *   - `transparent` — default. Invisible base, light tint on hover.
 *     Use for menu items / toolbar buttons.
 *   - `subtle` — chip with bg + thin border. Use when the button should
 *     be visible without screaming for attention.
 *   - `solid` — filled with `BUTTON_PRIMARY`. Use for the main CTA.
 *   - `black` — solid black background with white text/icon. Use for
 *     dark inverted CTAs (e.g. close-button-style or dark-on-light pages).
 *
 * Pass `destructiveHover` when the action is destructive (delete /
 * unfriend / unblock / leave) — on hover the button's border switches
 * to red without shifting layout (every variant carries a 1px border,
 * invisible by default).
 *
 * Icon is optional — pass `icon` only when you want one. `hoverIcon`
 * swaps the sprite when the user is hovering or `active`.
 *
 * `disabled` greys the button and swallows clicks. `loading` pulses
 * the opacity and swallows clicks.
 *
 * Visual styling is owned by the variant — there is no
 * `backgroundColor` / `fontColor` / `iconColor` escape hatch. If a
 * design doesn't fit any variant, add a variant rather than overriding.
 */
function ButtonComponent(props: {
  // Events
  key?: string
  onMouseEnter?: Callback
  onMouseLeave?: Callback
  onMouseDown: Callback
  // Content
  value: string
  icon?: AtlasIcon
  hoverIcon?: AtlasIcon
  iconSize?: PositionUnit
  // Variants & states
  variant?: ButtonVariant
  active?: boolean
  disabled?: boolean
  loading?: boolean
  /**
   * When true, switches the button's border to red on hover to signal
   * a destructive action (delete / unfriend / unblock / leave).
   */
  destructiveHover?: boolean
  // Layout
  uiTransform?: UiTransformProps
  fontSize?: number
  layoutContext?: CONTEXT
}): ReactEcs.JSX.Element | null {
  const fromContext = useLayoutContext()
  const layoutContext = props.layoutContext ?? fromContext
  const [hovered, setHovered] = ReactEcs.useState<boolean>(false)

  const fontSize = props.fontSize ?? getFontSize({ context: layoutContext })
  const borderRadius = getFontSize({
    token: TYPOGRAPHY_TOKENS.BUTTON_ICON_BORDER_RADIUS,
    context: layoutContext
  })

  const variant = props.variant ?? 'transparent'
  const styles = VARIANT_STYLES[variant]

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

  const bgColor = styles.bg[visualState]
  const textColor = styles.textColor[visualState] ?? styles.textColor.base
  const opacity = isDisabled ? 0.4 : isLoading ? getLoadingAlphaValue() : 1

  // `destructiveHover` swaps the border to red on hover (no layout shift
  // because every variant already reserves a 1px border slot).
  const borderColor =
    props.destructiveHover === true && hovered && isInteractive
      ? COLOR.RED
      : (styles.borderColor ?? COLOR.BLACK_TRANSPARENT)

  // Sprite swap.
  const renderedIcon =
    (hovered || props.active === true) && props.hoverIcon !== undefined
      ? props.hoverIcon
      : props.icon

  // Default horizontal padding so the icon/text don't touch the edges.
  // Callsite can override via `uiTransform.padding` if it needs more or
  // less breathing room (or vertical padding too).
  const defaultPadding = { left: fontSize * 0.8, right: fontSize * 0.8 }

  return (
    <UiEntity
      uiTransform={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderWidth: styles.borderWidth,
        borderColor,
        borderRadius,
        padding: defaultPadding,
        opacity,
        ...props.uiTransform
      }}
      uiBackground={{ color: bgColor }}
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
      {renderedIcon !== undefined && (
        <Icon
          uiTransform={{ flexShrink: 0 }}
          iconSize={props.iconSize ?? fontSize}
          icon={renderedIcon}
          iconColor={textColor}
        />
      )}
      <UiEntity
        uiText={{
          value: props.value,
          fontSize,
          color: textColor,
          textWrap: 'nowrap'
        }}
      />
    </UiEntity>
  )
}

export { ButtonComponent }
export default ButtonComponent
