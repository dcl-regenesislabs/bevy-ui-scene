import { type BlockedUserData } from '../../service/social-service-type'
import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { type Key, UiEntity } from '@dcl/sdk/react-ecs'
import { getAddressColor } from '../../ui-classes/main-hud/chat-and-logs/ColorByAddress'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../service/fontsize-system'
import { Column, Row } from '../layout'
import { COLOR } from '../color-palette'
import { AvatarCircle } from '../avatar-circle'
import Icon from '../icon/Icon'
import { pushPopupAction } from '../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../state/hud/state'
import { store } from '../../state/store'
import { getNameWithHashPostfix } from '../../service/chat/chat-utils'

export function BlockedListItem({
  user,
  onMouseEnter,
  onMouseLeave,
  hovered = false,
  key
}: {
  user: BlockedUserData
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  hovered: boolean
  key: Key
}): ReactElement {
  const addressColor = user.hasClaimedName
    ? { ...(user.nameColor ?? getAddressColor(user.address)), a: 1 }
    : COLOR.TEXT_COLOR_LIGHT_GREY
  const displayName = user.hasClaimedName
    ? user.name
    : getNameWithHashPostfix(user.name, user.address)
  const fontSize = getFontSize({ context: CONTEXT.SIDE, token: TYPOGRAPHY_TOKENS.BODY })

  return (
    <Row
      uiTransform={{
        width: '100%',
        height: fontSize * 3
      }}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
      onMouseDown={() => {
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.PASSPORT,
            data: user.address.toLowerCase()
          })
        )
      }}
      uiBackground={{
        color: hovered ? COLOR.WHITE_OPACITY_1 : COLOR.BLACK_TRANSPARENT
      }}
    >
      <AvatarCircle
        imageSrc={user.profilePictureUrl}
        userId={user.address}
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
          justifyContent: 'center',
          flexGrow: 1
        }}
      >
        <Row>
          <UiEntity
            uiText={{
              value: `<b>${displayName}</b>`,
              textAlign: 'middle-left',
              color: addressColor,
              fontSize
            }}
          />
          {user.hasClaimedName ? (
            <Icon
              icon={{ spriteName: 'Verified', atlasName: 'icons' }}
              iconSize={fontSize}
            />
          ) : null}
        </Row>
      </Column>
    </Row>
  )
}
