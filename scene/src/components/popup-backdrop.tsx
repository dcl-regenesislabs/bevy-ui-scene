import { COLOR } from './color-palette'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { store } from '../state/store'
import { closeLastPopupAction } from '../state/hud/actions'

export function PopupBackdrop({ children }: { children?: ReactElement }): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: 0, left: 0 },
        zIndex: 999,
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_9
      }}
      onMouseDown={() => {
        store.dispatch(closeLastPopupAction())
      }}
    >
      {children}
    </UiEntity>
  )
}
