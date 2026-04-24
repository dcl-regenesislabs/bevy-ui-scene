import { noop } from '../utils/function-utils'
import type { Callback, UiTransformProps } from '@dcl/sdk/react-ecs'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import Icon from './icon/Icon'
import { CONTEXT, getFontSize } from '../service/fontsize-system'

export function CloseButton({
  uiTransform,
  onClick = noop,
  fontSize = getFontSize({ context: CONTEXT.DIALOG })
}: {
  uiTransform?: UiTransformProps
  onClick: Callback
  fontSize?: number
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        borderWidth: 0,
        borderRadius: fontSize / 2,
        borderColor: Color4.Black(),
        width: fontSize * 2,
        height: fontSize * 2,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        ...uiTransform
      }}
      uiBackground={{
        color: Color4.Black()
      }}
      onMouseDown={onClick}
    >
      <Icon
        icon={{ atlasName: 'icons', spriteName: 'CloseIcon' }}
        uiTransform={{}}
        iconSize={fontSize}
      />
    </UiEntity>
  )
}
