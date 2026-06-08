import ReactEcs, {
  type ReactElement,
  type UiTransformProps
} from '@dcl/react-ecs'
import { Column } from './layout'
import { getFontSize } from '../../service/fontsize-system'
import { useLayoutContext } from '../../service/layout-context'

/**
 * Vertical wrapper for a single form field (label + input + caption).
 * Adds a uniform bottom margin so consecutive fields separate
 * consistently inside a Column.
 *
 * Pass `uiTransform` to override or augment (e.g. `zIndex` when the
 * field hosts an expanded dropdown that needs to render above the
 * sibling fields below).
 */
export function Field({
  children,
  uiTransform
}: {
  children?: ReactElement | ReactElement[] | null
  uiTransform?: UiTransformProps
}): ReactElement {
  const layoutContext = useLayoutContext()
  const fontSize = getFontSize({ context: layoutContext })
  return (
    <Column
      uiTransform={{
        margin: { bottom: fontSize },
        ...uiTransform
      }}
    >
      {children}
    </Column>
  )
}
