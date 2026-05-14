import type { Popup } from '../../../components/popup-stack'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import {
  LayoutContext,
  useLayoutContext
} from '../../../service/layout-context'
import { BORDER_RADIUS_F } from '../../../utils/ui-utils'
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
import { Column, Row } from '../../../components/layout'
import { applyMiddleEllipsis } from '../../../utils/urn-utils'
import { CopyButton } from '../../../components/copy-button'
import { ButtonTextIcon } from '../../../components/button-text-icon'
import { BottomBorder } from '../../../components/bottom-border'
import { FriendButton } from '../../../components/friend-button'
import { BlockUserButton } from '../../../components/block-user-button'
import { MenuSection } from '../../../components/menu-section'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
import { showConfirmPopup } from '../../../components/confirm-popup'
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
import { fetchProfileData } from '../../../utils/passport-promise-utils'
import { composedUsersData } from '../chat-and-logs/named-users-data-service'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import {
  getViewportHeight,
  getViewportWidth
} from '../../../service/canvas-ratio'
import { getNameWithHashPostfix } from '../../../service/chat/chat-utils'
import { PopupBackdrop } from '../../../components/popup-backdrop'
import { FEATURES, getFeatureFlag } from '../../../service/feature-flags'
import { PlayerNameComponent } from '../../../components/player-name-component'
import {
  fetchInvitableCommunities,
  inviteUserToCommunity
} from '../../../service/community-invites-service'
import { type CommunityListItem } from '../../../service/communities-types'

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
    <LayoutContext.Provider value={CONTEXT.SIDE}>
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
    </LayoutContext.Provider>
  )
}

