import type { Popup } from '../../../components/popup-stack'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import {
  BORDER_RADIUS_F,
  getBackgroundFromAtlas
} from '../../../utils/ui-utils'
import { noop, setIfNot } from '../../../utils/function-utils'
import { store } from '../../../state/store'
import {
  closeLastPopupAction,
  pushPopupAction,
  updateHudStateAction
} from '../../../state/hud/actions'
import { AvatarCircle } from '../../../components/avatar-circle'
import { getPlayer } from '@dcl/sdk/src/players'
import { getAddressColor } from '../chat-and-logs/ColorByAddress'
import { Row } from '../../../components/layout'
import { applyMiddleEllipsis } from '../../../utils/urn-utils'
import { CopyButton } from '../../../components/copy-button'
import { ButtonTextIcon } from '../../../components/button-text-icon'
import { BottomBorder } from '../../../components/bottom-border'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
import { type GetPlayerDataRes } from '../../../utils/definitions'
import { createOrGetAvatarsTracker } from '../../../service/avatar-tracker'
import {
  engine,
  executeTask,
  PointerLock,
  PrimaryPointerInfo
} from '@dcl/sdk/ecs'
import useEffect = ReactEcs.useEffect
import useState = ReactEcs.useState
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { fetchProfileData } from '../../../utils/passport-promise-utils'
import { composedUsersData } from '../chat-and-logs/named-users-data-service'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getNameWithHashPostfix } from '../../../service/chat/chat-utils'
import { PopupBackdrop } from '../../../components/popup-backdrop'
import { BevyApi } from '../../../bevy-api'
import Icon from '../../../components/icon/Icon'
import { FEATURES, getFeatureFlag } from '../../../service/feature-flags'

export function setupProfilePopups(): void {
  const avatarTracker = createOrGetAvatarsTracker()
  avatarTracker.onClick((userId) => {
    if (!getPlayer({ userId })?.isGuest) {
      if (avatarTracker.isProfileBlocked(userId)) return

      PointerLock.getMutable(engine.CameraEntity).isPointerLocked = false
      store.dispatch(
        pushPopupAction({
          type: HUD_POPUP_TYPE.PROFILE_MENU,
          data: { player: getPlayer({ userId }) }
        })
      )
    }
  })
}

export const ProfileMenuPopup: Popup = ({ shownPopup }) => {
  return (
    <PopupBackdrop>
      <ProfileContent
        data={
          shownPopup.data as {
            align: string
            userId: string
          }
        }
      />
    </PopupBackdrop>
  )
}

function ProfileContent({
  data
}: {
  data: { align?: string; player?: GetPlayerDataRes }
}): ReactElement | null {
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const width = getContentScaleRatio() * 800
  const player = data.player
  useEffect(() => {
    if (!player) {
      closeDialog()
      return
    }
    if (data.align === 'left') {
      setCoords({
        x: store.getState().viewport.width * 0.045,
        y: store.getState().viewport.height * 0.018
      })
    } else if (data.align === 'right') {
      setCoords({
        x:
          store.getState().viewport.width -
          width -
          store.getState().viewport.width * 0.01,
        y: store.getState().viewport.height * 0.07
      })
    } else {
      const { screenCoordinates } = PrimaryPointerInfo.get(engine.RootEntity)
      const isOnHalfRightOfScreen =
        (screenCoordinates?.x ?? 0) > store.getState().viewport.width / 2
      const isOnHalfBottomOfScreen =
        (screenCoordinates?.y ?? 0) > store.getState().viewport.height / 2

      setCoords({
        x: isOnHalfRightOfScreen
          ? (screenCoordinates?.x ?? 0) - width
          : screenCoordinates?.x ?? 0,
        y: isOnHalfBottomOfScreen
          ? (screenCoordinates?.y ?? 0) - getContentScaleRatio() * 400
          : screenCoordinates?.y ?? 0
      })
    }
  }, [])

  if (!player || coords.x === 0) return null
  return (
    <UiEntity
      uiTransform={{
        width,
        borderRadius: BORDER_RADIUS_F,
        borderWidth: 0,
        borderColor: COLOR.TEXT_COLOR,
        flexDirection: 'column',
        padding: 0,
        positionType: 'absolute',
        position: {
          left: coords.x,
          top: coords.y
        }
      }}
      onMouseDown={noop}
      uiBackground={{
        color: COLOR.BLACK_POPUP_BACKGROUND
      }}
    >
      <UiEntity
        uiTransform={{
          flexDirection: 'column',
          width: '100%',
          margin: { top: '5%' }
        }}
      >
        {ProfileHeader({ player })}
        <Row uiTransform={{ margin: { top: '5%' } }}>
          <BottomBorder
            color={COLOR.WHITE_OPACITY_1}
            uiTransform={{ height: 1 }}
          />
        </Row>
        <ViewPassportButton player={player} />
        {player.userId !== getPlayer()?.userId ? (
          <MentionButton player={player} />
        ) : null}
        {player.userId !== getPlayer()?.userId &&
        getFeatureFlag(FEATURES.FRIENDS) ? (
          <BlockUserButton player={player} />
        ) : null}
        {/* // TODO Exit / Sign out : OwnProfileButtons({player}) */}
      </UiEntity>
    </UiEntity>
  )
}

