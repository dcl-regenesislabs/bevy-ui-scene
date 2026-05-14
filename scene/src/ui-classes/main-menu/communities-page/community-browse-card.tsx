import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column } from '../../../components/layout'
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
import { truncateWithoutBreakingWords } from '../../../utils/ui-utils'
import { CommunityPublicAndMembersSpan } from './community-public-and-members-span'
import { store } from '../../../state/store'
import { pushPopupAction } from '../../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
import {
  fetchUserInviteRequests,
  invalidateUserInviteRequestsCache,
  joinCommunity,
  manageInviteRequest,
  sendInviteOrRequestToJoin
} from '../../../utils/communities-promise-utils'
import { getPlayer } from '@dcl/sdk/players'
import { executeTask } from '@dcl/sdk/ecs'
import { showErrorPopup } from '../../../service/error-popup-service'
import { getLoadingAlphaValue } from '../../../service/loading-alpha-color'
import { notifyCommunitiesChanged } from '../../../service/communities-events'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

export const BROWSE_CARD_WIDTH = (): number => getContentScaleRatio() * 400
export const BROWSE_CARD_HEIGHT = (): number => getContentScaleRatio() * 600

const COMMUNITY_CARD_BUTTON_LABEL = {
  VIEW: 'VIEW',
  REQUEST_TO_JOIN: 'REQUEST TO JOIN',
  REQUESTED: 'REQUESTED',
  CANCEL_REQUEST: 'CANCEL REQUEST',
  JOIN: 'JOIN'
}

function getActionLabel(
  role: CommunityMemberRole,
  privacy: CommunityListItem['privacy'],
  requested: boolean,
  hovering: boolean
): string {
  if (role === 'member' || role === 'moderator' || role === 'owner') {
    return COMMUNITY_CARD_BUTTON_LABEL.VIEW
  }
  if (privacy === 'private') {
    if (!requested) return COMMUNITY_CARD_BUTTON_LABEL.REQUEST_TO_JOIN
    return hovering
      ? COMMUNITY_CARD_BUTTON_LABEL.CANCEL_REQUEST
      : COMMUNITY_CARD_BUTTON_LABEL.REQUESTED
  }
  return COMMUNITY_CARD_BUTTON_LABEL.JOIN
}

