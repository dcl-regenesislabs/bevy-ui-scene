import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import { CloseButton } from '../../../components/close-button'
import { store } from '../../../state/store'
import { closeLastPopupAction } from '../../../state/hud/actions'
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
import { CommunityPublicAndMembersSpan } from './community-public-and-members-span'

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
  const isMember =
    community.role === 'member' ||
    community.role === 'moderator' ||
    community.role === 'owner'

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
          borderWidth: 1,
          borderColor: COLOR.YELLOW,
          borderRadius: 0,
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
            position: { left: fontSize / 2 }
          }}
          uiText={{
            value: `${community.description}`,
            fontSize: fontSizeSmall,
            color: COLOR.TEXT_COLOR_WHITE,
            textAlign: 'top-left',
            textWrap: 'wrap'
          }}
        />
        {isMember && (
          <UiEntity
            uiTransform={{
              padding: {
                left: fontSize,
                right: fontSize,
                top: fontSize * 0.3,
                bottom: fontSize * 0.3
              },
              alignSelf: 'flex-start',
              margin: { top: fontSize * 0.5 }
            }}
            uiText={{
              value: '<b>JOINED</b>',
              fontSize: fontSizeSmall,
              color: COLOR.TEXT_COLOR_WHITE
            }}
          />
        )}
      </Column>
    </Row>
  )
}
