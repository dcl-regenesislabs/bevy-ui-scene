import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { type UiTransformProps } from '@dcl/sdk/react-ecs'
import { engine, executeTask, PrimaryPointerInfo } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { type Popup } from '../../../components/popup-stack'
import { PopupBackdrop } from '../../../components/popup-backdrop'
import { COLOR } from '../../../components/color-palette'
import { Row } from '../../../components/layout'
import { AvatarCircle } from '../../../components/avatar-circle'
import { BottomBorder } from '../../../components/bottom-border'
import { ButtonTextIcon } from '../../../components/button-text-icon'
import { CopyButton } from '../../../components/copy-button'
import { PlayerNameComponent } from '../../../components/player-name-component'
import { showConfirmPopup } from '../../../components/confirm-popup'
import { store } from '../../../state/store'
import {
  closeLastPopupAction,
  pushPopupAction
} from '../../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
import { BORDER_RADIUS_F } from '../../../utils/ui-utils'
import { noop } from '../../../utils/function-utils'
import { applyMiddleEllipsis } from '../../../utils/urn-utils'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getAddressColor } from '../../main-hud/chat-and-logs/ColorByAddress'
import { BevyApi } from '../../../bevy-api'
import { notifyCommunitiesChanged } from '../../../service/communities-events'
import {
  banMember,
  kickMember,
  setMemberRole
} from '../../../utils/communities-promise-utils'
import {
  type CommunityMember,
  type CommunityMemberRole
} from '../../../service/communities-types'
import useEffect = ReactEcs.useEffect
import useState = ReactEcs.useState

export type CommunityMemberMenuData = {
  member: CommunityMember
  /** Role of the user opening the menu, in this community. */
  viewerRole: CommunityMemberRole
  communityId: string
}

export const CommunityMemberMenuPopup: Popup = ({ shownPopup }) => {
  return (
    <PopupBackdrop>
      <CommunityMemberMenuContent
        data={shownPopup.data as CommunityMemberMenuData}
      />
    </PopupBackdrop>
  )
}

function CommunityMemberMenuContent({
  data
}: {
  data: CommunityMemberMenuData
}): ReactElement | null {
  const { member, viewerRole, communityId } = data
  const width = getContentScaleRatio() * 800
  const [coords, setCoords] = useState({ x: 0, y: 0 })

  // Anchor near the click position, mirroring ProfileMenuPopup behavior.
  useEffect(() => {
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
        ? (screenCoordinates?.y ?? 0) - getContentScaleRatio() * 600
        : screenCoordinates?.y ?? 0
    })
  }, [])

  if (coords.x === 0) return null

  const myAddress = (getPlayer()?.userId ?? '').toLowerCase()
  const isSelf = member.memberAddress.toLowerCase() === myAddress
  const isOwner = viewerRole === 'owner'
  const isModerator = viewerRole === 'moderator'
  const targetIsOwner = member.role === 'owner'
  const targetIsModerator = member.role === 'moderator'

  // Owner-only role mutations. The backend won't let mods promote/demote.
  const canPromote = isOwner && member.role === 'member' && !isSelf
  const canDemote = isOwner && targetIsModerator && !isSelf
  const canTransferOwnership =
    isOwner && !isSelf && !targetIsOwner && member.hasClaimedName
  // Owner removes/bans anyone but themselves; moderators only members.
  const canRemove =
    !isSelf &&
    !targetIsOwner &&
    (isOwner || (isModerator && !targetIsModerator))
  const canBan = canRemove

  return (
    <UiEntity
      uiTransform={{
        width,
        borderRadius: BORDER_RADIUS_F,
        borderWidth: 0,
        flexDirection: 'column',
        padding: 0,
        positionType: 'absolute',
        position: { left: coords.x, top: coords.y }
      }}
      onMouseDown={noop}
      uiBackground={{ color: COLOR.BLACK_POPUP_BACKGROUND }}
    >
      <UiEntity
        uiTransform={{
          flexDirection: 'column',
          width: '100%',
          margin: { top: '5%' }
        }}
      >
        <MemberHeader member={member} />

        <Divider />

        {!isSelf && <ViewProfileButton member={member} />}

        {(canPromote || canDemote || canTransferOwnership) && <Divider />}
        {canPromote && (
          <PromoteModeratorButton
            member={member}
            communityId={communityId}
          />
        )}
        {canDemote && (
          <DemoteModeratorButton member={member} communityId={communityId} />
        )}
        {canTransferOwnership && (
          <TransferOwnershipButton
            member={member}
            communityId={communityId}
          />
        )}

        {(canRemove || canBan) && <Divider />}
        {canRemove && (
          <RemoveMemberButton member={member} communityId={communityId} />
        )}
        {canBan && (
          <BanMemberButton member={member} communityId={communityId} />
        )}

        {!isSelf && <Divider />}
        {!isSelf && <BlockUserButton member={member} />}
        {!isSelf && <ReportUserButton member={member} />}
      </UiEntity>
    </UiEntity>
  )
}

