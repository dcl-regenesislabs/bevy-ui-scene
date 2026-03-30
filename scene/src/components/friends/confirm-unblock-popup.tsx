import ReactEcs, { UiEntity } from '@dcl/react-ecs'
import { type Popup } from '../popup-stack'
import { PopupBackdrop } from '../popup-backdrop'
import { COLOR } from '../color-palette'
import { Column, Row } from '../layout'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../service/fontsize-system'
import { getContentScaleRatio } from '../../service/canvas-ratio'
import { BORDER_RADIUS_F } from '../../utils/ui-utils'
import { noop } from '../../utils/function-utils'
import { store } from '../../state/store'
import { closeLastPopupAction } from '../../state/hud/actions'
import { BevyApi } from '../../bevy-api'
import { executeTask } from '@dcl/sdk/ecs'
import { PanelListButton } from './friend-request-item'
import Icon from '../icon/Icon'

export type ConfirmUnblockData = {
  address: string
  name: string
  hasClaimedName: boolean
}

export const ConfirmUnblockPopup: Popup = ({ shownPopup }) => {
  const data = shownPopup.data as ConfirmUnblockData
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
  const iconSize = fontSize * 4

  return (
    <PopupBackdrop>
      <Column
        uiTransform={{
          width: getContentScaleRatio() * 1200,
          borderRadius: BORDER_RADIUS_F,
          padding: {
            top: fontSize * 4,
            bottom: fontSize * 4,
            left: fontSize * 4,
            right: fontSize * 4
          },
          alignItems: 'center'
        }}
        uiBackground={{ color: COLOR.URL_POPUP_BACKGROUND }}
        onMouseDown={noop}
      >
        <UiEntity
          uiTransform={{
            width: iconSize,
            height: iconSize,
            justifyContent: 'center',
            alignItems: 'center',
            margin: { bottom: fontSize },
            borderRadius: iconSize / 2
          }}
          uiBackground={{ color: COLOR.RED }}
        >
          <Icon
            icon={{ spriteName: 'BlockUser', atlasName: 'icons' }}
            iconSize={iconSize * 0.6}
            iconColor={COLOR.WHITE}
          />
        </UiEntity>

        <UiEntity
          uiTransform={{
            width: '100%',
            margin: { bottom: fontSize }
          }}
          uiText={{
            value: `Are you sure you want to unblock\n<b>${data.name}</b>?`,
            fontSize: fontSizeTitle,
            color: COLOR.TEXT_COLOR_WHITE,
            textAlign: 'middle-center',
            textWrap: 'wrap'
          }}
        />

        <UiEntity
          uiTransform={{
            width: '100%',
            margin: { bottom: fontSize * 2 }
          }}
          uiText={{
            value:
              'If you unblock someone, you will see their avatar in-world, and you will be able to send friend requests and messages to each other in public or private chats.',
            fontSize,
            color: COLOR.TEXT_COLOR_GREY,
            textAlign: 'middle-center',
            textWrap: 'wrap'
          }}
        />

        <Row
          uiTransform={{
            width: '100%',
            justifyContent: 'center'
          }}
        >
          <PanelListButton
            variant="secondary"
            onMouseDown={() => {
              store.dispatch(closeLastPopupAction())
            }}
          >
            <UiEntity
              uiText={{
                value: '<b>CANCEL</b>',
                fontSize,
                color: COLOR.TEXT_COLOR_WHITE
              }}
              uiTransform={{ margin: { left: fontSize, right: fontSize } }}
            />
          </PanelListButton>
          <PanelListButton
            variant="primary"
            onMouseDown={() => {
              executeTask(async () => {
                await BevyApi.social.unblockUser(data.address)
                store.dispatch(closeLastPopupAction())
              })
            }}
          >
            <UiEntity
              uiText={{
                value: '<b>UNBLOCK</b>',
                fontSize,
                color: COLOR.TEXT_COLOR_WHITE
              }}
              uiTransform={{ margin: { left: fontSize, right: fontSize } }}
            />
          </PanelListButton>
        </Row>
      </Column>
    </PopupBackdrop>
  )
}
