import ReactEcs, { ReactElement, UiEntity } from '@dcl/react-ecs'
import { PassportSection } from './passport-section'
import useEffect = ReactEcs.useEffect
import useState = ReactEcs.useState
import { executeTask } from '@dcl/sdk/ecs'
import { NavButton } from '../../../components/nav-button/NavButton'
import { Column, Row } from '../../../components/layout'
import { BottomBorder, TopBorder } from '../../../components/bottom-border'
import { COLOR } from '../../../components/color-palette'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import {
  AchievedAchievementItem,
  AchievementItemBase,
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

              <Row uiTransform={{ width: '100%', margin: { top: '2%' } }}>
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
  const fontSize = getFontSize({ context: CONTEXT.DIALOG })
  const imageSize = fontSize * 4
  return (
    <UiEntity>
      <UiEntity
        uiTransform={{
          width: imageSize,
          height: imageSize,
          opacity: badgeItem.completedAt ? 1 : 0.2
        }}
        uiBackground={{
          texture: { src: `${badgeItem.assets['2d']?.normal}` },
          textureMode: 'stretch'
        }}
      />
    </UiEntity>
  )
}
