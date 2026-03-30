import type { ReactElement } from '@dcl/react-ecs'
import { FLEX_BASIS_AUTO } from '../../../utils/ui-utils'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { COLOR } from '../../color-palette'
import { getFontSize } from '../../../service/fontsize-system'
import Icon from '../../icon/Icon'
import { type PBUiCanvasInformation } from '@dcl/ecs/dist/components/generated/pb/decentraland/sdk/components/ui_canvas_information.gen'
import { MAX_ZINDEX } from '../../../utils/constants'
import { copyToClipboard } from '~system/RestrictedActions'
import type { ChatMessageRepresentation } from './ChatMessage.types'

export function MessageSubMenu({
  canvasInfo,
  state
}: {
  canvasInfo: PBUiCanvasInformation
  state: any
}): ReactElement[] | null {
  const fontSize = getFontSize({})
  if (!state.messageMenuTimestamp) return null

  return [
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: { top: '-100%', left: '-100%' },
        width: canvasInfo.width * 2,
        height: canvasInfo.height * 2,
        zIndex: MAX_ZINDEX - 2
      }}
      uiBackground={{
        color: COLOR.BLACK_TRANSPARENT
      }}
      onMouseDown={() => {
        state.messageMenuTimestamp = 0
      }}
    />,
    <UiEntity
      uiTransform={{
        positionType: 'absolute',
        position: {
          left:
            canvasInfo.height *
            (0.3 +
              (state.shownMessages.find(
                (m: ChatMessageRepresentation) =>
                  m.timestamp === state.messageMenuTimestamp
              )?.side ?? 0) *
                0.019),
          top: state.messageMenuPositionTop
        },
        width: canvasInfo.width * 0.1,
        height: '5%',
        flexShrink: 0,
        flexGrow: 1,
        ...FLEX_BASIS_AUTO,
        zIndex: MAX_ZINDEX - 1,
        borderWidth: 0,
        borderRadius: 10,
        borderColor: COLOR.DARK_OPACITY_9,
        padding: '1%'
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_9
      }}
    >
      <UiEntity
        uiTransform={{
          borderWidth: 1,
          borderRadius: fontSize,
          borderColor: COLOR.MENU_ITEM_BACKGROUND,
          alignItems: 'center',
          width: '100%',
          height: '100%',
          padding: { left: '2%' }
        }}
        uiBackground={{
          color: COLOR.MENU_ITEM_BACKGROUND
        }}
        onMouseDown={() => {
          try {
            const textToCopy =
              state.shownMessages.find(
                (m: ChatMessageRepresentation) =>
                  m.timestamp === state.messageMenuTimestamp
              )?.message ?? ''
            copyToClipboard({
              text: textToCopy
            }).catch(console.error)
          } catch (error) {}

          state.messageMenuTimestamp = 0
        }}
      >
        <Icon
          icon={{ spriteName: 'CopyIcon', atlasName: 'icons' }}
          iconSize={fontSize}
        />
        <UiEntity
          uiText={{
            value: 'COPY',
            fontSize
          }}
        />
      </UiEntity>
    </UiEntity>
  ]
}
