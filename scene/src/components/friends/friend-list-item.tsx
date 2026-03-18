import { type FriendData } from '../../service/social-service-type'
import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { Key, UiEntity } from '@dcl/sdk/react-ecs'
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

export function FriendListItem({
  friend,
  onMouseEnter,
  onMouseLeave,
  hovered = false,
  key
}: {
  friend: FriendData
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  hovered: boolean
  key: Key
}): ReactElement {
  const addressColor = {
    ...(friend.nameColor ?? getAddressColor(friend.address)),
    a: 1
  }
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
        width: '100%',
        height: fontSize * 3
      }}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
      uiBackground={{
        color: hovered ? COLOR.WHITE_OPACITY_1 : COLOR.BLACK_TRANSPARENT
      }}
    >
      <AvatarCircle
        imageSrc={friend.profilePictureUrl}
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
        >
          <ButtonIcon
            icon={{ spriteName: 'JumpIn', atlasName: 'icons' }}
            iconSize={menuButtonIconSize}
            uiTransform={{
              ...menuButtonTransform
            }}
            onMouseDown={() => {
              executeTask(async () => {
                const location = await fetchFriendLocation(friend.address)
                if (!location) return
                store.dispatch(
                  pushPopupAction({
                    type: HUD_POPUP_TYPE.TELEPORT,
                    data: {
                      coordinates: location.coordinates,
                      realm: location.realm
                    }
                  })
                )
              })
            }}
          />
          <ButtonIcon
            iconSize={menuButtonIconSize}
            icon={{ spriteName: 'Menu', atlasName: 'icons' }}
            uiTransform={{
              ...menuButtonTransform
            }}
            onMouseDown={() => {
              store.dispatch(
                pushPopupAction({
                  type: HUD_POPUP_TYPE.PROFILE_MENU,
                  data: {
                    player: {
                      ...friend,
                      userId: friend.address.toLowerCase(),
                      isGuest: false
                    }
                  }
                })
              )
            }}
          />
        </Row>
      </Column>
    </Row>
  )
}
