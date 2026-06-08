import type { Callback, UiTransformProps } from '@dcl/sdk/react-ecs'
import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { COLOR } from './color-palette'
import ButtonIcon from './button-icon/ButtonIcon'
import { store } from '../state/store'
import { closeLastPopupAction } from '../state/hud/actions'

export function CloseButton({
  uiTransform,
  onClick = () => {
    store.dispatch(closeLastPopupAction())
  },
  iconSize
}: {
  uiTransform?: UiTransformProps
  onClick?: Callback
  iconSize?: number
}): ReactElement {
  return (
    <ButtonIcon
      icon={{ atlasName: 'icons', spriteName: 'CloseIcon' }}
      iconSize={iconSize}
      backgroundColor={COLOR.BLACK}
      onMouseDown={onClick}
      uiTransform={{
        ...uiTransform
      }}
    />
  )
}
