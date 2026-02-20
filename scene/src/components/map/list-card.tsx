import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { Column, Row } from '../layout'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { getViewportHeight } from '../../service/canvas-ratio'
import { COLOR } from '../color-palette'
import { noop } from '../../utils/function-utils'
import { getFontSize } from '../../service/fontsize-system'

export type ListCardParams = {
  key?: any
  children?: ReactElement
  thumbnailSrc: string
  onMouseDown?: () => void
  active?: boolean
  activeFooter?: string
  uiTransform?: UiTransformProps
}
export function ListCard({
  thumbnailSrc,
  children,
  onMouseDown = noop,
  active,
  activeFooter,
  uiTransform
}: ListCardParams): ReactElement {
  const ROUNDED_BORDER_PROPS = {
    borderWidth: 0,
    borderRadius: getFontSize({}) / 2,
    borderColor: COLOR.BLACK_TRANSPARENT
  }
  return (
    <Column
      uiTransform={{
        width: '98%',
        margin: '1%',
        ...uiTransform,
        ...ROUNDED_BORDER_PROPS,
        borderColor: active
          ? COLOR.ACTIVE_BACKGROUND_COLOR
          : COLOR.BLACK_TRANSPARENT
      }}
      uiBackground={{ color: COLOR.WHITE }}
      onMouseDown={onMouseDown}
    >
      <Row
        uiTransform={{
          padding: '3%',
          margin: 0,
          width: '100%'
        }}
      >
        <Image
          src={thumbnailSrc}
          uiTransform={{
            width: getViewportHeight() * 0.2 * 0.8,
            height: getViewportHeight() * 0.125 * 0.8,
            flexShrink: 0,
            ...ROUNDED_BORDER_PROPS
          }}
        />
        <Column
          uiTransform={{
            alignItems: 'flex-start'
          }}
        >
          {children}
        </Column>
      </Row>
      {active && !!activeFooter ? (
        <UiEntity
          uiTransform={{
            position: { top: '-1%' }
          }}
          uiBackground={{
            color: COLOR.ACTIVE_BACKGROUND_COLOR
          }}
          uiText={{
            value: activeFooter,
            color: COLOR.TEXT_COLOR_WHITE,
            fontSize: getFontSize({})
          }}
        />
      ) : null}
    </Column>
  )
}

export type ImageParams = {
  key?: any
  src: string
  uiTransform?: UiTransformProps
}
export function Image({ src, uiTransform }: ImageParams): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        ...uiTransform
      }}
      uiBackground={{
        textureMode: 'stretch',
        texture: {
          src
        }
      }}
    ></UiEntity>
  )
}
