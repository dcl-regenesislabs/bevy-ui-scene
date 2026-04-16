import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { type Popup } from '../../../components/popup-stack'
import { PopupBackdrop } from '../../../components/popup-backdrop'
import { ResponsiveContent } from '../backpack-page/BackpackPage'
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
import { noop } from '../../../utils/function-utils'
import { CommunityAnnouncements } from './community-announcements'
import { CommunityPublicAndMembersSpan } from './community-public-and-members-span'

export const CommunityViewPopup: Popup = ({ shownPopup }) => {
  const community = shownPopup.data as CommunityListItem
  if (community == null) return null
  return <CommunityViewContent community={community} />
}

function CommunityViewContent({
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
  const fontSizeCaption = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.CAPTION
  })
  const scale = getContentScaleRatio()
  const borderRadius = scale * 30
  const thumbnailSize = scale * 300
  const isMember =
    community.role === 'member' ||
    community.role === 'moderator' ||
    community.role === 'owner'

  return (
    <PopupBackdrop>
      <ResponsiveContent>
        <UiEntity
          uiTransform={{
            width: '80%',
            height: '100%',
            pointerFilter: 'block',
            flexDirection: 'column',
            borderRadius,
            borderWidth: 0,
            borderColor: COLOR.BLACK_TRANSPARENT
          }}
          onMouseDown={noop}
          uiBackground={{
            texture: { src: 'assets/images/menu/background.png' },
            textureMode: 'stretch'
          }}
        >
          {/* Header */}
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
                justifyContent: 'center',
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
                  borderWidth: 1,
                  borderColor: COLOR.RED,
                  borderRadius: 0,
                  padding: -fontSize,
                  margin: { top: -fontSize * 2 }
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
                privacy={community.privacy}
                membersCount={community.membersCount}
                fontSize={fontSizeSmall}
              />

              {isMember && (
                <UiEntity
                  uiTransform={{
                    borderRadius: fontSize / 2,
                    borderWidth: 1,
                    borderColor: COLOR.WHITE,
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
            <CloseButton
              uiTransform={{ position: { top: 0, right: 0 } }}
              onClick={() => {
                store.dispatch(closeLastPopupAction())
              }}
            />
          </Row>

          {/* Description */}
          <Column
            uiTransform={{
              width: '100%',
              padding: { left: fontSize * 2, right: fontSize * 2 },
              flexShrink: 0
            }}
          >
            <UiEntity
              uiTransform={{ width: '70%' }}
              uiText={{
                value: community.description ?? '',
                fontSize: fontSizeCaption,
                color: COLOR.TEXT_COLOR_LIGHT_GREY,
                textAlign: 'top-left',
                textWrap: 'wrap'
              }}
            />
          </Column>

          {/* Tabs */}
          <Row
            uiTransform={{
              width: '100%',
              padding: {
                left: fontSize * 2,
                right: fontSize * 2,
                top: fontSize
              },
              flexShrink: 0
            }}
          >
            {['ANNOUNCEMENTS', 'MEMBERS', 'PLACES', 'PHOTOS'].map((tab, i) => (
              <UiEntity
                key={tab}
                uiTransform={{
                  margin: { right: fontSize * 2 },
                  borderWidth: i === 0 ? 2 : 0,
                  borderColor: COLOR.WHITE,
                  padding: { bottom: fontSize * 0.3 }
                }}
                uiText={{
                  value: `<b>${tab}</b>`,
                  fontSize: fontSizeSmall,
                  color:
                    i === 0 ? COLOR.TEXT_COLOR_WHITE : COLOR.TEXT_COLOR_GREY
                }}
              />
            ))}
          </Row>

          {/* Content */}
          <Column
            uiTransform={{
              width: '70%',
              flexGrow: 1,
              padding: {
                left: fontSize * 2,
                right: fontSize * 2,
                top: fontSize
              },
              overflow: 'scroll',
              scrollVisible: 'vertical'
            }}
          >
            <CommunityAnnouncements communityId={community.id} />
          </Column>
        </UiEntity>
      </ResponsiveContent>
    </PopupBackdrop>
  )
}
