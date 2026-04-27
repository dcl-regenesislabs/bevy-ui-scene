import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import {
  type CommunityInviteEntry,
  type CommunityMember,
  type CommunityMemberRole,
  CommunityFriendshipStatus
} from '../../../service/communities-types'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { executeTask } from '@dcl/sdk/ecs'
import {
  fetchCommunityBans,
  fetchCommunityInvites,
  fetchCommunityMembers,
  manageInviteRequest,
  unbanMember
} from '../../../utils/communities-promise-utils'
import {
  listenCommunitiesChanged,
  notifyCommunitiesChanged
} from '../../../service/communities-events'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import { AvatarCircle } from '../../../components/avatar-circle'
import { PlayerNameComponent } from '../../../components/player-name-component'
import { getAddressColor } from '../../main-hud/chat-and-logs/ColorByAddress'
import Icon from '../../../components/icon/Icon'
import { ThinMenuButton } from '../../../components/thin-menu-button'
import { BevyApi } from '../../../bevy-api'
import { getPlayer } from '@dcl/sdk/players'
import { store } from '../../../state/store'
import { pushPopupAction } from '../../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
import { showErrorPopup } from '../../../service/error-popup-service'
import { getLoadingAlphaValue } from '../../../service/loading-alpha-color'
import { showConfirmPopup } from '../../../components/confirm-popup'
import { NavButton } from '../../../components/nav-button/NavButton'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

function roleBadgeLabel(role: string): string | null {
  if (role === 'owner') return 'Owner'
  if (role === 'moderator') return 'Moderator'
  return null
}

