import { type Key, type UiTransformProps } from '@dcl/sdk/react-ecs'
import ReactEcs, {
  Children,
  type ReactElement,
  type UiBackgroundProps,
  UiEntity
} from '@dcl/react-ecs'
import { type UiLabelProps } from '@dcl/react-ecs/dist/components/Label/types'
export function Row({
  uiTransform,
  uiBackground,
  children,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  uiText
}: {
  uiTransform?: UiTransformProps
  uiBackground?: UiBackgroundProps
  children?: Children
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onMouseDown?: () => void
  uiText?: UiLabelProps
  key?: Key
}): ReactElement {
  return (
    <UiEntity
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      uiTransform={{
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        ...uiTransform
      }}
      uiBackground={uiBackground}
      uiText={uiText}
    >
      {children}
    </UiEntity>
  )
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
