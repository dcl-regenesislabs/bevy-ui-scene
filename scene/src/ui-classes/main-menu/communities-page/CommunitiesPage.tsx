import ReactEcs, { type ReactElement, UiEntity } from '@dcl/react-ecs'
import { MainContent, ResponsiveContent } from '../backpack-page/BackpackPage'
import {
  LeftSection,
  NavBar,
  NavBarTitle
} from '../backpack-page/BackpackNavBar'
import { COLOR } from '../../../components/color-palette'
import { Column, Row } from '../../../components/layout'
import { executeTask } from '@dcl/sdk/ecs'
import {
  fetchCommunities,
  fetchMyCommunities
} from '../../../utils/communities-promise-utils'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import {
  type CommunityListItem,
  getCommunityThumbnailUrl
} from '../../../service/communities-types'
import {
  BROWSE_CARD_HEIGHT,
  BROWSE_CARD_WIDTH,
  CommunityBrowseCard
} from './CommunityBrowseCard'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import {
  getContentHeight,
  getViewportHeight
} from '../../../service/canvas-ratio'
import { getMainMenuHeight } from '../MainMenu'
import useState = ReactEcs.useState
import useEffect = ReactEcs.useEffect

export default class CommunitiesPage {
  mainUi(): ReactElement {
    return <CommunitiesContent />
  }
}

function CommunitiesContent(): ReactElement {
  const fontSize = getFontSize({ context: CONTEXT.SIDE })
  const [myCommunities, setMyCommunities] = useState<CommunityListItem[]>([])
  const [browseCommunities, setBrowseCommunities] = useState<
    CommunityListItem[]
  >([])
  const [browseTotal, setBrowseTotal] = useState<number>(0)
  const [loadingSidebar, setLoadingSidebar] = useState<boolean>(true)
  const [loadingBrowse, setLoadingBrowse] = useState<boolean>(true)

  useEffect(() => {
    executeTask(async () => {
      try {
        const result = await fetchMyCommunities()
        setMyCommunities(result.results)
      } catch (error) {
        console.error('[communities] failed to load my communities', error)
      }
      setLoadingSidebar(false)
    })
    executeTask(async () => {
      try {
        const result = await fetchCommunities({ limit: 10 })
        setBrowseCommunities(result.results)
        setBrowseTotal(result.total)
      } catch (error) {
        console.error('[communities] failed to load browse', error)
      }
      setLoadingBrowse(false)
    })
  }, [])

  const listHeight =
    getViewportHeight() - (getMainMenuHeight() - getContentHeight())

  return (
    <MainContent>
      <NavBar>
        <LeftSection>
          <NavBarTitle text={'<b>Communities</b>'} />
        </LeftSection>
      </NavBar>
      <ResponsiveContent>
        <Column
          uiTransform={{
            width: '22%',
            height: '100%',
            padding: {
              left: fontSize,
              right: fontSize,
              top: 0,
              bottom: fontSize
            }
          }}
          uiBackground={{ color: COLOR.DARK_OPACITY_2 }}
        >
          <UiEntity
            uiTransform={{
              width: '100%',
              margin: { bottom: fontSize },
              flexShrink: 0
            }}
            uiText={{
              value: '<b>My Communities</b>',
              fontSize: getFontSize({
                context: CONTEXT.SIDE,
                token: TYPOGRAPHY_TOKENS.BODY
              }),
              color: COLOR.TEXT_COLOR_WHITE,
              textAlign: 'top-left'
            }}
          />
          {loadingSidebar ? (
            <LoadingPlaceholder
              uiTransform={{
                width: '100%',
                flexGrow: 1,
                borderRadius: fontSize / 2
              }}
              uiText={{ value: 'Loading my communities...' }}
            />
          ) : (
            <Column
              uiTransform={{
                width: '100%',
                flexGrow: 1,
                overflow: 'scroll',
                scrollVisible: 'vertical'
              }}
            >
              {(myCommunities ?? []).map((community) => {
                const thumbSize = fontSize * 3
                return (
                  <Row
                    key={community.id}
                    uiTransform={{
                      width: '100%',
                      alignItems: 'center',
                      margin: { bottom: fontSize * 0.5 },
                      padding: {
                        top: fontSize * 0.3,
                        bottom: fontSize * 0.3
                      }
                    }}
                  >
                    <UiEntity
                      uiTransform={{
                        width: thumbSize,
                        height: thumbSize,
                        borderRadius: fontSize / 2,
                        flexShrink: 0,
                        margin: { right: fontSize * 0.5 }
                      }}
                      uiBackground={{
                        textureMode: 'stretch',
                        texture: {
                          src: getCommunityThumbnailUrl(community.id)
                        }
                      }}
                    />
                    <UiEntity
                      uiTransform={{ flexShrink: 1 }}
                      uiText={{
                        value: community.name,
                        fontSize,
                        color: COLOR.TEXT_COLOR_WHITE,
                        textAlign: 'middle-left'
                      }}
                    />
                  </Row>
                )
              })}
              {(myCommunities ?? []).length === 0 && (
                <UiEntity
                  uiText={{
                    value: 'No communities yet',
                    fontSize,
                    color: COLOR.TEXT_COLOR_GREY
                  }}
                />
              )}
            </Column>
          )}
        </Column>

        {/* Right content - Browse */}
        <Column
          uiTransform={{
            width: '78%',
            height: '100%',
            padding: {
              left: fontSize * 2,
              right: fontSize * 2,
              top: fontSize
            }
          }}
        >
          <UiEntity
            uiTransform={{
              width: '100%',
              flexShrink: 0,
              margin: { bottom: fontSize, left: -fontSize / 2 }
            }}
            uiText={{
              value: `<b>Browse Communities  (${browseTotal ?? 0})</b>`,
              fontSize: getFontSize({
                context: CONTEXT.SIDE,
                token: TYPOGRAPHY_TOKENS.BODY
              }),
              color: COLOR.TEXT_COLOR_WHITE,
              textAlign: 'top-left'
            }}
          />
          <UiEntity
            uiTransform={{
              width: '100%',
              flexGrow: 1,
              flexWrap: 'wrap',
              flexDirection: 'row',
              overflow: 'scroll',
              scrollVisible: 'vertical'
            }}
          >
            {loadingBrowse
              ? Array.from({ length: 10 }).map((_, i) => (
                  <UiEntity
                    key={i}
                    uiTransform={{
                      width: BROWSE_CARD_WIDTH(),
                      height: BROWSE_CARD_HEIGHT(),
                      margin: {
                        right: fontSize,
                        bottom: fontSize
                      }
                    }}
                  >
                    <LoadingPlaceholder
                      uiTransform={{
                        width: '100%',
                        height: '100%',
                        borderRadius: fontSize / 2,
                        margin: {
                          right: fontSize,
                          bottom: fontSize
                        }
                      }}
                    />
                  </UiEntity>
                ))
              : (browseCommunities ?? []).map((community) => (
                  <CommunityBrowseCard
                    key={community.id}
                    community={community}
                  />
                ))}
          </UiEntity>
        </Column>
      </ResponsiveContent>
    </MainContent>
  )
}
