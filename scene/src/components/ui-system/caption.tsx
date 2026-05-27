import ReactEcs, {
  type ReactElement,
  UiEntity,
  type UiTransformProps
} from '@dcl/react-ecs'
import { type UiLabelProps } from '@dcl/react-ecs/dist/components/Label/types'
import { COLOR } from '../color-palette'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'
import { useLayoutContext } from '../../service/layout-context'

/**
 * Caption text used for helper/description copy below inputs, dropdown
 * selections, etc. Defaults to `BODY_S` font, light-grey color and
 * left-aligned. Caller can override any uiText field by spreading.
 */
export function Caption({
  uiText,
  uiTransform
}: {
  uiText: UiLabelProps
  uiTransform?: UiTransformProps
}): ReactElement {
  const layoutContext = useLayoutContext()
  const fontSize = getFontSize({
    context: layoutContext,
    token: TYPOGRAPHY_TOKENS.BODY_S
  })
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        ...uiTransform
      }}
      uiText={{
        fontSize,
        color: COLOR.TEXT_COLOR_LIGHT_GREY,
        textAlign: 'top-left',
        ...uiText
      }}
    />
  )
}