function CommunityMemberItem({
  member,
  viewerRole,
  communityId
}: {
  member: CommunityMember
  viewerRole: CommunityMemberRole
  communityId: string
  key: string
}): ReactElement {
  const fontSize = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.BODY
  })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.CAPTION
  })
  const addressColor =
    member.hasClaimedName && member.memberAddress
      ? getAddressColor(member.memberAddress.toLowerCase())
      : COLOR.TEXT_COLOR_LIGHT_GREY
  const badge = roleBadgeLabel(member.role)
  const avatarSize = fontSize * 2.5

  const [friendshipStatus, setFriendshipStatus] = useState<
    CommunityFriendshipStatus | undefined
  >(member.friendshipStatus)
  const [acting, setActing] = useState<boolean>(false)
  const isSelf =
    (getPlayer()?.userId ?? '').toLowerCase() ===
    member.memberAddress.toLowerCase()

  const onAccept = (): void => {
    if (acting) return
    const previous = friendshipStatus
    // Optimistic: mark as friend so the button disappears.
    setFriendshipStatus(CommunityFriendshipStatus.FRIEND)
    setActing(true)
    executeTask(async () => {
      try {
        await BevyApi.social.acceptFriendRequest(member.memberAddress)
        // Mutate the shared object so the members cache stays consistent.
        member.friendshipStatus = CommunityFriendshipStatus.FRIEND
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.FRIENDSHIP_RESULT,
            data: {
              variant: 'accepted',
              address: member.memberAddress,
              name: member.name,
              hasClaimedName: member.hasClaimedName
            }
          })
        )
      } catch (error) {
        setFriendshipStatus(previous)
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          'acceptFriendRequest'
        )
      } finally {
        setActing(false)
      }
    })
  }

  const onAddFriend = (): void => {
    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.SEND_FRIEND_REQUEST,
        data: {
          address: member.memberAddress,
          name: member.name,
          hasClaimedName: member.hasClaimedName,
          profilePictureUrl: member.profilePictureUrl
        }
      })
    )
  }

  const openPassport = (): void => {
    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.PASSPORT,
        data: member.memberAddress.toLowerCase()
      })
    )
  }

  const openProfileMenu = (): void => {
    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.COMMUNITY_MEMBER_MENU,
        data: { member, viewerRole, communityId }
      })
    )
  }

  return (
    <Row
      uiTransform={{
        width: '42%',
        height: fontSize * 4,
        alignItems: 'center',
        padding: { left: fontSize, right: fontSize * 2 },
        margin: fontSize / 4,
        borderRadius: fontSize / 2
      }}
      uiBackground={{
        color: COLOR.DARK_OPACITY_5
      }}
      onMouseDown={openPassport}
    >
      {/* Avatar */}
      <AvatarCircle
        imageSrc={member.profilePictureUrl}
        userId={member.memberAddress}
        circleColor={addressColor}
        uiTransform={{
          width: avatarSize,
          height: avatarSize,
          flexShrink: 0
        }}
        isGuest={false}
      />

      {/* Name + role badge */}
      <Column
        uiTransform={{
          justifyContent: 'center',
          margin: { left: fontSize * 0.3 }
        }}
      >
        <PlayerNameComponent
          name={member.name}
          address={member.memberAddress}
          hasClaimedName={member.hasClaimedName}
          fontSize={fontSize}
        />
        {badge != null && (
          <UiEntity
            uiTransform={{
              borderRadius: fontSizeSmall / 2,
              alignSelf: 'flex-start',
              position: { top: -fontSizeSmall * 0.3, left: fontSizeSmall },
              padding: -fontSizeSmall / 4
            }}
            uiBackground={{ color: COLOR.WHITE_OPACITY_1 }}
            uiText={{
              value: badge,
              fontSize: fontSizeSmall,
              color: COLOR.WHITE
            }}
          />
        )}
      </Column>

      {/* Spacer */}
      <UiEntity uiTransform={{ flexGrow: 1 }} />

      {/* Action button — hidden when looking at our own row or when we're
          already friends. */}
      {!isSelf && friendshipStatus !== CommunityFriendshipStatus.FRIEND && (
        <UiEntity
          uiTransform={{
            borderRadius: fontSize / 2,
            height: fontSize * 2,
            padding: {
              left: fontSize * 0.5,
              right: fontSize * 0.6
            },
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            opacity: acting ? getLoadingAlphaValue() : 1
          }}
          uiBackground={{ color: COLOR.BUTTON_PRIMARY }}
          onMouseDown={
            friendshipStatus === CommunityFriendshipStatus.REQUEST_RECEIVED
              ? onAccept
              : onAddFriend
          }
        >
          <Icon
            icon={
              friendshipStatus === CommunityFriendshipStatus.REQUEST_RECEIVED
                ? { spriteName: 'Check', atlasName: 'icons' }
                : { spriteName: 'Add', atlasName: 'context' }
            }
            iconSize={fontSize}
            iconColor={COLOR.WHITE}
          />
          <UiEntity
            uiText={{
              value:
                friendshipStatus === CommunityFriendshipStatus.REQUEST_RECEIVED
                  ? '<b>ACCEPT FRIEND</b>'
                  : '<b>ADD FRIEND</b>',
              fontSize: fontSizeSmall,
              color: COLOR.WHITE,
              textWrap: 'nowrap'
            }}
          />
        </UiEntity>
      )}

      {/* Profile menu button */}
      <ThinMenuButton
        fontSize={fontSize}
        uiTransform={{ margin: { left: fontSize * 0.3 }, height: fontSize * 2 }}
        onMouseDown={openProfileMenu}
        backgroundColor={COLOR.WHITE_OPACITY_1}
      />
    </Row>
  )
}

/** Chunk an array into groups of `size`. */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

export function CommunityMembers({
  communityId,
  viewerRole
}: {
  communityId: string
  viewerRole: CommunityMemberRole
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })
  const isAdmin = viewerRole === 'owner' || viewerRole === 'moderator'
  const [activeSubTab, setActiveSubTab] = useState<number>(0)

  const SUBTABS = ['MEMBERS', 'INVITED', 'BANNED']

  return (
    <Column uiTransform={{ width: '100%' }}>
      {isAdmin && (
        <Row
          uiTransform={{
            width: '100%',
            margin: { bottom: fontSize },
            flexShrink: 0
          }}
        >
          {SUBTABS.map((label, i) => (
            <UiEntity key={label}>
              <NavButton
                text={label}
                active={activeSubTab === i}
                fontSize={fontSizeSmall}
                onClick={() => {
                  setActiveSubTab(i)
                }}
              />
            </UiEntity>
          ))}
        </Row>
      )}
      {activeSubTab === 0 && (
        <MembersList communityId={communityId} viewerRole={viewerRole} />
      )}
      {isAdmin && activeSubTab === 1 && (
        <InvitedList communityId={communityId} />
      )}
      {isAdmin && activeSubTab === 2 && (
        <BannedList communityId={communityId} />
      )}
    </Column>
  )
}

