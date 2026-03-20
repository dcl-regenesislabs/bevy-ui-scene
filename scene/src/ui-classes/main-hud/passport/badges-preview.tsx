import { type AchievementsData } from './badges-types'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'
import { PassportSection } from './passport-section'
import { Row } from '../../../components/layout'
import { COLOR } from '../../../components/color-palette'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'

export function BadgesPreview({
  badgesData,
  loading
}: {
  badgesData: AchievementsData | null
  loading?: boolean
}): ReactElement | null {
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const size = fontSize * 4
  const loadingBadges = loading ?? false

  const previewBadges = badgesData?.achieved
    .sort((a, b) => b.completedAt?.localeCompare(a.completedAt ?? '') ?? 0)
    .slice(0, 9)

  if (!loadingBadges && !previewBadges?.length) return null

  return (
    <PassportSection uiTransform={{ opacity: loading ? 0.5 : 1 }}>
      <UiEntity
        uiText={{
          value: '<b>BADGES</b>',
          fontSize
        }}
      />
      <Row
        uiTransform={{
          alignItems: 'flex-start',
          justifyContent: 'flex-start'
        }}
      >
        {loadingBadges ? (
          <LoadingPlaceholder
            uiTransform={{
              width: '98%',
              height: size,
              alignSelf: 'flex-start',
              borderRadius: fontSize / 2,
              borderWidth: 0,
              borderColor: COLOR.BLACK_TRANSPARENT
            }}
            uiText={{
              value: '...',
              fontSize,
              color: COLOR.WHITE_OPACITY_5
            }}
          />
        ) : null}
        {previewBadges?.map((previewBadge) => {
          return (
            <UiEntity
              uiTransform={{
                width: size,
                height: size,
                margin: { right: size / 4 }
              }}
              uiBackground={{
                texture: { src: `${previewBadge.assets['2d']?.normal}` },
                textureMode: 'stretch'
              }}
            />
          )
        })}
      </Row>
    </PassportSection>
  )
}
