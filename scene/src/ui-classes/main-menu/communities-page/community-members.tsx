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
import { FriendButton } from '../../../components/friend-button'
import { type GetPlayerDataRes } from '../../../utils/definitions'
import { getPlayer } from '@dcl/sdk/players'
import { store } from '../../../state/store'
import { pushPopupAction } from '../../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
import { showConfirmPopup } from '../../../components/confirm-popup'
import { NavButton } from '../../../components/nav-button/NavButton'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

function roleBadgeLabel(role: string): string | null {
  if (role === 'owner') return 'Owner'
  if (role === 'moderator') return 'Moderator'
  return null
}

/**
 * Build a minimal `GetPlayerDataRes`-shaped object from a community
 * member, just for `FriendButton`'s `player` prop. The button only reads
 * `userId`, `name`, `isGuest` — the rest of the type is untouched, so a
 * single cast keeps TS happy without us inventing fake wearables/emotes.
 */
function memberAsPlayerStub(member: CommunityMember): GetPlayerDataRes {
  return {
    userId: member.memberAddress.toLowerCase(),
    name: member.name,
    isGuest: false
  } as unknown as GetPlayerDataRes
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
    token: TYPOGRAPHY_TOKENS.BODY_S
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

  // `friendshipStatus` is read-only from the API payload — `FriendButton`
  // owns its own internal state for optimistic updates.
  const friendshipStatus = member.friendshipStatus
  const isSelf =
    (getPlayer()?.userId ?? '').toLowerCase() ===
    member.memberAddress.toLowerCase()

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
        width: '48%',
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

      {/* Friend button — owns the full friend-state lifecycle (add /
          accept / cancel-request / unfriend). Fully seeded from data the
          community list already loaded (name + friendshipStatus), so the
          button renders the right state immediately and skips ALL of its
          internal fetches: `resolvePlayerData`, `getFriends`,
          `getReceivedFriendRequests`, `getSentFriendRequests`. Hidden on
          my own row. The cast is safe: FriendButton only reads
          `userId`, `name`, `isGuest` off the player payload. */}
      {!isSelf ? (
        <FriendButton
          player={memberAsPlayerStub(member)}
          fontSize={fontSizeSmall}
          isFriend={friendshipStatus === CommunityFriendshipStatus.FRIEND}
          hasIncomingRequest={
            friendshipStatus === CommunityFriendshipStatus.REQUEST_RECEIVED
          }
          hasOutgoingRequest={
            friendshipStatus === CommunityFriendshipStatus.REQUEST_SENT
          }
        />
      ) : null}

      {/* Profile menu button. Hidden for the row that represents me —
          the community-member menu has no useful actions on yourself
          (no promote/demote/kick/block-self) and would just clutter the UI. */}
      {!isSelf ? (
        <ThinMenuButton
          fontSize={fontSize}
          uiTransform={{
            margin: { left: fontSize / 2 },
            height: fontSize * 2
          }}
          onMouseDown={openProfileMenu}
          backgroundColor={COLOR.WHITE_OPACITY_1}
        />
      ) : null}
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
    <Column
      uiTransform={{
        width: '100%',
        borderWidth: 5,
        borderColor: COLOR.RED,
        borderRadius: 1
      }}
    >
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
  onAction,
  onMenuClick
}: {
  address: string
  name: string
  hasClaimedName: boolean
  profilePictureUrl?: string
  actionLabel: string
  onAction: () => void
  /** When provided, renders a `ThinMenuButton` after the main action that
   *  opens the user-profile menu (HUD_POPUP_TYPE.PROFILE_MENU). */
  onMenuClick?: () => void
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
      {onMenuClick != null ? (
        <ThinMenuButton
          uiTransform={{
            margin: { left: fontSize * 0.3 },
            height: fontSize * 2
          }}
          backgroundColor={COLOR.WHITE_OPACITY_1}
          onMouseDown={onMenuClick}
        />
      ) : null}
    </Row>
  )
}

function InvitedList({ communityId }: { communityId: string }): ReactElement {
  const [invites, setInvites] = useState<CommunityInviteEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const myAddress = (getPlayer()?.userId ?? '').toLowerCase()

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
      {invites.map((entry) => {
        const isSelf = entry.memberAddress.toLowerCase() === myAddress
        return (
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
            onMenuClick={
              isSelf
                ? undefined
                : () => {
                    // Surface the user-profile context menu (View Passport /
                    // Mention / Invite to Community / Block / Report) for
                    // this invitee. PROFILE_MENU only needs userId, name,
                    // hasClaimedName and isGuest from the `player` payload,
                    // so we synthesise a minimal GetPlayerDataRes-shaped
                    // object from the invite entry.
                    store.dispatch(
                      pushPopupAction({
                        type: HUD_POPUP_TYPE.PROFILE_MENU,
                        data: {
                          player: {
                            userId: entry.memberAddress.toLowerCase(),
                            name: entry.name,
                            hasClaimedName: entry.hasClaimedName,
                            isGuest: false
                          }
                        }
                      })
                    )
                  }
            }
          />
        )
      })}
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
