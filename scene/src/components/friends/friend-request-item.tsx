import { Friend, ONLINE_STATUS } from '../../service/social-service-type'
import ReactEcs, { ReactElement, UiEntity } from '@dcl/react-ecs'
import { getAddressColor } from '../../ui-classes/main-hud/chat-and-logs/ColorByAddress'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'
import { Column, Row } from '../layout'
import { COLOR } from '../color-palette'
import { AvatarCircle } from '../avatar-circle'
import Icon from '../icon/Icon'
import { ButtonIcon } from '../button-icon'
import { pushPopupAction } from '../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../state/hud/state'
import { store } from '../../state/store'
import { executeTask } from '@dcl/sdk/ecs'
import { fetchFriendLocation } from '../../service/friend-location'

export function FriendRequestItem({
  friend,
  onMouseEnter,
  onMouseLeave,
  hovered = false
}: {
  friend: Friend
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  hovered: boolean
}): ReactElement {
  const addressColor = getAddressColor(friend.address)
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY })
  const menuButtonTransform = {
    width: fontSize * 1.5,
    height: fontSize * 1.5,
    margin: { right: fontSize / 2 }
  }
  const menuButtonIconSize = fontSize * 1.2
  return (
    <Row
      uiTransform={{
        width: '100%'
      }}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
      uiBackground={{
        color: hovered ? COLOR.WHITE_OPACITY_1 : COLOR.BLACK_TRANSPARENT
      }}
    >
      <AvatarCircle
        userId={friend.address}
        circleColor={addressColor}
        uiTransform={{
          margin: { left: fontSize },
          width: fontSize * 2,
          height: fontSize * 2
        }}
        isGuest={false}
      />
      <Column
        uiTransform={{
          alignItems: 'flex-start',
          justifyContent: 'center'
        }}
      >
        <Row>
          <UiEntity
            uiText={{
              value: `<b>${friend.name}</b>`,
              textAlign: 'middle-left',
              color: addressColor,
              fontSize
            }}
          />
          {friend.hasClaimedName ? (
            <Icon
              icon={{ spriteName: 'Verified', atlasName: 'icons' }}
              iconSize={fontSize}
            />
          ) : null}
        </Row>

        {friend.friendshipRequestMessage ? (
          <Icon
            uiTransform={{
              position: { left: fontSize / 2, top: -fontSize / 2 }
            }}
            icon={{ spriteName: 'Envelope', atlasName: 'icons' }}
            iconSize={fontSize}
          />
        ) : null}
      </Column>
      <Column
        uiTransform={{
          justifyContent: 'flex-end',
          margin: { right: fontSize },
          flexGrow: 1
        }}
      >
        <Row
          uiTransform={{
            width: '100%',
            justifyContent: 'flex-end',
            alignItems: 'flex-end'
          }}
        ></Row>
      </Column>
    </Row>
  )
}

export function isOnline(friend: Friend) {
  return (
    friend.onlineStatus === ONLINE_STATUS.ONLINE ||
    friend.onlineStatus === ONLINE_STATUS.IDLE
  )
}
