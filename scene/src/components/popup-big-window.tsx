import { COLOR } from './color-palette'
import { noop } from '../utils/function-utils'
import { CONTEXT, getFontSize } from '../service/fontsize-system'
import ReactEcs, { ReactElement, UiEntity } from '@dcl/react-ecs'
import { CloseButton } from './close-button'
import { getContentScaleRatio } from '../service/canvas-ratio'
import { closeLastPopupAction } from 'src/state/hud/actions'
import { store } from '../state/store'

export const PopupBigWindow = ({
  children = null
}: {
  children?: ReactElement | ReactElement[] | null
}) => {
  const borderRadius = getFontSize({ context: CONTEXT.DIALOG }) / 2

  return (
    <UiEntity
      uiTransform={{
        width: '80%',
        height: '100%',
        pointerFilter: 'block',
        flexDirection: 'row',
        borderRadius,
        borderWidth: 0,
        borderColor: COLOR.BLACK_TRANSPARENT
      }}
      onMouseDown={noop}
      uiBackground={{
        texture: { src: 'assets/images/menu/background.png' },
        textureMode: 'stretch'
      }}
    >
      {children}
      <CloseButton
        uiTransform={{
          position: {
            top: getContentScaleRatio() * 16,
            right: getContentScaleRatio() * 16
          },
          positionType: 'absolute',
          borderWidth: 0,
          borderRadius,
          borderColor: COLOR.BLACK_TRANSPARENT,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          flexGrow: 0
        }}
        onClick={() => {
          store.dispatch(closeLastPopupAction())
        }}
      />
    </UiEntity>
  )
}
