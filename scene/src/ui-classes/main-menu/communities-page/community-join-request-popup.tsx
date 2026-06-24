import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { executeTask } from '@dcl/sdk/ecs'
import { type Popup } from '../../../components/popup-stack'
import { PopupBackdrop } from '../../../components/popup-backdrop'
import { Column, Row } from '../../../components/ui-system/layout'
import { COLOR } from '../../../components/color-palette'
import { AvatarCircle } from '../../../components/avatar-circle'
import { PlayerNameComponent } from '../../../components/player-name-component'
import { getAddressColor } from '../../main-hud/chat-and-logs/ColorByAddress'
import ButtonComponent from '../../../components/ui-system/button-component'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { BORDER_RADIUS_F } from '../../../utils/ui-utils'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { noop } from '../../../utils/function-utils'
import { store } from '../../../state/store'
import { closeLastPopupAction } from '../../../state/hud/actions'
import {
  fetchCommunityJoinRequests,
  manageInviteRequest
} from '../../../utils/communities-promise-utils'
import { notifyCommunitiesChanged } from '../../../service/communities-events'
import { showErrorPopup } from '../../../service/error-popup-service'
import useState = ReactEcs.useState

export type CommunityJoinRequestPopupData = {
  communityId: string
  communityName: string
  memberAddress: string
  memberName?: string
  thumbnailUrl?: string
}

/**
 * Opened from a `community_request_to_join_received` notification (toast or
 * bell). Shows the requester (avatar + name) and Accept / Reject. The request
 * id is re-resolved fresh at click time (the notification only carries the
 * community + requester) so a stale id can't 404.
 */
export const CommunityJoinRequestPopup: Popup = ({ shownPopup }) => {
  const data = shownPopup.data as CommunityJoinRequestPopupData | null
  if (data == null) return null
  return <CommunityJoinRequestContent data={data} />
}

function CommunityJoinRequestContent({
  data
}: {
  data: CommunityJoinRequestPopupData
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const fontSizeTitle = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.POPUP_TITLE
  })
  const [acting, setActing] = useState<boolean>(false)
  const avatarSize = fontSize * 5
  const memberName = data.memberName ?? ''

  const manage = (intention: 'accepted' | 'rejected'): void => {
    if (acting) return
    setActing(true)
    executeTask(async () => {
      try {
        // Re-resolve the request id fresh (notification carries no id).
        const res = await fetchCommunityJoinRequests(data.communityId, {
          limit: 50
        })
        const match = (res.results ?? []).find(
          (r) =>
            r.memberAddress.toLowerCase() === data.memberAddress.toLowerCase()
        )
        if (match != null) {
          await manageInviteRequest(data.communityId, match.id, intention)
          notifyCommunitiesChanged()
        }
        // If no match, the request was already resolved elsewhere — just close.
        store.dispatch(closeLastPopupAction())
      } catch (error) {
        setActing(false)
        showErrorPopup(
          error instanceof Error ? error : new Error(String(error)),
          intention === 'accepted' ? 'acceptJoinRequest' : 'rejectJoinRequest'
        )
      }
    })
  }

  return (
    <PopupBackdrop>
      <Column
        uiTransform={{
          width: getContentScaleRatio() * 900,
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
        <AvatarCircle
          userId={data.memberAddress}
          name={memberName}
          hasClaimedName={!memberName.includes('#')}
          circleColor={getAddressColor(data.memberAddress.toLowerCase())}
          uiTransform={{
            width: avatarSize,
            height: avatarSize,
            margin: { bottom: fontSize }
          }}
          isGuest={false}
        />

        <PlayerNameComponent
          name={memberName}
          address={data.memberAddress}
          hasClaimedName={!memberName.includes('#')}
          fontSize={fontSizeTitle}
        />

        <UiEntity
          uiTransform={{ width: '100%', margin: { top: fontSize } }}
          uiText={{
            value: `wants to join <b>${data.communityName}</b>`,
            fontSize,
            color: COLOR.TEXT_COLOR_GREY,
            textAlign: 'middle-center',
            textWrap: 'wrap'
          }}
        />

        <Row
          uiTransform={{ margin: { top: fontSize * 2 } }}
          childrenGrow
          childrenGap={fontSize / 2}
        >
          <ButtonComponent
            variant="black"
            value="<b>REJECT</b>"
            fontSize={fontSize}
            loading={acting}
            onMouseDown={() => {
              manage('rejected')
            }}
          />
          <ButtonComponent
            variant="primary"
            value="<b>ACCEPT</b>"
            fontSize={fontSize}
            loading={acting}
            onMouseDown={() => {
              manage('accepted')
            }}
          />
        </Row>
      </Column>
    </PopupBackdrop>
  )
}
