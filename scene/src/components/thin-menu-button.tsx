import ReactEcs, { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { COLOR } from './color-palette'
import Icon from './icon/Icon'
import { type CONTEXT, getFontSize } from '../service/fontsize-system'
import { useLayoutContext } from '../service/layout-context'
import { noop } from '../utils/function-utils'
import { type Color4 } from '@dcl/sdk/math'
import { ThinButton } from './thin-button'
import { type ButtonVariant } from './button-variants'
import { type ReactElement } from '@dcl/react-ecs'

/**
 * "Kebab" / 3-dot icon button. Inherits the same context-driven sizing
 * and variant system as `ThinButton`. Default `fontSize` is 0.9× the
 * context's base so kebabs in the HUD bar look slightly more compact
 * than text-bearing siblings.
 */
export const ThinMenuButton = ({
  fontSize: fontSizeProp,
  layoutContext: layoutContextProp,
  variant,
  onMouseDown = noop,
  backgroundColor = COLOR.BLACK,
  uiTransform = {}
}: {
  fontSize?: number
  layoutContext?: CONTEXT
  variant?: ButtonVariant
  onMouseDown?: () => void
  backgroundColor?: Color4
  lookingUp?: boolean
  uiTransform?: UiTransformProps
}): ReactElement => {
  const fromContext = useLayoutContext()
  const layoutContext = layoutContextProp ?? fromContext
  const fontSize =
    fontSizeProp ?? getFontSize({ context: layoutContext }) * 0.9
  // When a variant is given, defer the bg/hover to ThinButton's variant
  // path; the legacy `backgroundColor` default only applies when no
  // variant is supplied.
  return (
    <ThinButton
      fontSize={fontSize}
      layoutContext={layoutContext}
      variant={variant}
      uiTransform={uiTransform}
      onMouseDown={onMouseDown}
      backgroundColor={variant != null ? undefined : backgroundColor}
    >
      <Icon
        iconColor={COLOR.WHITE}
        iconSize={fontSize * 0.6 * 2}
        icon={{
          spriteName: 'Menu',
          atlasName: 'icons'
        }}
      />
    </ThinButton>
  )
}
