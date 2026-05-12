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
 * Thin pill with a chevron icon. Same context-aware sizing and variant
 * system as `ThinButton` / `ThinMenuButton`.
 */
export const ThinChevronButton = ({
  fontSize: fontSizeProp,
  layoutContext: layoutContextProp,
  variant,
  onMouseDown = noop,
  backgroundColor = COLOR.BLACK,
  lookingUp = true,
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
        iconSize={fontSize * 0.6}
        icon={{
          spriteName: 'chevron',
          atlasName: 'icons'
        }}
      />
    </ThinButton>
  )
}