function MemberHeader({ member }: { member: CommunityMember }): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitleM = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_M
  })
  const fontSizeTitleL = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_L
  })
  const addressColor = member.hasClaimedName
    ? getAddressColor(member.memberAddress)
    : COLOR.TEXT_COLOR_LIGHT_GREY
  const avatarSize = fontSize * 5
  return (
    <Row
      uiTransform={{
        width: '100%',
        padding: { left: '5%', right: '5%' },
        alignItems: 'center'
      }}
    >
      <AvatarCircle
        imageSrc={member.profilePictureUrl}
        userId={member.memberAddress}
        circleColor={addressColor}
        uiTransform={{
          width: avatarSize,
          height: avatarSize,
          margin: { right: fontSize }
        }}
        isGuest={false}
      />
      <UiEntity uiTransform={{ flexDirection: 'column', flexGrow: 1 }}>
        <PlayerNameComponent
          name={member.name}
          address={member.memberAddress}
          hasClaimedName={member.hasClaimedName}
          fontSize={fontSizeTitleL}
        />
        <Row uiTransform={{ alignItems: 'center' }}>
          <UiEntity
            uiText={{
              value: applyMiddleEllipsis(member.memberAddress),
              color: COLOR.TEXT_COLOR_LIGHT_GREY,
              fontSize: fontSizeTitleM
            }}
          />
          <CopyButton
            fontSize={fontSizeTitleL}
            text={member.memberAddress}
            elementId={'copy-member-' + member.memberAddress}
            uiTransform={{ margin: { left: 0 } }}
          />
        </Row>
      </UiEntity>
    </Row>
  )
}

function Divider(): ReactElement {
  return (
    <Row uiTransform={{ margin: { top: '3%' } }}>
      <BottomBorder
        color={COLOR.WHITE_OPACITY_1}
        uiTransform={{ height: 1 }}
      />
    </Row>
  )
}

const ROW_BUTTON_TRANSFORM: UiTransformProps = {
  width: '90%',
  height: getContentScaleRatio() * 64,
  justifyContent: 'flex-start',
  alignSelf: 'center',
  borderWidth: 0,
  margin: { top: '1%' },
  padding: { left: '4%' }
}

function MenuButton({
  label,
  iconName,
  iconAtlas = 'icons',
  color = COLOR.WHITE,
  onMouseDown
}: {
  label: string
  iconName: string
  iconAtlas?: 'icons' | 'context'
  color?: typeof COLOR.WHITE
  onMouseDown: () => void
}): ReactElement {
  const fontSize = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.BODY
  })
  return (
    <ButtonTextIcon
      uiTransform={ROW_BUTTON_TRANSFORM}
      icon={{ atlasName: iconAtlas, spriteName: iconName }}
      iconSize={fontSize}
      iconColor={color}
      fontColor={color}
      fontSize={fontSize}
      value={`<b>${label}</b>`}
      backgroundColor={COLOR.BLACK_TRANSPARENT}
      onMouseDown={onMouseDown}
    />
  )
}

function closeMenu(): void {
  store.dispatch(closeLastPopupAction())
}

function ViewProfileButton({
  member
}: {
  member: CommunityMember
}): ReactElement {
  return (
    <MenuButton
      label="View Profile"
      iconName="PassportIcon"
      onMouseDown={() => {
        closeMenu()
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.PASSPORT,
            data: member.memberAddress.toLowerCase()
          })
        )
      }}
    />
  )
}

function PromoteModeratorButton({
  member,
  communityId
}: {
  member: CommunityMember
  communityId: string
}): ReactElement {
  return (
    <MenuButton
      label="Promote Moderator"
      iconName="OperatorIcon"
      onMouseDown={() => {
        closeMenu()
        showConfirmPopup({
          title: `Promote <b>${member.name}</b> to moderator?`,
          message:
            'Moderators can manage members, posts and places in this community.',
          icon: {
            spriteName: 'OperatorIcon',
            atlasName: 'icons',
            backgroundColor: COLOR.BUTTON_PRIMARY
          },
          confirmLabel: 'PROMOTE',
          onConfirm: async () => {
            await setMemberRole(communityId, member.memberAddress, 'moderator')
            notifyCommunitiesChanged()
          }
        })
      }}
    />
  )
}

