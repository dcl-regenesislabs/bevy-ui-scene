import ReactEcs, { Button, type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import {
  type CommunityListItem,
  getCommunityThumbnailUrl
} from '../../../service/communities-types'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import { getContentScaleRatio } from '../../../service/canvas-ratio'
import { truncateWithoutBreakingWords } from '../../../utils/ui-utils'
import { ButtonText } from '../../../components/button-text'
import { store } from '../../../state/store'
import { pushPopupAction } from '../../../state/hud/actions'
import { HUD_POPUP_TYPE } from '../../../state/hud/state'

export const BROWSE_CARD_WIDTH = (): number => getContentScaleRatio() * 400
export const BROWSE_CARD_HEIGHT = (): number => getContentScaleRatio() * 600

const COMMUNITY_CARD_BUTTON_LABEL = {
  VIEW: 'VIEW',
  REQUEST_TO_JOIN: 'REQUEST TO JOIN',
  JOIN: 'JOIN'
}
function getActionLabel(community: CommunityListItem): string {
  if (
    community.role === 'member' ||
    community.role === 'moderator' ||
    community.role === 'owner'
  ) {
    return COMMUNITY_CARD_BUTTON_LABEL.VIEW
  }
  if (community.privacy === 'private') {
    return COMMUNITY_CARD_BUTTON_LABEL.REQUEST_TO_JOIN
  }
  return COMMUNITY_CARD_BUTTON_LABEL.JOIN
}

function formatMemberCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return String(count)
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
  const buttonLabel = getActionLabel(community)
  const privacyLabel = community.privacy === 'public' ? 'Public' : 'Private'

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
          value: `<b>${truncateWithoutBreakingWords(
            community.name + ' ' + community.name,
            31
          )}</b>`,
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
      <UiEntity
        uiTransform={{
          width: '100%',
          flexShrink: 0,
          margin: { top: -fontSizeSmall / 2 }
        }}
        uiText={{
          value: `${privacyLabel} | ${formatMemberCount(
            community.membersCount
          )} Members`,
          fontSize: fontSizeCaption,
          color: COLOR.TEXT_COLOR_LIGHT_GREY,
          textAlign: 'top-left'
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
          margin: { top: fontSizeSmall / 2 }
        }}
        uiBackground={{
          color:
            buttonLabel === COMMUNITY_CARD_BUTTON_LABEL.JOIN
              ? COLOR.WHITE_OPACITY_1
              : COLOR.BLACK_TRANSPARENT
        }}
        onMouseDown={() => {}}
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
      />*/}
    </Column>
  )
}