function ProfileHeader({
  player
}: {
  player: GetPlayerDataRes
}): ReactElement[] {
  const hasClaimedName = !!(player.name?.length && !player.name?.includes('#'))
  const nameColor = hasClaimedName
    ? getAddressColor(player.userId)
    : COLOR.TEXT_COLOR_LIGHT_GREY
  const fontSizeTitleL = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_L
  })
  const fontSizeTitleM = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_M
  })
  return [
    <AvatarCircle
      userId={player.userId}
      circleColor={nameColor}
      uiTransform={{
        width: getContentScaleRatio() * 200,
        height: getContentScaleRatio() * 200,
        alignSelf: 'center'
      }}
      isGuest={player.isGuest}
    />,
    <Row
      uiTransform={{
        justifyContent: 'center',
        width: '100%',
        margin: 0,
        padding: 0
      }}
    >
      <UiEntity
        uiTransform={{ margin: 0, padding: 0 }}
        uiText={{
          value: `<b>${player.name}</b>`,
          color: nameColor,
          fontSize: fontSizeTitleL
        }}
      />
      {hasClaimedName && (
        <UiEntity
          uiTransform={{
            width: getContentScaleRatio() * 50,
            height: getContentScaleRatio() * 50,
            flexShrink: 0,
            alignSelf: 'center'
          }}
          uiBackground={getBackgroundFromAtlas({
            atlasName: 'icons',
            spriteName: 'Verified'
          })}
        />
      )}
      <CopyButton
        fontSize={fontSizeTitleL}
        text={player.name}
        elementId={'copy-profile-name-' + player.userId}
        uiTransform={{
          margin: { left: 0 }
        }}
      />
    </Row>,
    ...(!player.isGuest
      ? [
          <Row
            key={1}
            uiTransform={{
              justifyContent: 'center',
              height: getContentScaleRatio() * 36
            }}
          >
            <UiEntity
              uiText={{
                value: applyMiddleEllipsis(player.userId),
                color: COLOR.TEXT_COLOR_LIGHT_GREY,
                fontSize: fontSizeTitleM
              }}
            />
            <CopyButton
              fontSize={fontSizeTitleL}
              text={player.userId}
              elementId={'copy-profile-address-' + player.userId}
              uiTransform={{
                margin: { left: 0 }
              }}
            />
          </Row>,
          ...(getFeatureFlag(FEATURES.FRIENDS)
            ? [<FriendButton player={player} fontSize={fontSizeTitleL} />]
            : [])
        ]
      : [])
  ]
}

const PROFILE_BUTTON_TRANSFORM: UiTransformProps = {
  width: '80%',
  height: getContentScaleRatio() * 64,
  justifyContent: 'flex-start',
  alignSelf: 'center'
}
function MentionButton({ player }: { player: GetPlayerDataRes }): ReactElement {
  useEffect(() => {
    executeTask(async () => {
      const userData = setIfNot(composedUsersData).get(player.userId)
      userData.playerData = userData.playerData ?? player
      userData.profileData =
        userData.profileData ??
        (await fetchProfileData({ userId: player.userId, useCache: true }))
    })
  }, [])
  const fontSizeTitleL = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_L
  })

  return (
    <ButtonTextIcon
      key={'profile-button-message-' + player.userId}
      uiTransform={PROFILE_BUTTON_TRANSFORM}
      value={'<b>Mention</b>'}
      onMouseDown={() => {
        executeTask(async () => {
          closeDialog()
          const nameToRender = composedUsersData.get(player.userId)?.profileData
            ?.avatars[0].hasClaimedName
            ? `${player.name}`
            : `${getNameWithHashPostfix(player.name, player.userId)}`
          store.dispatch(
            updateHudStateAction({
              chatInput: store.getState().hud.chatInput + ` @${nameToRender} `,
              chatOpen: true,
              friendsOpen: false
            })
          )
        })
      }}
      icon={{
        atlasName: 'icons',
        spriteName: '@'
      }}
      fontSize={fontSizeTitleL}
    />
  )
}

