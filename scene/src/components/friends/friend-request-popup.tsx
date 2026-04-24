import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import type {
  FriendData,
  FriendRequestData
} from '../../service/social-service-type'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect
import { type Popup } from '../popup-stack'
import { PopupBackdrop } from '../popup-backdrop'
import { COLOR } from '../color-palette'
import { Column, Row } from '../layout'
import { AvatarCircle } from '../avatar-circle'
import { getAddressColor } from '../../ui-classes/main-hud/chat-and-logs/ColorByAddress'
import { PlayerNameComponent } from '../player-name-component'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../service/fontsize-system'
import { getContentScaleRatio } from '../../service/canvas-ratio'
import { BORDER_RADIUS_F } from '../../utils/ui-utils'
import { noop } from '../../utils/function-utils'
import { store } from '../../state/store'
import { closeLastPopupAction, pushPopupAction } from '../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../state/hud/state'
import { BevyApi } from '../../bevy-api'
import { executeTask } from '@dcl/sdk/ecs'
import { formatRequestDate, PanelListButton } from './friend-request-item'
import { showConfirmPopup } from '../confirm-popup'

import { removeFriendRequest } from './friend-request-list'

export const FriendRequestReceivedPopup: Popup = ({ shownPopup }) => {
  const request = shownPopup.data as FriendRequestData
  return (
    <PopupBackdrop>
      <FriendRequestPopupContent
        request={request}
        title="Friend Request Received"
        primaryLabel="ACCEPT"
        secondaryLabel="REJECT"
        dismissLabel="Decide Later"
        onPrimary={() => {
          executeTask(async () => {
            await BevyApi.social.acceptFriendRequest(request.address)
            removeFriendRequest(request.address)
            store.dispatch(closeLastPopupAction())
            store.dispatch(
              pushPopupAction({
                type: HUD_POPUP_TYPE.FRIENDSHIP_RESULT,
                data: {
                  variant: 'accepted',
                  address: request.address,
                  name: request.name,
                  hasClaimedName: request.hasClaimedName
                }
              })
            )
          })
        }}
        onSecondary={() => {
          executeTask(async () => {
            await BevyApi.social.rejectFriendRequest(request.address)
            removeFriendRequest(request.address)
            store.dispatch(closeLastPopupAction())
            store.dispatch(
              pushPopupAction({
                type: HUD_POPUP_TYPE.FRIENDSHIP_RESULT,
                data: {
                  variant: 'rejected',
                  address: request.address,
                  name: request.name,
                  hasClaimedName: request.hasClaimedName
                }
              })
            )
          })
        }}
        onDismiss={() => {
          store.dispatch(closeLastPopupAction())
        }}
      />
    </PopupBackdrop>
  )
}

export const FriendRequestSentPopup: Popup = ({ shownPopup }) => {
  const request = shownPopup.data as FriendRequestData
  return (
    <PopupBackdrop>
      <FriendRequestPopupContent
        request={request}
        title="Friend Request Sent To"
        primaryLabel="CANCEL REQUEST"
        secondaryLabel="BACK"
        onPrimary={() => {
          store.dispatch(closeLastPopupAction())
          showConfirmPopup({
            title: `Are you sure you want to cancel the friend request to <b>${request.name}</b>?`,
            icon: {
              spriteName: 'CloseIcon',
              atlasName: 'icons',
              backgroundColor: COLOR.BUTTON_PRIMARY
            },
            confirmLabel: 'CANCEL REQUEST',
            cancelLabel: 'BACK',
            category: 'friendship',
            address: request.address,
            onConfirm: async () => {
              await BevyApi.social.cancelFriendRequest(request.address)
              removeFriendRequest(request.address)
              store.dispatch(
                pushPopupAction({
                  type: HUD_POPUP_TYPE.FRIENDSHIP_RESULT,
                  data: {
                    variant: 'canceled',
                    address: request.address,
                    name: request.name,
                    hasClaimedName: request.hasClaimedName
                  }
                })
              )
            }
          })
        }}
        onSecondary={() => {
          store.dispatch(closeLastPopupAction())
        }}
      />
    </PopupBackdrop>
  )
}

