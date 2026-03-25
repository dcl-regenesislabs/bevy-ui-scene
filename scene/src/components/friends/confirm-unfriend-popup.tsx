import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { type Popup } from '../popup-stack'
import { PopupBackdrop } from '../popup-backdrop'
import { COLOR } from '../color-palette'
import { Column, Row } from '../layout'
import { AvatarCircle } from '../avatar-circle'
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
import { getAddressColor } from '../../ui-classes/main-hud/chat-and-logs/ColorByAddress'

export type ConfirmUnfriendData = {
  address: string
  name: string
  hasClaimedName: boolean
}

export const ConfirmUnfriendPopup: Popup = ({ shownPopup }) => {
  const data = shownPopup.data as ConfirmUnfriendData
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
  const avatarSize = fontSize * 4
  const addressColor = data.hasClaimedName
    ? getAddressColor(data.address)
    : COLOR.TEXT_COLOR_LIGHT_GREY

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
        <AvatarCircle
          userId={data.address}
          circleColor={addressColor}
          uiTransform={{
            width: avatarSize,
            height: avatarSize,
            margin: { bottom: fontSize }
          }}
          isGuest={false}
        />

        <UiEntity
          uiTransform={{
            width: '100%',
            margin: { bottom: fontSize * 2 }
          }}
          uiText={{
            value: `Are you sure you want to unfriend <b>${data.name}</b>?`,
            fontSize: fontSizeTitle,
            color: COLOR.TEXT_COLOR_WHITE,
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
                await BevyApi.deleteFriend(data.address)
                store.dispatch(closeLastPopupAction())
              })
            }}
          >
            <UiEntity
              uiText={{
                value: '<b>UNFRIEND</b>',
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
