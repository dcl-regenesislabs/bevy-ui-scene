import ReactEcs, { ReactElement, UiEntity } from '@dcl/react-ecs'
import { PassportSection } from './passport-section'
import useEffect = ReactEcs.useEffect
import useState = ReactEcs.useState
import { executeTask } from '@dcl/sdk/ecs'
import { NavButton } from '../../../components/nav-button/NavButton'
import { Column, Row } from '../../../components/layout'
import { COLOR } from '../../../components/color-palette'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import {
  AchievedAchievementItem,
  AchievementsData,
  NotAchievedAchievementItem
} from './badges-types'
const ALL_CATEGORY = 'All'
export function BadgesCollection({
  badgesData
}: {
  badgesData: AchievementsData | null
}): ReactElement | null {
  const [categories, setCategories] = useState<string[]>([])
  const [categoryFilters, setCategoryFilters] = useState<string[]>([
    ALL_CATEGORY
  ])
  const [loading, setLoading] = useState<boolean>(true)
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY)
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const imageSize = fontSize * 4

  useEffect(() => {
    executeTask(async () => {
      const _categories = await fetch(
        'https://badges.decentraland.org/categories'
      )
        .then((res) => res.json())
        .then((body) => body.data.categories)

      setCategories(_categories)
      setCategoryFilters([ALL_CATEGORY, ..._categories])
      setLoading(false)
    })
  }, [])

  if (loading) return null

  return (
    <PassportSection>
      <Row>
        {categoryFilters.map((category) => {
          return (
            <NavButton
              text={category}
              active={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              fontSize={getFontSize({
                context: CONTEXT.DIALOG
              })}
            />
          )
        })}
      </Row>
      <Column uiTransform={{ width: '100%', margin: { top: '2%' } }}>
        {categories.map((category) => {
          if (category !== activeCategory && activeCategory !== ALL_CATEGORY)
            return null
          return (
            <Column uiTransform={{ width: '100%' }}>
              <UiEntity
                uiTransform={{ width: '100%' }}
                uiText={{
                  value: category.toUpperCase(),
                  textAlign: 'top-left',
                  fontSize: getFontSize({
                    context: CONTEXT.DIALOG,
                    token: TYPOGRAPHY_TOKENS.TITLE_M
                  })
                }}
              />
              <UiEntity
                uiTransform={{
                  height: Math.floor(fontSize * 0.1),
                  width: '100%',
                  margin: 0
                }}
                uiBackground={{ color: COLOR.WHITE_OPACITY_2 }}
              />

              <Row
                uiTransform={{
                  width: '100%',
                  margin: { top: '2%' },
                  flexWrap: 'wrap'
                }}
              >
                {[
                  ...(badgesData?.achieved ?? []),
                  ...(badgesData?.notAchieved ?? [])
                ]
                  .filter((i) => i)
                  .filter((b) => b.category === category)
                  .map((badgeItem, index) => {
                    return badgeItem ? (
                      <BadgesCollectionItem
                        badgeItem={badgeItem}
                        key={badgeItem?.id ?? index}
                      />
                    ) : null
                  })}
              </Row>
            </Column>
          )
        })}
      </Column>
    </PassportSection>
  )
}

export function BadgesCollectionItem({
  badgeItem,
  key
}: {
  badgeItem: AchievedAchievementItem | NotAchievedAchievementItem
  key?: string | number
}) {
  const fontSize = getFontSize({
    context: CONTEXT.DIALOG,
    token: TYPOGRAPHY_TOKENS.BODY_S
  })
  const imageSize = fontSize * 4
  return (
    <Column
      uiTransform={{
        width: fontSize * 8,
        height: fontSize * 8 * 1.38,
        borderRadius: fontSize / 2,
        margin: { right: fontSize, bottom: fontSize },
        alignItems: 'center',
        justifyContent: 'flex-end'
      }}
      uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
    >
      <UiEntity
        uiTransform={{
          margin: { top: '15%' },
          width: imageSize,
          height: imageSize,
          opacity: badgeItem.completedAt ? 1 : 0.2
        }}
        uiBackground={{
          texture: { src: `${badgeItem.assets['2d']?.normal}` },
          textureMode: 'stretch'
        }}
      />
      <UiEntity
        uiTransform={{ height: fontSize * 2 }}
        uiText={{
          value: `<b>${badgeItem.name}</b>`,
          color: COLOR.TEXT_COLOR_LIGHT_GREY,
          fontSize
        }}
      />
      {isBadgeInProgress(badgeItem) ? (
        <BadgeProgressBar
          fontSize={getFontSize({
            context: CONTEXT.DIALOG,
            token: TYPOGRAPHY_TOKENS.CAPTION
          })}
          badgeItem={badgeItem}
        />
      ) : (
        <UiEntity
          uiTransform={{
            width: '100%',
            justifyContent: 'flex-end',
            alignSelf: 'center',
            alignItems: 'center',
            flexGrow: 1
          }}
        >
          <UiEntity
            uiTransform={{
              width: '100%'
            }}
            uiText={{
              fontSize: fontSize,
              value: badgeItem.completedAt
                ? formatCompletedAt(badgeItem.completedAt)
                : '-',
              color: COLOR.TEXT_COLOR_GREY,
              textAlign: 'middle-center'
            }}
          />
        </UiEntity>
      )}
    </Column>
  )
}
function isBadgeInProgress(
  badgeItem: AchievedAchievementItem | NotAchievedAchievementItem
): boolean {
  const { stepsDone, nextStepsTarget } = badgeItem.progress
  return nextStepsTarget !== null && stepsDone < nextStepsTarget
}

function BadgeProgressBar({
  badgeItem,
  fontSize
}: {
  badgeItem: AchievedAchievementItem | NotAchievedAchievementItem
  fontSize: number
}): ReactElement {
  const { stepsDone, nextStepsTarget } = badgeItem.progress
  const ratio = nextStepsTarget ? stepsDone / nextStepsTarget : 0
  const percentage = Math.min(Math.max(ratio, 0), 1)

  return (
    <Column
      uiTransform={{
        width: '80%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexGrow: 1,
        margin: { bottom: '10%' }
      }}
    >
      <UiEntity
        uiText={{
          value: `${stepsDone}/${nextStepsTarget}`,
          fontSize: fontSize,
          color: COLOR.TEXT_COLOR_LIGHT_GREY
        }}
      />
      <UiEntity
        uiTransform={{
          width: '100%',
          height: fontSize * 0.5,
          borderRadius: fontSize * 0.25
        }}
        uiBackground={{ color: COLOR.DARK_OPACITY_5 }}
      >
        <UiEntity
          uiTransform={{
            width: `${percentage * 100}%`,
            height: '100%',
            borderRadius: fontSize * 0.25
          }}
          uiBackground={{ color: COLOR.ORANGE }}
        />
      </UiEntity>
    </Column>
  )
}
function formatCompletedAt(completedAt: string): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ]
  const date = new Date(Number(completedAt))
  return `${months[date.getMonth()]}. ${date.getFullYear()}`
}