function ViewPassportButton({
  player
}: {
  player: GetPlayerDataRes
}): ReactElement {
  const fontSizeTitleL = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_L
  })
  return (
    <ButtonTextIcon
      key={'profile-button-passport-' + player.userId}
      uiTransform={PROFILE_BUTTON_TRANSFORM}
      value={'<b>View Passport</b>'}
      onMouseDown={() => {
        closeDialog()
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.PASSPORT,
            data: player.userId
          })
        )
      }}
      icon={{
        atlasName: 'icons',
        spriteName: 'PassportIcon'
      }}
      fontSize={fontSizeTitleL}
    />
  )
}

function FriendButton({
  player,
  fontSize
}: {
  player: GetPlayerDataRes
  fontSize: number
}): ReactElement {
  const [isFriend, setIsFriend] = useState<boolean>(false)
  const [isHovered, setIsHovered] = useState<boolean>(false)

  useEffect(() => {
    if (!getFeatureFlag(FEATURES.FRIENDS)) return
    executeTask(async () => {
      const friends = await BevyApi.social.getFriends()
      setIsFriend(
        friends.some(
          (f) => f.address.toLowerCase() === player.userId.toLowerCase()
        )
      )
    })
  }, [])

  if (isFriend) {
    return (
      <UiEntity
        uiTransform={{
          width: '80%',
          borderColor: isHovered ? COLOR.RED : COLOR.WHITE_OPACITY_1,
          borderWidth: getContentScaleRatio() * 6,
          borderRadius: getContentScaleRatio() * 20,
          alignSelf: 'center',
          margin: { top: '4%' },
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row'
        }}
        onMouseEnter={() => {
          setIsHovered(true)
        }}
        onMouseLeave={() => {
          setIsHovered(false)
        }}
        onMouseDown={() => {
          store.dispatch(
            pushPopupAction({
              type: HUD_POPUP_TYPE.CONFIRM_UNFRIEND,
              data: {
                address: player.userId,
                name: player.name,
                hasClaimedName: !!(
                  player.name?.length && !player.name?.includes('#')
                )
              }
            })
          )
        }}
      >
        <Icon
          iconSize={fontSize}
          icon={{
            atlasName: isHovered ? 'context' : 'icons',
            spriteName: isHovered ? 'Unfriends' : 'FriendIcon'
          }}
          iconColor={isHovered ? COLOR.RED : undefined}
        />
        <UiEntity
          uiText={{
            value: isHovered ? '<b>Remove Friend</b>' : '<b>Friend</b>',
            fontSize,
            color: isHovered ? COLOR.RED : COLOR.WHITE
          }}
        />
      </UiEntity>
    )
  }

  return (
    <UiEntity
      uiTransform={{
        width: '80%',
        borderColor: COLOR.WHITE_OPACITY_1,
        borderWidth: getContentScaleRatio() * 6,
        borderRadius: getContentScaleRatio() * 20,
        alignSelf: 'center',
        margin: { top: '4%' },
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
      }}
      onMouseDown={() => {
        closeDialog()
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.SEND_FRIEND_REQUEST,
            data: {
              address: player.userId,
              name: player.name,
              hasClaimedName: !!(
                player.name?.length && !player.name?.includes('#')
              ),
              profilePictureUrl: ''
            }
          })
        )
      }}
    >
      <Icon
        iconSize={fontSize}
        icon={{ atlasName: 'context', spriteName: 'Add' }}
      />
      <UiEntity
        uiText={{
          value: '<b>Add Friend</b>',
          fontSize,
          color: COLOR.WHITE
        }}
      />
    </UiEntity>
  )
}

function BlockUserButton({
  player
}: {
  player: GetPlayerDataRes
}): ReactElement {
  const fontSizeTitleL = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_L
  })
  const hasClaimedName = !!(player.name?.length && !player.name?.includes('#'))

  return (
    <ButtonTextIcon
      key={'profile-button-block-' + player.userId}
      uiTransform={PROFILE_BUTTON_TRANSFORM}
      value={'<b>Block User</b>'}
      onMouseDown={() => {
        closeDialog()
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.CONFIRM_BLOCK,
            data: {
              address: player.userId,
              name: player.name,
              hasClaimedName
            }
          })
        )
      }}
      icon={{
        atlasName: 'icons',
        spriteName: 'BlockUser'
      }}
      fontSize={fontSizeTitleL}
    />
  )
}

function closeDialog(): void {
  store.dispatch(closeLastPopupAction())
}
