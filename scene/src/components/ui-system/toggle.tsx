import ReactEcs, {
  type Callback,
  type ReactElement,
  UiEntity,
  type UiTransformProps
} from '@dcl/react-ecs'
import { COLOR } from '../color-palette'
import { getFontSize } from '../../service/fontsize-system'
import { useLayoutContext } from '../../service/layout-context'
import { type ButtonVariant } from './button-variants'

export function ToggleHandler({
  children
}: {
  children?: ReactElement | ReactElement[] | null
}): ReactElement {
  void children
  return <UiEntity uiTransform={{ width: 0, height: 0 }} />
}

type ToggleChild = ReactElement | string | number | boolean | null | undefined

export function Toggle({
  value,
  onChange,
  children,
  variant = 'black',
  borderRadius = 9999,
  fontSize,
  orientation = 'horizontal',
  uiTransform
}: {
  value: boolean
  onChange: (value: boolean) => void
  children?: ToggleChild | ToggleChild[]
  variant?: ButtonVariant
  borderRadius?: number
  fontSize?: number
  orientation?: 'horizontal' | 'vertical'
  uiTransform?: UiTransformProps
}): ReactElement {
  const layoutContext = useLayoutContext()
  const fs = fontSize ?? getFontSize({ context: layoutContext })

  const handlerSize = fs * 2
  const padding = fs * 0.25
  const isHorizontal = orientation === 'horizontal'
  const trackMain = handlerSize * 2 + padding * 3
  const trackCross = handlerSize + padding * 2
  const trackWidth = isHorizontal ? trackMain : trackCross
  const trackHeight = isHorizontal ? trackCross : trackMain

  const trackColor = COLOR.WHITE_OPACITY_2

  const childrenArray: ToggleChild[] = Array.isArray(children)
    ? children
    : children === undefined || children === null
    ? []
    : [children]

  let handlerContent: ToggleChild | ToggleChild[] = null
  const slotContent: ToggleChild[] = []
  for (const c of childrenArray) {
    if (
      c !== null &&
      c !== undefined &&
      typeof c === 'object' &&
      'type' in c &&
      (c as { type: unknown }).type === ToggleHandler
    ) {
      const handlerProps = (
        c as { props?: { children?: ToggleChild | ToggleChild[] } }
      ).props
      handlerContent = handlerProps?.children ?? null
    } else {
      slotContent.push(c)
    }
  }

  const handleClick: Callback = () => {
    onChange(!value)
  }

  const justifyMain = value ? 'flex-end' : 'flex-start'

  return (
    <UiEntity
      uiTransform={{
        width: trackWidth,
        height: trackHeight,
        flexDirection: isHorizontal ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: justifyMain,
        padding,
        borderRadius,
        ...uiTransform
      }}
      uiBackground={{ color: trackColor }}
      onMouseDown={handleClick}
    >
      {slotContent.length > 0 && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: value
              ? isHorizontal
                ? { left: padding }
                : { top: padding }
              : isHorizontal
              ? { right: padding }
              : { bottom: padding },
            width: handlerSize,
            height: handlerSize,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {slotContent as ReactElement[]}
        </UiEntity>
      )}
      <UiEntity
        uiTransform={{
          width: handlerSize,
          height: handlerSize,
          borderRadius,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
        uiBackground={{ color: COLOR.WHITE }}
      >
        {handlerContent as ReactElement | ReactElement[] | null}
      </UiEntity>
    </UiEntity>
  )
}