function FriendRequestPopupContent({
  request,
  title,
  primaryLabel,
  secondaryLabel,
  dismissLabel,
  onPrimary,
  onSecondary,
  onDismiss
}: {
  request: FriendRequestData
  title: string
  primaryLabel: string
  secondaryLabel: string
  dismissLabel?: string
  onPrimary: () => void
  onSecondary: () => void
  onDismiss?: () => void
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.BODY_S
  })
  const addressColor = request.hasClaimedName
    ? getAddressColor(request.address)
    : COLOR.TEXT_COLOR_LIGHT_GREY
  const avatarSize = fontSize * 4
  const mutualAvatarSize = fontSize * 2
  const [mutualFriends, setMutualFriends] = useState<FriendData[]>([])

  useEffect(() => {
    executeTask(async () => {
      const result = await BevyApi.social.getMutualFriends(request.address)
      setMutualFriends(result)
    })
  }, [])

  return (
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
          width: '100%',
          margin: { bottom: -fontSize * 0.5 }
        }}
        uiText={{
          value: formatRequestDate(request.createdAt),
          fontSize,
          color: COLOR.TEXT_COLOR_LIGHT_GREY,
          textAlign: 'top-left'
        }}
      />

      <UiEntity
        uiTransform={{
          width: '100%',
          margin: { bottom: fontSize }
        }}
        uiText={{
          value: `<b>${title}</b>`,
          fontSize: fontSizeTitle,
          color: COLOR.TEXT_COLOR_WHITE,
          textAlign: 'top-left'
        }}
      />

      <Row
        uiTransform={{
          width: '100%',
          alignItems: 'center',
          margin: { bottom: fontSize }
        }}
      >
        <AvatarCircle
          imageSrc={request.profilePictureUrl}
          userId={request.address}
          circleColor={addressColor}
          uiTransform={{
            width: avatarSize,
            height: avatarSize,
            margin: { right: fontSize }
          }}
          isGuest={false}
        />
        <PlayerNameComponent
          name={request.name}
          address={request.address}
          hasClaimedName={request.hasClaimedName}
          fontSize={fontSize}
        />
      </Row>

      {mutualFriends.length > 0 ? (
        <Row
          uiTransform={{
            width: '100%',
            alignItems: 'center',
            margin: { bottom: fontSize }
          }}
        >
          {mutualFriends.slice(0, 10).map((friend) => (
            <AvatarCircle
              key={friend.address}
              imageSrc={friend.profilePictureUrl}
              userId={friend.address}
              circleColor={
                friend.hasClaimedName
                  ? getAddressColor(friend.address)
                  : COLOR.TEXT_COLOR_LIGHT_GREY
              }
              uiTransform={{
                width: mutualAvatarSize,
                height: mutualAvatarSize,
                margin: { right: -fontSize * 0.3 }
              }}
              isGuest={false}
            />
          ))}
          <UiEntity
            uiTransform={{ margin: { left: fontSize * 0.6 } }}
            uiText={{
              value: `${mutualFriends.length} Mutual`,
              fontSize: fontSizeSmall,
              color: COLOR.TEXT_COLOR_GREY
            }}
          />
        </Row>
      ) : null}

      {request.message ? (
        <UiEntity
          uiTransform={{
            width: '100%',
            margin: { bottom: fontSize }
          }}
          uiText={{
            value: request.message,
            fontSize,
            color: COLOR.TEXT_COLOR_LIGHT_GREY,
            textWrap: 'wrap'
          }}
        />
      ) : null}

      <Row
        uiTransform={{
          width: '100%',
          justifyContent: 'center',
          margin: { bottom: dismissLabel ? fontSize : 0 }
        }}
      >
        <PanelListButton variant="secondary" onMouseDown={onSecondary}>
          <UiEntity
            uiText={{
              value: `<b>${secondaryLabel}</b>`,
              fontSize,
              color: COLOR.TEXT_COLOR_WHITE
            }}
            uiTransform={{ margin: { left: fontSize, right: fontSize } }}
          />
        </PanelListButton>
        <PanelListButton variant="primary" onMouseDown={onPrimary}>
          <UiEntity
            uiText={{
              value: `<b>${primaryLabel}</b>`,
              fontSize,
              color: COLOR.TEXT_COLOR_WHITE
            }}
            uiTransform={{ margin: { left: fontSize, right: fontSize } }}
          />
        </PanelListButton>
      </Row>

      {dismissLabel ? (
        <UiEntity
          uiTransform={{ margin: { bottom: fontSize * 0.5 } }}
          uiText={{
            value: dismissLabel,
            fontSize: fontSizeSmall,
            color: COLOR.TEXT_COLOR_GREY
          }}
          onMouseDown={onDismiss}
        />
      ) : null}
    </Column>
  )
}
