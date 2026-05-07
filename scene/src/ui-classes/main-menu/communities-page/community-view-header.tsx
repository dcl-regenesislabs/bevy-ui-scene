import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import {
  type CommunityListItem,
  type CommunityMemberRole,
  getCommunityThumbnailUrl
} from '../../../service/communities-types'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { CommunityPublicAndMembersSpan } from './community-public-and-members-span'
import { ButtonTextIcon } from '../../../components/button-text-icon'
import Icon from '../../../components/icon/Icon'
import { ThinMenuButton } from '../../../components/thin-menu-button'
import { executeTask } from '@dcl/sdk/ecs'
import { getPlayer } from '@dcl/sdk/players'
import { store } from '../../../state/store'
import { pushPopupAction } from '../../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
import {
  fetchUserInviteRequests,
  invalidateUserInviteRequestsCache,
  joinCommunity,
  leaveCommunity,
  manageInviteRequest,
  sendInviteOrRequestToJoin
} from '../../../utils/communities-promise-utils'
import { showErrorPopup } from '../../../service/error-popup-service'
import { notifyCommunitiesChanged } from '../../../service/communities-events'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

export function CommunityViewHeader({
  community
}: {
  community: CommunityListItem
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_L
  })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })
  const scale = getContentScaleRatio()
  const borderRadius = scale * 30
  const thumbnailSize = scale * 300

  const [role, setRole] = useState<CommunityMemberRole>(community.role)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [acting, setActing] = useState<boolean>(false)
  const [hovering, setHovering] = useState<boolean>(false)
  const [ownerMenuOpen, setOwnerMenuOpen] = useState<boolean>(false)

  const isOwner = role === 'owner'
  const isMember = role === 'member' || role === 'moderator' || role === 'owner'
  const requested = requestId != null

  const onEdit = (): void => {
    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.CREATE_COMMUNITY,
        data: community
      })
    )
  }

  const onDelete = (): void => {
    setOwnerMenuOpen(false)
    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.CONFIRM_DELETE_COMMUNITY,
        data: community
      })
    )
  }

  // On mount, look up whether the user has an open `request_to_join` for
  // this community so the button starts as "CANCEL REQUEST" instead of
  // "REQUEST TO JOIN" when reopening the popup.
  useEffect(() => {
    if (isMember || community.privacy !== 'private') return
    executeTask(async () => {
      try {
        const requests = await fetchUserInviteRequests('request_to_join')
        const match = requests.find((r) => r.communityId === community.id)
        if (match != null) setRequestId(match.id)
      } catch (error) {
        console.error('[communities] failed to load my requests', error)
      }
    })
  }, [])

  const onJoin = (): void => {
    if (acting) return
    const previous = role
    setRole('member')
    setActing(true)
    executeTask(async () => {
      try {
        await joinCommunity(community.id)
        community.role = 'member'
        notifyCommunitiesChanged()
      } catch (error) {
        setRole(previous)
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          'joinCommunity'
        )
      } finally {
        setActing(false)
      }
    })
  }

  const onLeave = (): void => {
    if (acting) return
    const previous = role
    const myAddress = (getPlayer()?.userId ?? '').toLowerCase()
    if (myAddress.length === 0) return
    setRole('none')
    setHovering(false)
    setActing(true)
    executeTask(async () => {
      try {
        await leaveCommunity(community.id, myAddress)
        community.role = 'none'
        notifyCommunitiesChanged()
      } catch (error) {
        setRole(previous)
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          'leaveCommunity'
        )
      } finally {
        setActing(false)
      }
    })
  }

  const onRequestToJoin = (): void => {
    if (acting) return
    const myAddress = (getPlayer()?.userId ?? '').toLowerCase()
    if (myAddress.length === 0) return
    setActing(true)
    executeTask(async () => {
      try {
        await sendInviteOrRequestToJoin(
          community.id,
          myAddress,
          'request_to_join'
        )
        invalidateUserInviteRequestsCache()
        // Look up the freshly-created request id so the button can offer
        // "CANCEL REQUEST" without waiting for the user to reopen.
        try {
          const requests = await fetchUserInviteRequests('request_to_join')
          const match = requests.find((r) => r.communityId === community.id)
          setRequestId(match?.id ?? 'pending')
        } catch {
          // If we can't resolve the id, fall back to a placeholder so the
          // UI still flips to "CANCEL REQUEST" — the cancel call would
          // require a real id, so we'll re-fetch on click.
          setRequestId('pending')
        }
        notifyCommunitiesChanged()
      } catch (error) {
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          'requestToJoinCommunity'
        )
      } finally {
        setActing(false)
      }
    })
  }

  const onCancelRequest = (): void => {
    if (acting || requestId == null) return
    const previousId = requestId
    setRequestId(null)
    setActing(true)
    executeTask(async () => {
      try {
        // If we only have the placeholder, resolve the real id first.
        let idToCancel = previousId
        if (idToCancel === 'pending') {
          const requests = await fetchUserInviteRequests('request_to_join')
          const match = requests.find((r) => r.communityId === community.id)
          if (match == null) return
          idToCancel = match.id
        }
        await manageInviteRequest(community.id, idToCancel, 'cancelled')
        invalidateUserInviteRequestsCache()
        notifyCommunitiesChanged()
      } catch (error) {
        setRequestId(previousId)
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          'cancelRequestToJoin'
        )
      } finally {
        setActing(false)
      }
    })
  }

  return (
    <Row
      uiTransform={{
        width: '100%',
        padding: {
          left: fontSize * 2,
          right: fontSize * 2,
          top: fontSize * 1.5,
          bottom: fontSize
        },
        alignItems: 'flex-start',
        flexShrink: 0
      }}
    >
      <UiEntity
        uiTransform={{
          width: thumbnailSize,
          height: thumbnailSize,
          borderRadius,
          flexShrink: 0,
          margin: { right: fontSize * 1.5 }
        }}
        uiBackground={{
          textureMode: 'stretch',
          texture: { src: getCommunityThumbnailUrl(community.id) }
        }}
      />
      <Column
        uiTransform={{
          flexGrow: 1,
          justifyContent: 'flex-start',
          height: thumbnailSize,
          padding: 0,
          margin: 0
        }}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            flexShrink: 1
          }}
          uiText={{
            value: `<b>${community.name}</b>`,
            fontSize: fontSizeTitle,
            color: COLOR.TEXT_COLOR_WHITE,
            textAlign: 'top-left',
            textWrap: 'wrap'
          }}
        />
        <CommunityPublicAndMembersSpan
          uiTransform={{
            position: { left: fontSize }
          }}
          privacy={community.privacy}
          membersCount={community.membersCount}
          fontSize={fontSizeSmall}
        />
        <UiEntity
          uiTransform={{
            width: '100%',
            position: { left: fontSize / 2 },
            height: fontSize * 5,
            overflow: 'scroll',
            scrollVisible: 'vertical'
          }}
        >
          <UiEntity
            uiTransform={{
              width: '100%'
            }}
            uiText={{
              value: `${community.description}`,
              fontSize: fontSizeSmall,
              color: COLOR.TEXT_COLOR_WHITE,
              textAlign: 'top-left',
              textWrap: 'wrap'
            }}
          />
        </UiEntity>
        <Row
          uiTransform={{
            width: 'auto',
            flexGrow: 0,
            positionType: 'absolute',
            position: { top: 0, right: 0 }
          }}
        >
          {isOwner ? (
            <Row uiTransform={{ width: 'auto', alignItems: 'center' }}>
              <ButtonTextIcon
                variant="subtle"
                value="<b>EDIT</b>"
                icon={{ spriteName: 'Edit', atlasName: 'icons' }}
                fontSize={fontSizeSmall}
                uiTransform={{
                  borderRadius: fontSize / 2,
                  padding: {
                    left: fontSize * 0.6,
                    right: fontSize * 0.8,
                    top: fontSize * 0.3,
                    bottom: fontSize * 0.3
                  },
                  margin: { right: fontSize * 0.4 }
                }}
                onMouseDown={onEdit}
              />
              <UiEntity uiTransform={{ width: 'auto' }}>
                <ThinMenuButton
                  fontSize={fontSize}
                  backgroundColor={COLOR.BLACK_TRANSPARENT}
                  uiTransform={{
                    borderWidth: fontSize / 10,
                    borderColor: COLOR.WHITE,
                    borderRadius: fontSize / 2
                  }}
                  onMouseDown={() => {
                    setOwnerMenuOpen(!ownerMenuOpen)
                  }}
                />
                {ownerMenuOpen && (
                  <UiEntity
                    uiTransform={{
                      positionType: 'absolute',
                      position: { top: fontSize * 2.4, right: 0 },
                      borderRadius: fontSize / 2,
                      padding: fontSize * 0.4,
                      zIndex: 10
                    }}
                    uiBackground={{ color: COLOR.URL_POPUP_BACKGROUND }}
                  >
                    <Row
                      uiTransform={{
                        width: 'auto',
                        padding: {
                          left: fontSize,
                          right: fontSize,
                          top: fontSize * 0.5,
                          bottom: fontSize * 0.5
                        },
                        borderRadius: fontSize / 2,
                        alignItems: 'center'
                      }}
                      onMouseDown={onDelete}
                    >
                      <Icon
                        icon={{ spriteName: 'Delete', atlasName: 'icons' }}
                        iconSize={fontSizeSmall}
                        iconColor={COLOR.BUTTON_PRIMARY}
                        uiTransform={{ margin: { right: fontSize * 0.4 } }}
                      />
                      <UiEntity
                        uiText={{
                          value: '<b>Delete Community</b>',
                          fontSize: fontSizeSmall,
                          color: COLOR.BUTTON_PRIMARY,
                          textWrap: 'nowrap'
                        }}
                      />
                    </Row>
                  </UiEntity>
                )}
              </UiEntity>
            </Row>
          ) : isMember ? (
            <ButtonTextIcon
              variant="subtle"
              destructiveHover={true}
              value={hovering ? '<b>LEAVE</b>' : '<b>JOINED</b>'}
              icon={
                hovering
                  ? { spriteName: 'LogoutIcon', atlasName: 'icons' }
                  : { spriteName: 'Check', atlasName: 'icons' }
              }
              fontSize={fontSizeSmall}
              loading={acting}
              uiTransform={{
                borderRadius: fontSize / 2,
                padding: {
                  left: fontSize * 0.6,
                  right: fontSize * 0.8,
                  top: fontSize * 0.3,
                  bottom: fontSize * 0.3
                }
              }}
              onMouseEnter={() => {
                setHovering(true)
              }}
              onMouseLeave={() => {
                setHovering(false)
              }}
              onMouseDown={onLeave}
            />
          ) : community.privacy === 'private' ? (
            <ButtonTextIcon
              variant={requested ? 'subtle' : 'solid'}
              value={
                requested ? '<b>CANCEL REQUEST</b>' : '<b>REQUEST TO JOIN</b>'
              }
              icon={
                requested
                  ? { spriteName: 'CloseIcon', atlasName: 'icons' }
                  : { spriteName: 'Add', atlasName: 'context' }
              }
              fontSize={fontSizeSmall}
              loading={acting}
              uiTransform={{
                borderRadius: fontSize / 2,
                padding: {
                  left: fontSize * 0.6,
                  right: fontSize * 0.8,
                  top: fontSize * 0.3,
                  bottom: fontSize * 0.3
                }
              }}
              onMouseDown={requested ? onCancelRequest : onRequestToJoin}
            />
          ) : (
            <ButtonTextIcon
              variant="solid"
              value="<b>JOIN</b>"
              icon={{ spriteName: 'Add', atlasName: 'context' }}
              fontSize={fontSizeSmall}
              loading={acting}
              uiTransform={{
                borderRadius: fontSize / 2,
                padding: {
                  left: fontSize * 0.6,
                  right: fontSize * 0.8,
                  top: fontSize * 0.3,
                  bottom: fontSize * 0.3
                }
              }}
              onMouseDown={onJoin}
            />
          )}
        </Row>
      </Column>
    </Row>
  )
}
