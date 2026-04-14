import ReactEcs, { UiEntity } from '@dcl/react-ecs'
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
import { store } from '../../state/store'
import { closeLastPopupAction } from '../../state/hud/actions'
import { getAddressColor } from '../../ui-classes/main-hud/chat-and-logs/ColorByAddress'
import { getPlayer } from '@dcl/sdk/src/players'

export type FriendshipResultVariant =
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'canceled'

export type FriendshipResultData = {
  variant: FriendshipResultVariant
  address: string
  name: string
  hasClaimedName: boolean
}

function getResultMessage(
  variant: FriendshipResultVariant,
  name: string
): string {
  switch (variant) {
    case 'sent':
      return `Friend Request Sent To <b>${name}</b>`
    case 'accepted':
      return `You and <b>${name}</b> are now friends!`
    case 'rejected':
      return `Friend Request From <b>${name}</b> Rejected`
    case 'canceled':
      return `Friend Request To <b>${name}</b> Cancelled`
  }
}

export const FriendshipResultPopup: Popup = ({ shownPopup }) => {
  const data = shownPopup.data as FriendshipResultData
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
  const avatarSize = getContentScaleRatio() * 200
  const addressColor = data.hasClaimedName
    ? getAddressColor(data.address)
    : COLOR.TEXT_COLOR_LIGHT_GREY
  const ownPlayer = getPlayer()
  const ownColor = ownPlayer?.name?.includes('#')
    ? COLOR.TEXT_COLOR_LIGHT_GREY
    : getAddressColor(ownPlayer?.userId ?? '')

  return (
    <PopupBackdrop>
      <Column
        uiTransform={{
          alignItems: 'center',
          padding: {
            top: fontSizeTitle * 2,
            bottom: fontSizeTitle * 2,
            left: fontSizeTitle * 2,
            right: fontSizeTitle * 2
          }
        }}
        onMouseDown={() => {
          store.dispatch(closeLastPopupAction())
        }}
      >
        {data.variant === 'accepted' ? (
          <Row
            uiTransform={{
              alignItems: 'center',
              justifyContent: 'center',
              margin: { bottom: fontSizeTitle }
            }}
          >
            <AvatarCircle
              userId={ownPlayer?.userId ?? ''}
              circleColor={ownColor}
              uiTransform={{
                width: avatarSize,
                height: avatarSize,
                margin: { right: -getContentScaleRatio() * 20 }
              }}
              isGuest={false}
            />
            <AvatarCircle
              userId={data.address}
              circleColor={addressColor}
              uiTransform={{
                width: avatarSize,
                height: avatarSize
              }}
              isGuest={false}
            />
          </Row>
        ) : (
          <AvatarCircle
            userId={data.address}
            circleColor={addressColor}
            uiTransform={{
              width: avatarSize,
              height: avatarSize,
              margin: { bottom: fontSizeTitle }
            }}
            isGuest={false}
          />
        )}
        <UiEntity
          uiText={{
            value: getResultMessage(data.variant, data.name),
            fontSize: fontSizeTitle,
            color: COLOR.TEXT_COLOR_WHITE,
            textAlign: 'middle-center',
            textWrap: 'wrap'
          }}
        />
      </Column>
    </PopupBackdrop>
  )
}