function DemoteModeratorButton({
  member,
  communityId
}: {
  member: CommunityMember
  communityId: string
}): ReactElement {
  return (
    <MenuButton
      label="Demote Moderator"
      iconName="OperatorIcon"
      onMouseDown={() => {
        closeMenu()
        showConfirmPopup({
          title: `Demote <b>${member.name}</b> to member?`,
          icon: {
            spriteName: 'OperatorIcon',
            atlasName: 'icons',
            backgroundColor: COLOR.BUTTON_PRIMARY
          },
          confirmLabel: 'DEMOTE',
          onConfirm: async () => {
            await setMemberRole(communityId, member.memberAddress, 'member')
            notifyCommunitiesChanged()
          }
        })
      }}
    />
  )
}

function TransferOwnershipButton({
  member,
  communityId
}: {
  member: CommunityMember
  communityId: string
}): ReactElement {
  return (
    <MenuButton
      label="Make Community Owner"
      iconName="OwnerIcon"
      onMouseDown={() => {
        closeMenu()
        showConfirmPopup({
          title: `Transfer ownership to <b>${member.name}</b>?`,
          message:
            'You will become a regular member. This action cannot be undone.',
          icon: {
            spriteName: 'OwnerIcon',
            atlasName: 'icons',
            backgroundColor: COLOR.BUTTON_PRIMARY
          },
          confirmLabel: 'TRANSFER',
          onConfirm: async () => {
            await setMemberRole(communityId, member.memberAddress, 'owner')
            notifyCommunitiesChanged()
          }
        })
      }}
    />
  )
}

function RemoveMemberButton({
  member,
  communityId
}: {
  member: CommunityMember
  communityId: string
}): ReactElement {
  return (
    <MenuButton
      label="Remove Member"
      iconName="LogoutIcon"
      onMouseDown={() => {
        closeMenu()
        showConfirmPopup({
          title: `Remove <b>${member.name}</b> from the community?`,
          message: 'They will be able to re-join unless you also ban them.',
          icon: {
            spriteName: 'LogoutIcon',
            atlasName: 'icons',
            backgroundColor: COLOR.BUTTON_PRIMARY
          },
          confirmLabel: 'REMOVE',
          onConfirm: async () => {
            await kickMember(communityId, member.memberAddress)
            notifyCommunitiesChanged()
          }
        })
      }}
    />
  )
}

function BanMemberButton({
  member,
  communityId
}: {
  member: CommunityMember
  communityId: string
}): ReactElement {
  return (
    <MenuButton
      label="Ban"
      iconName="BlockUser"
      color={COLOR.BUTTON_PRIMARY}
      onMouseDown={() => {
        closeMenu()
        showConfirmPopup({
          title: `Ban <b>${member.name}</b> from the community?`,
          message: "They won't be able to re-join unless you unban them.",
          icon: {
            spriteName: 'BlockUser',
            atlasName: 'icons',
            backgroundColor: COLOR.BUTTON_PRIMARY
          },
          confirmLabel: 'BAN',
          onConfirm: async () => {
            await banMember(communityId, member.memberAddress)
            notifyCommunitiesChanged()
          }
        })
      }}
    />
  )
}

function BlockUserButton({
  member
}: {
  member: CommunityMember
}): ReactElement {
  return (
    <MenuButton
      label="Block"
      iconName="BlockUser"
      color={COLOR.BUTTON_PRIMARY}
      onMouseDown={() => {
        closeMenu()
        showConfirmPopup({
          title: `Are you sure you want to block\n<b>${member.name}</b>?`,
          message:
            "If you block someone in Decentraland, you will no longer see their avatar in-world, and you will not be able to send friend requests or messages to each other. You will also not see each other's names or messages in public chats.",
          icon: {
            spriteName: 'BlockUser',
            atlasName: 'icons',
            backgroundColor: COLOR.RED
          },
          confirmLabel: 'BLOCK',
          onConfirm: async () => {
            await BevyApi.social.blockUser(member.memberAddress)
          }
        })
      }}
    />
  )
}

/**
 * Report stub. There's no community-scoped report endpoint yet (verified
 * against unity-explorer's CommunitiesDataProvider). For now we open a
 * confirm and surface a "Thanks, your report was submitted" toast on
 * confirm — wire to a real endpoint when one exists.
 */
function ReportUserButton({
  member
}: {
  member: CommunityMember
}): ReactElement {
  return (
    <MenuButton
      label="Report"
      iconName="Warning"
      color={COLOR.BUTTON_PRIMARY}
      onMouseDown={() => {
        closeMenu()
        showConfirmPopup({
          title: `Report <b>${member.name}</b>?`,
          message:
            'Reports help moderators take action against users that break Decentraland Community Guidelines.',
          icon: {
            spriteName: 'Warning',
            atlasName: 'icons',
            backgroundColor: COLOR.BUTTON_PRIMARY
          },
          confirmLabel: 'REPORT',
          onConfirm: async () => {
            // TODO wire to a real report endpoint when available.
            executeTask(async () => {
              await Promise.resolve()
              console.log('[community] report submitted (stub)', {
                address: member.memberAddress
              })
            })
          }
        })
      }}
    />
  )
}
