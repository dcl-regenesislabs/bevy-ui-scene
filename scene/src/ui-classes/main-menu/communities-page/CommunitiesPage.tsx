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
import { fetchMyCommunities } from '../../../utils/communities-promise-utils'
import { LoadingPlaceholder } from '../../../components/loading-placeholder'
import {
  type CommunityListItem,
  getCommunityThumbnailUrl
} from '../../../service/communities-types'
import {
  CONTEXT,
  getFontSize,
  TYPOGRAPHY_TOKENS
} from '../../../service/fontsize-system'
import {
  getContentHeight,
  getContentScaleRatio,
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
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    executeTask(async () => {
      try {
        const result = await fetchMyCommunities()
        console.log('[communities] my communities', result)
        setMyCommunities(result.results)
      } catch (error) {
        console.error('[communities] failed to load', error)
      }
      setLoading(false)
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
              fontSize: getFontSize({ context: CONTEXT.SIDE, token: TYPOGRAPHY_TOKENS.BODY }),
              color: COLOR.TEXT_COLOR_WHITE,
              textAlign: 'top-left'
            }}
          />
          {loading ? (
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

        {/* Right content placeholder */}
        <Column
          uiTransform={{
            width: '78%',
            height: '100%',
            padding: {
              left: fontSize * 2,
              top: fontSize * 2
            }
          }}
        >
          <UiEntity
            uiText={{
              value: '<b>Browse Communities</b>',
              fontSize: getFontSize({ context: CONTEXT.SIDE, token: TYPOGRAPHY_TOKENS.TITLE_M }),
              color: COLOR.TEXT_COLOR_WHITE
            }}
          />
        </Column>
      </ResponsiveContent>
    </MainContent>
  )
}
