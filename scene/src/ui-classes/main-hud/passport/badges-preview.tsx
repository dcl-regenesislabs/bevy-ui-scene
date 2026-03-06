import { type AchievementsData } from './badges-types'
import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { CONTEXT, getFontSize } from '../../../service/fontsize-system'
import { getLoadingAlphaValue } from '../../../service/loading-alpha-color'
import { PassportSection } from './passport-section'
import { Row } from '../../../components/layout'
import { COLOR } from '../../../components/color-palette'
import { Color4 } from '@dcl/sdk/math'

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
  const loadingAlpha = loadingBadges ? getLoadingAlphaValue() : 0

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
          alignItems: 'space-around',
          justifyContent: 'space-around'
        }}
      >
        {loadingBadges ? (
          <UiEntity
            uiTransform={{
              width: '98%',
              height: size,
              alignSelf: 'flex-start',
              borderRadius: fontSize / 2,
              borderWidth: 0,
              borderColor: COLOR.BLACK_TRANSPARENT
            }}
            uiBackground={{
              color: Color4.create(1, 1, 1, loadingAlpha * 0.3)
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
                height: size
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
