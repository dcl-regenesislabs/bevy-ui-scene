import { type Key, type UiTransformProps } from '@dcl/sdk/react-ecs'
import ReactEcs, {
  type Children,
  type ReactElement,
  type UiBackgroundProps,
  UiEntity
} from '@dcl/react-ecs'
import { type UiLabelProps } from '@dcl/react-ecs/dist/components/Label/types'
import { GrowContext, type GrowContextValue } from '../service/grow-context'

export function Row({
  uiTransform,
  uiBackground,
  children,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  uiText,
  childrenGrow,
  childrenGap
}: {
  uiTransform?: UiTransformProps
  uiBackground?: UiBackgroundProps
  children?: Children
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onMouseDown?: () => void
  uiText?: UiLabelProps
  key?: Key
  /** When true, descendant participants (e.g. `ButtonComponent`) self-apply
   *  `flexGrow: 1, flexBasis: 0` so this Row's children split width evenly. */
  childrenGrow?: boolean
  /** Total horizontal space between adjacent children, in px. Combined with
   *  `childrenGrow` for the cancel/submit bar pattern. Inert without it. */
  childrenGap?: number
}): ReactElement {
  const gap = childrenGap ?? 0
  const growActive = childrenGrow === true
  // Negative outer margin cancels the symmetric `gap/2` that each child adds
  // on its own edges, so the Row keeps hitting its parent's bounds while the
  // visible gap between siblings ends up exactly `gap`.
  const growMargin = growActive
    ? { left: -gap / 2, right: -gap / 2 }
    : undefined
  const rowEntity = (
    <UiEntity
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      uiTransform={{
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        ...uiTransform,
        ...(growMargin != null
          ? {
              margin: {
                ...(typeof uiTransform?.margin === 'object'
                  ? uiTransform.margin
                  : {}),
                ...growMargin
              }
            }
          : {})
      }}
      uiBackground={uiBackground}
      uiText={uiText}
    >
      {children}
    </UiEntity>
  )
  if (!growActive) return rowEntity
  const value: GrowContextValue = { active: true, gap }
  return <GrowContext.Provider value={value}>{rowEntity}</GrowContext.Provider>
}

export function Column({
  uiTransform,
  children,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  uiBackground,
  uiText
}: {
  uiTransform?: UiTransformProps
  children?: ReactElement | ReactElement[] | null[]
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onMouseDown?: () => void
  uiBackground?: UiBackgroundProps
  uiText?: UiLabelProps
}): ReactElement {
  return (
    <UiEntity
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      uiBackground={uiBackground}
      onMouseDown={onMouseDown}
      uiTransform={{
        flexDirection: 'column',
        ...uiTransform
      }}
      uiText={uiText}
    >
      {children}
    </UiEntity>
  )
}