function ProfileContent({
  data
}: {
  data: { align?: string; player?: GetPlayerDataRes }
}): ReactElement | null {
  const fontSize = getFontSize({ context: useLayoutContext() })
  const width = fontSize * 18
  const player = data.player

  // Capture pointer-derived position once at mount so the popup doesn't
  // follow subsequent mouse movements. Y always uses the click-flip
  // (top/bottom anchor based on which half of the screen the click hit).
  // X depends on `align`: a defined side pins to a fixed corner;
  // otherwise we also flip X based on which half the click landed in,
  // so the popup always grows away from the nearest screen edge.
  const [position] = useState(() => {
    const { screenCoordinates } = PrimaryPointerInfo.get(engine.RootEntity)
    const clickX = screenCoordinates?.x ?? getViewportWidth() / 2
    const clickY = screenCoordinates?.y ?? getViewportHeight() / 2
    const isOnHalfBottomOfScreen = clickY > getViewportHeight() / 2

    const yAnchor = isOnHalfBottomOfScreen
      ? { bottom: getViewportHeight() - clickY }
      : { top: clickY }

    if (data.align === 'left') {
      return { left: 0 as const, ...yAnchor }
    }
    if (data.align === 'right') {
      return { right: 0 as const, ...yAnchor }
    }

    // No align: flip X based on which half the click landed in. Using
    // `left: clickX - width` (instead of `right: vpWidth - clickX`) lets
    // the popup grow leftward without needing extra viewport math here.
    const isOnHalfRightOfScreen = clickX > getViewportWidth() / 2
    const xAnchor = isOnHalfRightOfScreen
      ? { left: clickX - width }
      : { left: clickX }
    return { ...xAnchor, ...yAnchor }
  })

  useEffect(() => {
    if (!player) closeDialog()
  }, [])

  if (!player) return null
  return (
    <UiEntity
      uiTransform={{
        width,
        borderRadius: BORDER_RADIUS_F,
        borderWidth: 0,
        borderColor: COLOR.TEXT_COLOR,
        flexDirection: 'column',
        padding: fontSize,
        positionType: 'absolute',
        position
      }}
      onMouseDown={noop}
      uiBackground={{
        color: COLOR.BLACK_POPUP_BACKGROUND
      }}
    >
      <Column
        uiTransform={{
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
        <MenuSection align="left">
          <ViewPassportButton player={player} />
          {player.userId !== getPlayer()?.userId ? (
            <MentionButton player={player} />
          ) : null}
          {player.userId !== getPlayer()?.userId ? (
            <InviteToCommunityButton player={player} />
          ) : null}
          {player.userId !== getPlayer()?.userId &&
          getFeatureFlag(FEATURES.FRIENDS) ? (
            <BlockUserButton player={player} />
          ) : null}
          {player.userId !== getPlayer()?.userId ? (
            <ReportUserButton player={player} />
          ) : null}
        </MenuSection>
        {/* // TODO Exit / Sign out : OwnProfileButtons({player}) */}
      </Column>
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
  const fontSize = getFontSize({ context: CONTEXT.SIDE })
  const fontSizeTitleL = getFontSize({
    context: CONTEXT.SIDE,
    token: TYPOGRAPHY_TOKENS.TITLE_L
  })
  const fontSizeTitleM = getFontSize({
    context: CONTEXT.SIDE,
    token: TYPOGRAPHY_TOKENS.TITLE_M
  })
  return [
    <AvatarCircle
      userId={player.userId}
      circleColor={nameColor}
      uiTransform={{
        width: fontSize * 5.5,
        height: fontSize * 5.5,
        alignSelf: 'center'
      }}
      isGuest={player.isGuest}
    />,
    <Row
      uiTransform={{
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        margin: 0,
        padding: 0
      }}
    >
      <PlayerNameComponent
        uiTransform={{
          width: 'auto'
        }}
        name={player.name ?? ''}
        address={player.userId}
        hasClaimedName={hasClaimedName}
        fontSize={fontSizeTitleL}
      />
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
              justifyContent: 'center'
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
          ...(getFeatureFlag(FEATURES.FRIENDS) &&
          player.userId !== getPlayer()?.userId
            ? [<FriendButton player={player} />]
            : [])
        ]
      : [])
  ]
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

  return (
    <ButtonTextIcon
      key={'profile-button-message-' + player.userId}
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
    />
  )
}

function ViewPassportButton({
  player
}: {
  player: GetPlayerDataRes
}): ReactElement {
  return (
    <ButtonTextIcon
      key={'profile-button-passport-' + player.userId}
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
    />
  )
}

/**
 * Stub: there's no general report endpoint wired yet — surfaces a confirm
 * and logs the address. Replace `onConfirm` body when one is available.
 */
function ReportUserButton({
  player
}: {
  player: GetPlayerDataRes
}): ReactElement {
  return (
    <ButtonTextIcon
      key={'profile-button-report-' + player.userId}
      variant="transparent"
      destructiveHover={true}
      value={'<b>Report</b>'}
      onMouseDown={() => {
        closeDialog()
        showConfirmPopup({
          title: `Report <b>${player.name}</b>?`,
          message:
            'Reports help moderators take action against users that break Decentraland Community Guidelines.',
          icon: {
            spriteName: 'Warning',
            atlasName: 'icons',
            backgroundColor: COLOR.BUTTON_PRIMARY
          },
          confirmLabel: 'REPORT',
          onConfirm: async () => {
            await Promise.resolve()
            console.log('[profile] report submitted (stub)', {
              address: player.userId
            })
          }
        })
      }}
      icon={{
        atlasName: 'icons',
        spriteName: 'Warning'
      }}
    />
  )
}

function closeDialog(): void {
  store.dispatch(closeLastPopupAction())
}

/**
 * Shows a "Invite to Community" item when the current user is owner or
 * moderator of at least one community. Clicking expands a submenu to the
 * LEFT of the profile popup listing those communities; clicking a name
 * fires the invite and closes everything (toast confirms).
 *
 * Mirrors the same widget used in passport-popup so a click in either
 * surface yields the same outcome.
 */
function InviteToCommunityButton({
  player
}: {
  player: GetPlayerDataRes
}): ReactElement | null {
  const [communities, setCommunities] = useState<CommunityListItem[]>([])
  const [submenuOpen, setSubmenuOpen] = useState<boolean>(false)
  const fontSize = getFontSize({ context: CONTEXT.SIDE })

  useEffect(() => {
    executeTask(async () => {
      setCommunities(await fetchInvitableCommunities())
    })
  }, [])

  if (communities.length === 0) return null

  const onPick = (c: CommunityListItem): void => {
    setSubmenuOpen(false)
    executeTask(async () => {
      await inviteUserToCommunity(c, player.userId)
      closeDialog()
    })
  }

  return (
    <UiEntity
      uiTransform={{ flexDirection: 'column', positionType: 'relative' }}
    >
      <ButtonTextIcon
        key={'profile-button-invite-' + player.userId}
        value={'<b>Invite to Community</b>'}
        onMouseDown={() => {
          setSubmenuOpen(!submenuOpen)
        }}
        icon={{
          atlasName: 'icons',
          spriteName: 'Members'
        }}
      />
      {submenuOpen && (
        <UiEntity
          uiTransform={{
            positionType: 'absolute',
            position: { top: 0, right: '100%' },
            margin: { right: fontSize * 0.3 },
            flexDirection: 'column',
            padding: fontSize * 0.3,
            borderRadius: fontSize / 2,
            zIndex: 11
          }}
          uiBackground={{ color: COLOR.BLACK_POPUP_BACKGROUND }}
        >
          {communities.map((c) => (
            <ButtonTextIcon
              key={'invite-pick-' + c.id}
              value={`<b>${c.name}</b>`}
              onMouseDown={() => {
                onPick(c)
              }}
            />
          ))}
        </UiEntity>
      )}
    </UiEntity>
  )
}
