import type { FriendRequestData } from '../../service/social-service-type'
import ReactEcs, { type ReactElement } from '@dcl/react-ecs'
import { Key, UiEntity } from '@dcl/sdk/react-ecs'
import { getAddressColor } from '../../ui-classes/main-hud/chat-and-logs/ColorByAddress'
import { getFontSize, TYPOGRAPHY_TOKENS } from '../../service/fontsize-system'
import { Column, Row } from '../layout'
import { COLOR } from '../color-palette'
import { AvatarCircle } from '../avatar-circle'
import Icon from '../icon/Icon'
import { type Callback, Label } from '@dcl/sdk/react-ecs'
import { truncateWithoutBreakingWords } from '../../utils/ui-utils'
import { store } from '../../state/store'
import { pushPopupAction } from '../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../state/hud/state'
import { BevyApi } from '../../bevy-api'
import { executeTask } from '@dcl/sdk/ecs'
import { getNameWithHashPostfix } from '../../service/chat/chat-utils'

const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC'
]

export function formatRequestDate(timestamp: number): string {
  const date = new Date(timestamp)
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`
}

export function FriendRequestItem({
  friendRequest,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  hovered = false,
  children
}: {
  friendRequest: FriendRequestData
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onMouseDown?: () => void
  hovered: boolean
  children?: ReactElement | ReactElement[] | null
}): ReactElement {
  const addressColor = friendRequest.hasClaimedName
    ? getAddressColor(friendRequest.address)
    : COLOR.TEXT_COLOR_LIGHT_GREY
  const displayName = friendRequest.hasClaimedName
    ? friendRequest.name
    : getNameWithHashPostfix(friendRequest.name, friendRequest.address)
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY })
  return (
    <Row
      uiTransform={{
        width: '100%',
        height: fontSize * 3
      }}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
      onMouseDown={onMouseDown}
      uiBackground={{
        color: hovered ? COLOR.WHITE_OPACITY_1 : COLOR.BLACK_TRANSPARENT
      }}
    >
      <AvatarCircle
        imageSrc={friendRequest.profilePictureUrl}
        userId={friendRequest.address}
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
              value: `<b>${truncateWithoutBreakingWords(displayName, 10)}</b>`,
              textAlign: 'middle-left',
              color: addressColor,
              fontSize
            }}
          />
          {friendRequest.hasClaimedName ? (
            <Icon
              icon={{ spriteName: 'Verified', atlasName: 'icons' }}
              iconSize={fontSize}
            />
          ) : null}
        </Row>

        {friendRequest.message ? (
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
          {hovered ? (
            children
          ) : (
            <UiEntity
              uiTransform={{
                position: { right: fontSize }
              }}
              uiText={{
                value: formatRequestDate(friendRequest.createdAt),
                fontSize: fontSize,
                color: COLOR.TEXT_COLOR_GREY,
                textAlign: 'middle-right'
              }}
            />
          )}
        </Row>
      </Column>
    </Row>
  )
}

export function PanelListButton({
  onMouseDown,
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

export function FriendRequestItemReceived({
  friendRequest,
  hovered,
  onMouseEnter,
  onMouseLeave,
  onAction,
  key
}: {
  friendRequest: FriendRequestData
  hovered?: boolean
  onMouseEnter?: Callback
  onMouseLeave?: Callback
  onAction?: (address: string) => void
  key: Key
}) {
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY })
  const fontSize_s = getFontSize({ token: TYPOGRAPHY_TOKENS.CAPTION })
  return (
    <FriendRequestItem
      hovered={!!hovered}
      friendRequest={friendRequest}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={() => {
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.FRIEND_REQUEST_RECEIVED,
            data: friendRequest
          })
        )
      }}
    >
      <PanelListButton
        variant={'secondary'}
        onMouseDown={() => {
          executeTask(async () => {
            await BevyApi.rejectFriendRequest(friendRequest.address)
            onAction?.(friendRequest.address)
          })
        }}
      >
        <Label fontSize={fontSize_s} value={'DELETE'} />
      </PanelListButton>
      <PanelListButton
        onMouseDown={() => {
          executeTask(async () => {
            await BevyApi.acceptFriendRequest(friendRequest.address)
            onAction?.(friendRequest.address)
          })
        }}
      >
        <Label fontSize={fontSize_s} value={'ACCEPT'} />
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
  onMouseLeave,
  onAction
}: {
  friendRequest: FriendRequestData
  hovered?: boolean
  onMouseEnter?: Callback
  onMouseLeave?: Callback
  onAction?: (address: string) => void
}) {
  const fontSize = getFontSize({ token: TYPOGRAPHY_TOKENS.BODY })
  return (
    <FriendRequestItem
      hovered={!!hovered}
      friendRequest={friendRequest}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={() => {
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.FRIEND_REQUEST_SENT,
            data: friendRequest
          })
        )
      }}
    >
      <PanelListButton
        variant={'secondary'}
        onMouseDown={() => {
          executeTask(async () => {
            await BevyApi.cancelFriendRequest(friendRequest.address)
            onAction?.(friendRequest.address)
          })
        }}
      >
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