export function CommunityBrowseCard({
  community
}: {
  community: CommunityListItem
  key: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.LABEL
  })
  const fontSizeCaption = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.CAPTION
  })
  const cardWidth = BROWSE_CARD_WIDTH()
  const cardHeight = BROWSE_CARD_HEIGHT()
  const [role, setRole] = useState<CommunityMemberRole>(community.role)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [acting, setActing] = useState<boolean>(false)
  const [hovering, setHovering] = useState<boolean>(false)
  const requested = requestId != null
  const buttonLabel = getActionLabel(
    role,
    community.privacy,
    requested,
    hovering
  )

  // Persist pending-request state across catalog mounts. Only relevant for
  // private communities the user isn't a member of.
  useEffect(() => {
    const isMember =
      community.role === 'member' ||
      community.role === 'moderator' ||
      community.role === 'owner'
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

  const onButtonClick = (): void => {
    if (acting) return
    if (buttonLabel === COMMUNITY_CARD_BUTTON_LABEL.VIEW) {
      store.dispatch(
        pushPopupAction({
          type: HUD_POPUP_TYPE.COMMUNITY_VIEW,
          data: community
        })
      )
      return
    }
    if (buttonLabel === COMMUNITY_CARD_BUTTON_LABEL.JOIN) {
      const previous = role
      setRole('member')
      setActing(true)
      executeTask(async () => {
        try {
          await joinCommunity(community.id)
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
      return
    }
    if (buttonLabel === COMMUNITY_CARD_BUTTON_LABEL.REQUEST_TO_JOIN) {
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
          // Resolve the new request id so the button can offer cancel.
          try {
            const requests = await fetchUserInviteRequests('request_to_join')
            const match = requests.find((r) => r.communityId === community.id)
            setRequestId(match?.id ?? 'pending')
          } catch {
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
      return
    }
    if (
      buttonLabel === COMMUNITY_CARD_BUTTON_LABEL.REQUESTED ||
      buttonLabel === COMMUNITY_CARD_BUTTON_LABEL.CANCEL_REQUEST
    ) {
      const previousId = requestId
      if (previousId == null) return
      setRequestId(null)
      setHovering(false)
      setActing(true)
      executeTask(async () => {
        try {
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
  }

  return (
    <Column
      uiTransform={{
        width: cardWidth,
        height: cardHeight,
        margin: {
          right: fontSize * 0.8,
          bottom: fontSize * 0.8
        },
        borderRadius: fontSize,
        flexShrink: 0
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
      onMouseDown={() => {
        store.dispatch(
          pushPopupAction({
            type: HUD_POPUP_TYPE.COMMUNITY_VIEW,
            data: community
          })
        )
      }}
    >
      {/* Thumbnail */}
      <UiEntity
        uiTransform={{
          width: cardWidth,
          height: cardWidth,
          borderRadius: fontSize / 2,
          flexShrink: 0
        }}
        uiBackground={{
          textureMode: 'stretch',
          texture: { src: getCommunityThumbnailUrl(community.id) }
        }}
      />

      {/* Name */}
      <UiEntity
        uiTransform={{
          width: '100%',
          flexShrink: 0,
          margin: { top: 0 },
          overflow: 'hidden'
        }}
        uiText={{
          value: `<b>${truncateWithoutBreakingWords(community.name, 31)}</b>`,
          fontSize: fontSizeSmall,
          textWrap: 'nowrap',
          color: COLOR.TEXT_COLOR_WHITE,
          textAlign: 'top-left'
        }}
      />

      {/* Owner */}
      <UiEntity
        uiTransform={{
          width: '100%',
          flexShrink: 0,
          margin: { top: -fontSizeCaption }
        }}
        uiText={{
          value: community.ownerName ?? '',
          fontSize: fontSizeCaption,
          color: COLOR.TEXT_COLOR_WHITE,
          textAlign: 'top-left'
        }}
      />

      {/* Privacy + Members */}
      <CommunityPublicAndMembersSpan
        privacy={community.privacy}
        membersCount={community.membersCount}
        fontSize={fontSizeCaption}
        uiTransform={{
          width: '100%',
          flexShrink: 0,
          margin: { top: -fontSizeSmall / 2, left: fontSizeSmall / 2 }
        }}
      />

      {/* Action button */}
      <UiEntity
        uiTransform={{
          borderRadius: fontSize / 2,
          width: '90%',
          alignSelf: 'center',
          borderWidth: 1,
          borderColor:
            buttonLabel === COMMUNITY_CARD_BUTTON_LABEL.JOIN
              ? COLOR.BLACK_TRANSPARENT
              : COLOR.WHITE,
          margin: { top: fontSizeSmall / 2 },
          opacity: acting ? getLoadingAlphaValue() : 1
        }}
        uiBackground={{
          color:
            buttonLabel === COMMUNITY_CARD_BUTTON_LABEL.JOIN
              ? COLOR.WHITE_OPACITY_1
              : buttonLabel === COMMUNITY_CARD_BUTTON_LABEL.CANCEL_REQUEST
              ? COLOR.BUTTON_PRIMARY
              : COLOR.BLACK_TRANSPARENT
        }}
        onMouseDown={onButtonClick}
        onMouseEnter={
          requested
            ? () => {
                setHovering(true)
              }
            : undefined
        }
        onMouseLeave={
          requested
            ? () => {
                setHovering(false)
              }
            : undefined
        }
        uiText={{
          value: `<b>${buttonLabel}</b>`,
          fontSize: fontSizeSmall
        }}
      />
      {/*  <UiEntity
        uiTransform={{
          width: '100%',
          height: fontSize * 2.2,
          borderRadius: fontSize / 2,
          borderWidth: 1,
          borderColor: COLOR.WHITE_OPACITY_5,
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
          margin: { top: fontSize * 0.3 }
        }}
        uiBackground={{ color: COLOR.WHITE_OPACITY_1 }}
        uiText={{
          value: `<b>${buttonLabel}</b>`,
          fontSize: fontSizeSmall,
          color: COLOR.TEXT_COLOR_WHITE
        }}
      /> */}
    </Column>
  )
}
