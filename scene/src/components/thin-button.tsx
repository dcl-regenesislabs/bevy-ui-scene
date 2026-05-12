import { COLOR } from './color-palette'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { type CONTEXT, getFontSize } from '../service/fontsize-system'
import { useLayoutContext } from '../service/layout-context'
import { type Color4 } from '@dcl/sdk/math'
import { noop } from '../utils/function-utils'
import { type Callback, type UiTransformProps } from '@dcl/sdk/react-ecs'
import { type ButtonVariant, VARIANT_STYLES } from './button-variants'

/**
 * Thin vertical pill button used for HUD bars and menu kebabs. Sizes
 * itself from the resolved layout context (sidebar vs dialog) the same
 * way `ButtonIcon` / `ButtonComponent` do.
 *
 * Styling priority:
 *   1. `variant` (preferred) — picks `bg.base` / `bg.hover` from the
 *      shared `VARIANT_STYLES` table. Hover is wired automatically.
 *   2. `backgroundColor` — explicit color override; wins over variant.
 *      Used by legacy callsites; no hover state.
 *   3. Default — `COLOR.BLACK`, no hover (back-compat with previous
 *      hardcoded default).
 *
 * Size overrides:
 *   - `fontSize` — explicit base size; wins over the context default.
 *   - `layoutContext` — context override; wins over the inherited one.
 */
export const ThinButton = ({
  children,
  fontSize: fontSizeProp,
  layoutContext: layoutContextProp,
  variant,
  backgroundColor,
  onMouseDown = noop,
  uiTransform = {}
}: {
  children?: ReactElement | ReactElement[]
  fontSize?: number
  layoutContext?: CONTEXT
  variant?: ButtonVariant
  backgroundColor?: Color4
  onMouseDown?: Callback
  uiTransform?: UiTransformProps
}): ReactElement => {
  const fromContext = useLayoutContext()
  const layoutContext = layoutContextProp ?? fromContext
  const fontSize = fontSizeProp ?? getFontSize({ context: layoutContext })
  const [hovered, setHovered] = ReactEcs.useState<boolean>(false)

  // Resolution order: explicit backgroundColor > variant.bg > legacy
  // hardcoded BLACK. Hover swap only when variant drives the color.
  const variantStyle = variant != null ? VARIANT_STYLES[variant] : null
  const bgColor =
    backgroundColor ??
    (variantStyle != null
      ? hovered
        ? variantStyle.bg.hover
        : variantStyle.bg.base
      : COLOR.BLACK)
  const interactive = variant != null

  return (
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
      uiBackground={{ color: bgColor }}
      onMouseDown={onMouseDown}
      onMouseEnter={() => {
        if (interactive) setHovered(true)
      }}
      onMouseLeave={() => {
        if (interactive) setHovered(false)
      }}
    >
      {children}
    </UiEntity>
  )
}
