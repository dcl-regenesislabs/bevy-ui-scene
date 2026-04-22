import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { executeTask } from '@dcl/sdk/ecs'
import {
  fetchUserInviteRequests,
  manageInviteRequest
} from '../../../utils/communities-promise-utils'
import {
  getCommunityThumbnailUrl,
  type CommunityListItem,
  type UserInviteRequest
} from '../../../service/communities-types'
import { store } from '../../../state/store'
import { pushPopupAction } from '../../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import Icon from '../../../components/icon/Icon'
import { getLoadingAlphaValue } from '../../../service/loading-alpha-color'
import { showErrorPopup } from '../../../service/error-popup-service'
import { truncateWithoutBreakingWords } from '../../../utils/ui-utils'
import { ButtonTextIcon } from '../../../components/button-text-icon'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

export function CommunityInvitesAndRequests({
  onBack,
  onInviteAccepted,
  onInviteRejected
}: {
  onBack: () => void
  onInviteAccepted?: () => void
  onInviteRejected?: () => void
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.TITLE_L
  })

  const [invites, setInvites] = useState<UserInviteRequest[]>([])
  const [requests, setRequests] = useState<UserInviteRequest[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    executeTask(async () => {
      try {
        const [inv, req] = await Promise.all([
          fetchUserInviteRequests('invite'),
          fetchUserInviteRequests('request_to_join')
        ])
        setInvites(inv)
        setRequests(req)
      } catch (error) {
        console.error('[communities] failed to load invites/requests', error)
      }
      setLoading(false)
    })
  }, [])

  const removeFromList = (
    list: 'invites' | 'requests',
    requestId: string
  ): void => {
    if (list === 'invites') {
      setInvites(invites.filter((i) => i.id !== requestId))
    } else {
      setRequests(requests.filter((r) => r.id !== requestId))
    }
  }

  return (
    <Column
      uiTransform={{
        width: '100%',
        height: '100%',
        alignItems: 'flex-start',
        overflow: 'scroll',
        scrollVisible: 'vertical'
      }}
    >
      {/* Header with back arrow */}
      <Row
        uiTransform={{
          width: '100%',
          alignItems: 'center',
          margin: { bottom: fontSize }
        }}
      >
        <Icon
          uiTransform={{ margin: { right: fontSize * 0.5 } }}
          icon={{ spriteName: 'LeftArrow', atlasName: 'icons' }}
          iconSize={fontSize}
          iconColor={COLOR.TEXT_COLOR_WHITE}
          onMouseDown={onBack}
        />
        <UiEntity
          uiText={{
            value: '<b>Invites & Requests</b>',
            fontSize: fontSizeTitle,
            color: COLOR.TEXT_COLOR_WHITE,
            textAlign: 'middle-left'
          }}
        />
      </Row>

      {/* Invites section */}
      <UiEntity
        uiTransform={{
          width: '100%',
          margin: { bottom: fontSize * 0.5 }
        }}
        uiText={{
          value: `<b>Invites (${invites.length})</b>`,
          fontSize,
          color: COLOR.TEXT_COLOR_WHITE,
          textAlign: 'top-left'
        }}
      />
      {loading ? (
        <CardRowSkeleton fontSize={fontSize} />
      ) : invites.length === 0 ? (
        <EmptySection fontSize={fontSize} label="No Invites" />
      ) : (
        <Row
          uiTransform={{
            width: '100%',
            margin: { bottom: fontSize },
            flexWrap: 'wrap'
          }}
        >
          {invites.map((invite) => (
            <InviteCard
              key={invite.id}
              item={invite}
              primaryLabel="ACCEPT"
              secondaryLabel="DELETE"
              onPrimary={(id) => {
                executeTask(async () => {
                  try {
                    await manageInviteRequest(invite.communityId, id, 'accepted')
                    removeFromList('invites', id)
                    onInviteAccepted?.()
                  } catch (error) {
                    showErrorPopup(
                      error instanceof Error
                        ? error
                        : new Error(String(error)),
                      'acceptInvite'
                    )
                  }
                })
              }}
              onSecondary={(id) => {
                executeTask(async () => {
                  try {
                    await manageInviteRequest(invite.communityId, id, 'rejected')
                    removeFromList('invites', id)
                    onInviteRejected?.()
                  } catch (error) {
                    showErrorPopup(
                      error instanceof Error
                        ? error
                        : new Error(String(error)),
                      'rejectInvite'
                    )
                  }
                })
              }}
            />
          ))}
        </Row>
      )}

      {/* Requests sent section */}
      <UiEntity
        uiTransform={{
          width: '100%',
          margin: { top: fontSize, bottom: fontSize * 0.5 }
        }}
        uiText={{
          value: `<b>Requests Sent (${requests.length})</b>`,
          fontSize,
          color: COLOR.TEXT_COLOR_WHITE,
          textAlign: 'top-left'
        }}
      />
      {loading ? (
        <CardRowSkeleton fontSize={fontSize} />
      ) : requests.length === 0 ? (
        <EmptySection fontSize={fontSize} label="No Requests" />
      ) : (
        <Row
          uiTransform={{
            width: '100%',
            flexWrap: 'wrap'
          }}
        >
          {requests.map((request) => (
            <InviteCard
              key={request.id}
              item={request}
              primaryLabel=""
              secondaryLabel="CANCEL"
              onSecondary={(id) => {
                executeTask(async () => {
                  try {
                    await manageInviteRequest(
                      request.communityId,
                      id,
                      'cancelled'
                    )
                    removeFromList('requests', id)
                  } catch (error) {
                    showErrorPopup(
                      error instanceof Error
                        ? error
                        : new Error(String(error)),
                      'cancelRequest'
                    )
                  }
                })
              }}
            />
          ))}
        </Row>
      )}
    </Column>
  )
}