function MembersList({
  communityId,
  viewerRole
}: {
  communityId: string
  viewerRole: CommunityMemberRole
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const scale = getContentScaleRatio()
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const refetch = (): void => {
    executeTask(async () => {
      try {
        const result = await fetchCommunityMembers(communityId, { limit: 50 })
        // Sort: claimed-name members first; preserve original order otherwise.
        const sorted = [...(result.results ?? [])].sort((a, b) => {
          if (a.hasClaimedName === b.hasClaimedName) return 0
          return a.hasClaimedName ? -1 : 1
        })
        setMembers(sorted)
      } catch (error) {
        console.error('[communities] failed to load members', error)
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    refetch()
    // Re-fetch on any community-changed event (kick / ban / role change).
    const unsubscribe = listenCommunitiesChanged(refetch)
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <Column uiTransform={{ width: '100%' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Row
            key={i}
            uiTransform={{
              width: '100%',
              margin: { bottom: fontSize * 0.5 }
            }}
          >
            <UiEntity
              uiTransform={{
                width: '50%',
                height: scale * 70,
                padding: { right: fontSize * 0.3 }
              }}
            >
              <LoadingPlaceholder
                uiTransform={{
                  width: '100%',
                  height: '100%',
                  borderRadius: fontSize / 2
                }}
              />
            </UiEntity>
            <UiEntity
              uiTransform={{
                width: '50%',
                height: scale * 70,
                padding: { left: fontSize * 0.3 }
              }}
            >
              <LoadingPlaceholder
                uiTransform={{
                  width: '100%',
                  height: '100%',
                  borderRadius: fontSize / 2
                }}
              />
            </UiEntity>
          </Row>
        ))}
      </Column>
    )
  }

  if (members.length === 0) {
    return (
      <UiEntity
        uiText={{
          value: 'No members yet',
          fontSize,
          color: COLOR.TEXT_COLOR_GREY
        }}
      />
    )
  }

  const rows = chunk(members, 2)

  return (
    <Column uiTransform={{ width: '100%' }}>
      {rows.map((pair, rowIndex) => (
        <Row key={rowIndex} uiTransform={{ width: '100%' }}>
          {pair.map((member) => (
            <CommunityMemberItem
              key={member.memberAddress}
              member={member}
              viewerRole={viewerRole}
              communityId={communityId}
            />
          ))}
        </Row>
      ))}
    </Column>
  )
}

// --- Invited / Banned helpers ---

function EmptyState({
  iconName,
  label
}: {
  iconName: string
  label: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_M
  })
  const iconSize = fontSize * 5
  return (
    <Column
      uiTransform={{
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        margin: { top: fontSize * 4 }
      }}
    >
      <Icon
        icon={{ spriteName: iconName, atlasName: 'icons' }}
        iconSize={iconSize}
        iconColor={COLOR.WHITE_OPACITY_5}
      />
      <UiEntity
        uiTransform={{ margin: { top: fontSize } }}
        uiText={{
          value: `<b>${label}</b>`,
          fontSize: fontSizeTitle,
          color: COLOR.TEXT_COLOR_WHITE
        }}
      />
    </Column>
  )
}

function ListLoadingPlaceholder(): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const scale = getContentScaleRatio()
  return (
    <Column uiTransform={{ width: '100%' }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Row
          key={i}
          uiTransform={{ width: '100%', margin: { bottom: fontSize * 0.5 } }}
        >
          <LoadingPlaceholder
            uiTransform={{
              width: '100%',
              height: scale * 70,
              borderRadius: fontSize / 2
            }}
          />
        </Row>
      ))}
    </Column>
  )
}

/**
 * Compact row used by Invited / Banned lists — avatar + name on the left,
 * a single action button on the right.
 */
