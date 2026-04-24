import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'
import { type CommunityListItem } from '../../../service/communities-types'
import { CommunityBrowseCard } from './community-browse-card'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import Icon from '../../../components/icon/Icon'

export function CommunityMyCommunities({
  communities,
  loading,
  onBack
}: {
  communities: CommunityListItem[]
  loading: boolean
  onBack: () => void
}): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const titleFontSize = fontSize * 1.5

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
            value: '<b>My Communities</b>',
            fontSize: titleFontSize,
            color: COLOR.TEXT_COLOR_WHITE,
            textAlign: 'middle-left'
          }}
        />
      </Row>

      {loading ? (
        <Row uiTransform={{ width: '100%', flexWrap: 'wrap' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <UiEntity
              key={i}
              uiTransform={{
                width: fontSize * 16,
                height: fontSize * 22,
                margin: { right: fontSize * 0.6, bottom: fontSize * 0.6 }
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
      ) : communities.length === 0 ? (
        <UiEntity
          uiTransform={{ padding: fontSize }}
          uiText={{
            value: 'No communities yet',
            fontSize,
            color: COLOR.TEXT_COLOR_GREY,
            textAlign: 'top-left'
          }}
        />
      ) : (
        <Row uiTransform={{ width: '100%', flexWrap: 'wrap' }}>
          {communities.map((community) => (
            <CommunityBrowseCard key={community.id} community={community} />
          ))}
        </Row>
      )}
    </Column>
  )
}