function InviteCard({
  item,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary
}: {
  item: UserInviteRequest
  primaryLabel: string
  secondaryLabel: string
  onPrimary?: (id: string) => void
  onSecondary?: (id: string) => void
  key: string
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeSmall = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.CAPTION
  })
  const [acting, setActing] = useState<boolean>(false)

  const run = (fn?: (id: string) => void): void => {
    if (acting || fn == null) return
    setActing(true)
    fn(item.id)
  }

  const thumbUrl =
    (item.thumbnailUrl != null && item.thumbnailUrl.length > 0
      ? item.thumbnailUrl
      : null) ?? getCommunityThumbnailUrl(item.communityId)

  const openCommunityView = (): void => {
    // Adapt UserInviteRequest → CommunityListItem so the popup can render it.
    const community: CommunityListItem = {
      id: item.communityId,
      name: item.name,
      description: item.description,
      thumbnailUrl: thumbUrl,
      ownerAddress: item.ownerAddress,
      ownerName: item.ownerName,
      privacy: item.privacy,
      visibility: 'all',
      role: item.role,
      membersCount: item.membersCount,
      active: item.active,
      friends: item.friends ?? []
    }
    store.dispatch(
      pushPopupAction({
        type: HUD_POPUP_TYPE.COMMUNITY_VIEW,
        data: community
      })
    )
  }

  return (
    <Column
      uiTransform={{
        width: fontSize * 16,
        margin: { right: fontSize * 0.6, bottom: fontSize * 0.6 },
        borderRadius: fontSize / 2,
        padding: fontSize * 0.6,
        flexShrink: 0,
        opacity: acting ? getLoadingAlphaValue() : 1
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
      onMouseDown={openCommunityView}
    >
      {/* Thumbnail */}
      <UiEntity
        uiTransform={{
          width: '100%',
          height: fontSize * 9,
          borderRadius: fontSize / 2,
          margin: { bottom: fontSize * 0.5 },
          flexShrink: 0
        }}
        uiBackground={{
          textureMode: 'stretch',
          texture: { src: thumbUrl }
        }}
      />

      {/* Name */}
      <UiEntity
        uiTransform={{ width: '100%' }}
        uiText={{
          value: `<b>${truncateWithoutBreakingWords(item.name ?? '', 24)}</b>`,
          fontSize,
          color: COLOR.TEXT_COLOR_WHITE,
          textAlign: 'top-left'
        }}
      />

      {/* Owner */}
      {item.ownerName != null && item.ownerName.length > 0 && (
        <UiEntity
          uiTransform={{
            width: '100%',
            margin: { top: -fontSizeSmall / 2 }
          }}
          uiText={{
            value: truncateWithoutBreakingWords(item.ownerName, 24),
            fontSize: fontSizeSmall,
            color: COLOR.TEXT_COLOR_LIGHT_GREY,
            textAlign: 'top-left'
          }}
        />
      )}

      {/* Public | N Members */}
      <Row
        uiTransform={{
          alignItems: 'center',
          margin: { top: fontSize * 0.2, bottom: fontSize * 0.5 }
        }}
      >
        <Icon
          icon={{
            spriteName: item.privacy === 'public' ? 'PublicIcn' : 'PrivateIcn',
            atlasName: 'icons'
          }}
          iconSize={fontSizeSmall}
        />
        <UiEntity
          uiText={{
            value: ` ${item.privacy === 'public' ? 'Public' : 'Private'} | ${
              item.membersCount
            } Members`,
            fontSize: fontSizeSmall,
            color: COLOR.TEXT_COLOR_LIGHT_GREY,
            textWrap: 'nowrap'
          }}
        />
      </Row>

      {/* Action buttons */}
      <Row uiTransform={{ width: '100%', alignItems: 'center' }}>
        <ButtonTextIcon
          value={`<b>${secondaryLabel}</b>`}
          icon={{ spriteName: 'icon.png', atlasName: 'icons' }}
          iconSize={0}
          fontSize={fontSizeSmall}
          fontColor={COLOR.TEXT_COLOR_WHITE}
          backgroundColor={COLOR.WHITE_OPACITY_1}
          uiTransform={{
            flexGrow: 1,
            height: fontSize * 2,
            margin: { right: primaryLabel.length > 0 ? fontSize * 0.3 : 0 },
            padding: { left: fontSize * 0.6, right: fontSize * 0.6 },
            justifyContent: 'center',
            borderRadius: fontSize / 2
          }}
          onMouseDown={() => {
            run(onSecondary)
          }}
        />
        {primaryLabel.length > 0 && (
          <ButtonTextIcon
            value={`<b>${primaryLabel}</b>`}
            icon={{ spriteName: 'icon.png', atlasName: 'icons' }}
            iconSize={0}
            fontSize={fontSizeSmall}
            fontColor={COLOR.WHITE}
            backgroundColor={COLOR.BUTTON_PRIMARY}
            uiTransform={{
              flexGrow: 1,
              height: fontSize * 2,
              padding: { left: fontSize * 0.6, right: fontSize * 0.6 },
              justifyContent: 'center',
              borderRadius: fontSize / 2
            }}
            onMouseDown={() => {
              run(onPrimary)
            }}
          />
        )}
      </Row>
    </Column>
  )
}

function CardRowSkeleton({ fontSize }: { fontSize: number }): ReactElement {
  return (
    <Row uiTransform={{ width: '100%', margin: { bottom: fontSize } }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <UiEntity
          key={i}
          uiTransform={{
            width: fontSize * 16,
            height: fontSize * 16,
            margin: { right: fontSize * 0.6 }
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
      ))}
    </Row>
  )
}

function EmptySection({
  fontSize,
  label
}: {
  fontSize: number
  label: string
}): ReactElement {
  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        padding: fontSize
      }}
      uiText={{
        value: label,
        fontSize,
        color: COLOR.TEXT_COLOR_GREY,
        textAlign: 'top-left'
      }}
    />
  )
}