function CompactMemberRow({
  address,
  name,
  hasClaimedName,
  profilePictureUrl,
  actionLabel,
  onAction
}: {
  address: string
  name: string
  hasClaimedName: boolean
  profilePictureUrl?: string
  actionLabel: string
  onAction: () => void
  key: string
}): ReactElement {
  const fontSize = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.BODY
  })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.CAPTION
  })
  const avatarSize = fontSize * 2.5
  const addressColor = hasClaimedName
    ? getAddressColor(address.toLowerCase())
    : COLOR.TEXT_COLOR_LIGHT_GREY
  return (
    <Row
      uiTransform={{
        width: '100%',
        height: fontSize * 4,
        alignItems: 'center',
        padding: { left: fontSize, right: fontSize },
        margin: { bottom: fontSize / 4 },
        borderRadius: fontSize / 2
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
    >
      <AvatarCircle
        imageSrc={profilePictureUrl}
        userId={address}
        circleColor={addressColor}
        uiTransform={{
          width: avatarSize,
          height: avatarSize,
          flexShrink: 0
        }}
        isGuest={false}
      />
      <UiEntity uiTransform={{ margin: { left: fontSize * 0.5 } }}>
        <PlayerNameComponent
          name={name}
          address={address}
          hasClaimedName={hasClaimedName}
          fontSize={fontSize}
        />
      </UiEntity>
      <UiEntity uiTransform={{ flexGrow: 1 }} />
      <UiEntity
        uiTransform={{
          height: fontSize * 2,
          padding: { left: fontSize, right: fontSize },
          borderRadius: fontSize / 2,
          alignItems: 'center',
          justifyContent: 'center'
        }}
        uiBackground={{ color: COLOR.BUTTON_PRIMARY }}
        uiText={{
          value: `<b>${actionLabel}</b>`,
          fontSize: fontSizeSmall,
          color: COLOR.WHITE,
          textWrap: 'nowrap'
        }}
        onMouseDown={onAction}
      />
    </Row>
  )
}

function InvitedList({ communityId }: { communityId: string }): ReactElement {
  const [invites, setInvites] = useState<CommunityInviteEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const refetch = (): void => {
    executeTask(async () => {
      try {
        const result = await fetchCommunityInvites(communityId, { limit: 50 })
        setInvites(result.results ?? [])
      } catch (error) {
        console.error('[communities] failed to load invites', error)
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    refetch()
    const unsubscribe = listenCommunitiesChanged(refetch)
    return unsubscribe
  }, [])

  const onCancelInvite = (entry: CommunityInviteEntry): void => {
    showConfirmPopup({
      title: `Cancel invite to <b>${entry.name}</b>?`,
      icon: {
        spriteName: 'CloseIcon',
        atlasName: 'icons',
        backgroundColor: COLOR.BUTTON_PRIMARY
      },
      confirmLabel: 'CANCEL INVITE',
      cancelLabel: 'BACK',
      onConfirm: async () => {
        await manageInviteRequest(communityId, entry.id, 'cancelled')
        notifyCommunitiesChanged()
      }
    })
  }

  if (loading) return <ListLoadingPlaceholder />
  if (invites.length === 0)
    return <EmptyState iconName="Envelope" label="No Invites" />

  return (
    <Column uiTransform={{ width: '100%' }}>
      {invites.map((entry) => (
        <CompactMemberRow
          key={entry.id}
          address={entry.memberAddress}
          name={entry.name}
          hasClaimedName={entry.hasClaimedName}
          profilePictureUrl={entry.profilePictureUrl}
          actionLabel="CANCEL INVITE"
          onAction={() => {
            onCancelInvite(entry)
          }}
        />
      ))}
    </Column>
  )
}

function BannedList({ communityId }: { communityId: string }): ReactElement {
  const [banned, setBanned] = useState<CommunityMember[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const refetch = (): void => {
    executeTask(async () => {
      try {
        const result = await fetchCommunityBans(communityId, { limit: 50 })
        setBanned(result.results ?? [])
      } catch (error) {
        console.error('[communities] failed to load bans', error)
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    refetch()
    const unsubscribe = listenCommunitiesChanged(refetch)
    return unsubscribe
  }, [])

  const onUnban = (member: CommunityMember): void => {
    showConfirmPopup({
      title: `Unban <b>${member.name}</b>?`,
      message: 'They will be allowed to re-join the community.',
      icon: {
        spriteName: 'BlockUser',
        atlasName: 'icons',
        backgroundColor: COLOR.BUTTON_PRIMARY
      },
      confirmLabel: 'UNBAN',
      onConfirm: async () => {
        await unbanMember(communityId, member.memberAddress)
        notifyCommunitiesChanged()
      }
    })
  }

  if (loading) return <ListLoadingPlaceholder />
  if (banned.length === 0)
    return <EmptyState iconName="BlockUser" label="No Banned Users" />

  return (
    <Column uiTransform={{ width: '100%' }}>
      {banned.map((member) => (
        <CompactMemberRow
          key={member.memberAddress}
          address={member.memberAddress}
          name={member.name}
          hasClaimedName={member.hasClaimedName}
          profilePictureUrl={member.profilePictureUrl}
          actionLabel="UNBAN"
          onAction={() => {
            onUnban(member)
          }}
        />
      ))}
    </Column>
  )
}
