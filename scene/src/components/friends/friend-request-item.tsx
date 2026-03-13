import { Friend, ONLINE_STATUS } from '../../service/social-service-type'
import ReactEcs, { Button, ReactElement, UiEntity } from '@dcl/react-ecs'
import { getAddressColor } from '../../ui-classes/main-hud/chat-and-logs/ColorByAddress'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'
import { Column, Row } from '../layout'
import { COLOR } from '../color-palette'
import { AvatarCircle } from '../avatar-circle'
import Icon from '../icon/Icon'
import { ButtonText } from '../button-text'
import { Callback, Label } from '@dcl/sdk/react-ecs'
import { noop } from '../../utils/function-utils'
import { truncateWithoutBreakingWords } from '../../utils/ui-utils'
import { store } from '../../state/store'
import { pushPopupAction } from '../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../state/hud/state'

export function FriendRequestItem({
  friend,
  onMouseEnter,
  onMouseLeave,
  hovered = false,
  children
}: {
  friend: Friend
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  hovered: boolean
  children?: ReactElement | ReactElement[] | null
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
              value: `<b>${truncateWithoutBreakingWords(friend.name, 10)}</b>`,
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
            alignItems: 'center'
          }}
        >
          {children}
        </Row>
      </Column>
    </Row>
  )
}

export function PanelListButton({
  onMouseDown = noop,
  variant = 'primary',
  children
}: {
  variant?: 'primary' | 'secondary'
  onMouseDown?: Callback
  children?: ReactElement | ReactElement[] | null
}) {
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY })
  return (
    <UiEntity
      uiTransform={{
        height: fontSize * 2,
        alignItems: 'center',
        justifyContent: 'center',
        margin: { right: fontSize / 2 },
        borderRadius: fontSize / 2
      }}
      uiBackground={{
        color:
          variant === 'secondary' ? COLOR.WHITE_OPACITY_1 : COLOR.BUTTON_PRIMARY
      }}
      onMouseDown={onMouseDown}
    >
      {children}
    </UiEntity>
  )
}

export function isOnline(friend: Friend) {
  return (
    friend.onlineStatus === ONLINE_STATUS.ONLINE ||
    friend.onlineStatus === ONLINE_STATUS.IDLE
  )
}

export function FriendRequestItemReceived({
  friendRequest,
  hovered,
  onMouseEnter,
  onMouseLeave
}: {
  friendRequest: Friend
  hovered?: boolean
  onMouseEnter?: Callback
  onMouseLeave?: Callback
}) {
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY })
  return (
    <FriendRequestItem
      hovered={!!hovered}
      friend={friendRequest}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <PanelListButton variant={'secondary'} onMouseDown={() => {}}>
        <Label value={'DELETE'} />
      </PanelListButton>
      <PanelListButton onMouseDown={() => {}}>
        <Label value={'ACCEPT'} />
      </PanelListButton>
      <PanelListButton
        onMouseDown={() => {
          store.dispatch(
            pushPopupAction({
              type: HUD_POPUP_TYPE.PROFILE_MENU,
              data: {
                player: {
                  ...friendRequest,
                  userId: friendRequest.address.toLowerCase(),
                  isGuest: false
                }
              }
            })
          )
        }}
        variant={'secondary'}
      >
        <Icon
          icon={{ spriteName: 'Menu', atlasName: 'icons' }}
          iconSize={fontSize}
        />
      </PanelListButton>
    </FriendRequestItem>
  )
}

export function FriendRequestItemSent({
  friendRequest,
  hovered,
  onMouseEnter,
  onMouseLeave
}: {
  friendRequest: Friend
  hovered?: boolean
  onMouseEnter?: Callback
  onMouseLeave?: Callback
}) {
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY })
  return (
    <FriendRequestItem
      hovered={!!hovered}
      friend={friendRequest}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <PanelListButton variant={'secondary'} onMouseDown={() => {}}>
        <Label value={'CANCEL'} />
      </PanelListButton>

      <PanelListButton
        onMouseDown={() => {
          store.dispatch(
            pushPopupAction({
              type: HUD_POPUP_TYPE.PROFILE_MENU,
              data: {
                player: {
                  ...friendRequest,
                  userId: friendRequest.address.toLowerCase(),
                  isGuest: false
                }
              }
            })
          )
        }}
        variant={'secondary'}
      >
        <Icon
          icon={{ spriteName: 'Menu', atlasName: 'icons' }}
          iconSize={fontSize}
        />
      </PanelListButton>
    </FriendRequestItem>
  )
}
